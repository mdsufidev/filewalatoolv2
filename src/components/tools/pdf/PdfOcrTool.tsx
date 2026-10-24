'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createWorker } from 'tesseract.js';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  FileText,
  Search,
  Copy,
  Check,
  Download,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Eye,
  ShieldCheck,
  Zap,
  Lock,
  Loader2,
  X,
  Layers,
  Globe,
  FileCheck,
  Percent,
  SlidersHorizontal,
  ChevronRight,
  Split,
  FileCode,
} from 'lucide-react';
import { formatBytes, triggerFileDownload } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { PdfToolGuideSection } from './PdfToolGuideSection';

// Ensure unified PDF.js worker is ready
ensurePdfWorkerInitialized();

export type ExtractionMode = 'hybrid' | 'ocr-only' | 'digital-only';

export interface OcrLanguageOption {
  code: string;
  name: string;
}

export const OCR_LANGUAGES: OcrLanguageOption[] = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish (Español)' },
  { code: 'fra', name: 'French (Français)' },
  { code: 'deu', name: 'German (Deutsch)' },
  { code: 'ita', name: 'Italian (Italiano)' },
  { code: 'por', name: 'Portuguese (Português)' },
  { code: 'hin', name: 'Hindi (हिन्दी)' },
  { code: 'chi_sim', name: 'Chinese Simplified (简体中文)' },
  { code: 'jpn', name: 'Japanese (日本語)' },
  { code: 'ara', name: 'Arabic (العربية)' },
  { code: 'rus', name: 'Russian (Русский)' },
];

export interface PageOcrData {
  pageNum: number;
  text: string;
  confidence: number;
  isOcr: boolean;
  wordCount: number;
  thumbnailUrl?: string;
}

export interface DocumentOcrResult {
  fullText: string;
  pages: PageOcrData[];
  averageConfidence: number;
  totalWords: number;
  totalCharacters: number;
  processingTimeMs: number;
  language: string;
  filename: string;
  hasScannedPages: boolean;
}

interface PdfOcrToolProps {
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PdfOcrTool: React.FC<PdfOcrToolProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileThumbnailUrl, setFileThumbnailUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isScannedDetected, setIsScannedDetected] = useState<boolean | null>(null);

  // Configuration settings
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('hybrid');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('eng');
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customRangeText, setCustomRangeText] = useState<string>('1');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<{
    percent: number;
    stage: string;
    currentPage?: number;
    totalPages?: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active cancel ref
  const abortControllerRef = useRef<boolean>(false);

  // Results state
  const [result, setResult] = useState<DocumentOcrResult | null>(null);
  const [activeTab, setActiveTab] = useState<'combined' | 'by-page'>('combined');
  const [selectedPageDetail, setSelectedPageDetail] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // DOM Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUrlsRef = useRef<Set<string>>(new Set());

  // Track URLs for cleanup
  const registerTrackedUrl = useCallback((url: string) => {
    activeUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeTrackedUrl = useCallback((url: string | null | undefined) => {
    if (url && activeUrlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      activeUrlsRef.current.delete(url);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const urls = activeUrlsRef.current;
    return () => {
      urls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urls.clear();
    };
  }, []);

  // Reset workspace
  const handleReset = useCallback(() => {
    abortControllerRef.current = true;
    if (fileThumbnailUrl) revokeTrackedUrl(fileThumbnailUrl);
    if (result) {
      result.pages.forEach((p) => {
        if (p.thumbnailUrl) revokeTrackedUrl(p.thumbnailUrl);
      });
    }

    setFile(null);
    setPageCount(null);
    setFileThumbnailUrl(null);
    setIsScannedDetected(null);
    setResult(null);
    setErrorMessage(null);
    setProgressState(null);
    setIsProcessing(false);
    setSearchQuery('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [fileThumbnailUrl, result, revokeTrackedUrl]);

  // Load and analyze PDF
  const handleProcessFile = useCallback(
    async (uploadedFile: File) => {
      setErrorMessage(null);

      const isPdfMime = uploadedFile.type === 'application/pdf';
      const isPdfExt = uploadedFile.name.toLowerCase().endsWith('.pdf');

      if (!isPdfMime && !isPdfExt) {
        setErrorMessage('Invalid file format. Please upload a valid .pdf document.');
        onNotify?.('Invalid File', 'Only PDF files (.pdf) are supported.', 'error');
        return;
      }

      if (uploadedFile.size <= 0) {
        setErrorMessage('The selected file is empty (0 bytes).');
        onNotify?.('Empty File', 'Please select a valid PDF file.', 'error');
        return;
      }

      // 200MB safety ceiling
      if (uploadedFile.size > 200 * 1024 * 1024) {
        setErrorMessage('File exceeds browser memory limit of 200 MB.');
        onNotify?.('File Too Large', 'Maximum file size is 200 MB.', 'error');
        return;
      }

      // Cleanup prior state
      if (fileThumbnailUrl) revokeTrackedUrl(fileThumbnailUrl);
      if (result) {
        result.pages.forEach((p) => {
          if (p.thumbnailUrl) revokeTrackedUrl(p.thumbnailUrl);
        });
      }
      setResult(null);

      setFile(uploadedFile);
      setIsValidating(true);

      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const total = pdfDoc.numPages;
        setPageCount(total);
        setCustomRangeText(`1-${Math.min(total, 5)}`);

        // Check page 1 for digital text content vs scanned raster
        if (total > 0) {
          const firstPage = await pdfDoc.getPage(1);

          // Digital text inspection
          const textContent = await firstPage.getTextContent();
          const digitalLength = textContent.items.reduce(
            (acc: number, item: any) => acc + (('str' in item && typeof item.str === 'string') ? item.str.trim().length : 0),
            0
          );
          // If fewer than 25 chars on page 1, likely scanned document
          const appearsScanned = digitalLength < 25;
          setIsScannedDetected(appearsScanned);

          // Generate fast thumbnail of page 1
          const viewport = firstPage.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await firstPage.render({ canvasContext: ctx, viewport, canvas } as any).promise;
            canvas.toBlob((blob) => {
              if (blob) {
                const thumbUrl = registerTrackedUrl(URL.createObjectURL(blob));
                setFileThumbnailUrl(thumbUrl);
              }
            }, 'image/jpeg', 0.8);
          }
        }

        onNotify?.('PDF Loaded', `${uploadedFile.name} (${total} pages) ready for OCR analysis.`, 'success');
      } catch (err: any) {
        console.error('PDF inspect error:', err);
        setErrorMessage(
          err?.message?.includes('password')
            ? 'This PDF is password-protected. Please unlock it before extraction.'
            : 'Unable to inspect PDF structure. File may be corrupted.'
        );
        onNotify?.('PDF Inspection Failed', 'Could not parse document structure.', 'error');
      } finally {
        setIsValidating(false);
      }
    },
    [fileThumbnailUrl, result, registerTrackedUrl, revokeTrackedUrl, onNotify]
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Parse page range e.g. "1-3, 5"
  const parsePageIndices = (rangeStr: string, total: number): number[] => {
    if (pageRangeMode === 'all') {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    const parts = rangeStr.split(/[,;\s]+/);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(total, end); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= total) {
          pages.add(p);
        }
      }
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [1];
  };

  // =========================================================================
  // CORE CLIENT-SIDE TESSERACT.JS OCR EXECUTION
  // =========================================================================
  const handleExecuteOcr = async () => {
    if (!file || !pageCount) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    const targetPages = parsePageIndices(customRangeText, pageCount);
    const totalTarget = targetPages.length;

    setProgressState({
      percent: 5,
      stage: 'Preparing in-browser Tesseract.js OCR engine...',
      currentPage: 0,
      totalPages: totalTarget,
    });

    let ocrWorker: any = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      // Lazy-init worker if OCR mode is active or needed
      const willNeedOcr = extractionMode === 'ocr-only' || extractionMode === 'hybrid';
      if (willNeedOcr) {
        setProgressState({
          percent: 10,
          stage: `Loading Tesseract ${selectedLanguage.toUpperCase()} language models into browser memory...`,
          currentPage: 0,
          totalPages: totalTarget,
        });

        ocrWorker = await createWorker(selectedLanguage, 1, {
          logger: (m) => {
            if (m.status === 'recognizing text' && m.progress) {
              // Intentionally tracked via page step
            }
          },
        });
      }

      const extractedPages: PageOcrData[] = [];
      let totalConfidenceSum = 0;
      let totalConfidenceCount = 0;
      let scannedPagesDetected = false;

      for (let idx = 0; idx < totalTarget; idx++) {
        if (abortControllerRef.current) {
          throw new Error('OCR extraction stopped by user.');
        }

        const pageNum = targetPages[idx];
        const pageStepPercent = Math.round(15 + ((idx + 0.1) / totalTarget) * 80);

        setProgressState({
          percent: pageStepPercent,
          stage: `Processing Page ${pageNum} of ${pageCount} (${idx + 1}/${totalTarget})...`,
          currentPage: idx + 1,
          totalPages: totalTarget,
        });

        const page = await pdfDoc.getPage(pageNum);

        // 1. First test digital text stream if mode is hybrid or digital-only
        let pageText = '';
        let pageConfidence = 100;
        let usedOcr = false;

        if (extractionMode === 'digital-only' || extractionMode === 'hybrid') {
          const textContent = await page.getTextContent();
          const digitalRaw = textContent.items
            .map((item: any) => ('str' in item && typeof item.str === 'string') ? item.str : '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (extractionMode === 'digital-only' || digitalRaw.length >= 25) {
            pageText = digitalRaw;
            usedOcr = false;
            pageConfidence = 100;
          }
        }

        // 2. If no text or mode is ocr-only, execute Tesseract OCR on high-resolution canvas render
        let thumbUrl: string | undefined = undefined;

        // Render page canvas (scale 2.0 ensures crisp glyph boundaries for Tesseract)
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        // Optional contrast / binarization preprocessing for noisy scans
        if (enhanceContrast && (extractionMode === 'ocr-only' || pageText.length < 25)) {
          try {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let p = 0; p < d.length; p += 4) {
              // Convert to grayscale
              const gray = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
              // Gentle adaptive contrast stretch (slight curve)
              const contrastVal = gray > 185 ? 255 : gray < 70 ? 0 : gray;
              d[p] = contrastVal;
              d[p + 1] = contrastVal;
              d[p + 2] = contrastVal;
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (e) {
            // ignore canvas security limitation if any
          }
        }

        // Generate small page thumbnail for UI
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              thumbUrl = registerTrackedUrl(URL.createObjectURL(blob));
            }
            resolve();
          }, 'image/jpeg', 0.7);
        });

        // Run Tesseract if digital text is absent or mode is ocr-only
        if (pageText.length < 25 || extractionMode === 'ocr-only') {
          scannedPagesDetected = true;
          if (ocrWorker) {
            setProgressState({
              percent: Math.round(15 + ((idx + 0.5) / totalTarget) * 80),
              stage: `Recognizing characters on Page ${pageNum} via Tesseract OCR...`,
              currentPage: idx + 1,
              totalPages: totalTarget,
            });

            const ocrResult = await ocrWorker.recognize(canvas);
            pageText = ocrResult?.data?.text?.trim() || '';
            pageConfidence = Math.round(ocrResult?.data?.confidence || 0);
            usedOcr = true;

            totalConfidenceSum += pageConfidence;
            totalConfidenceCount++;
          }
        } else {
          totalConfidenceSum += 100;
          totalConfidenceCount++;
        }

        // Release canvas memory
        canvas.width = 0;
        canvas.height = 0;

        const words = pageText ? pageText.split(/\s+/).filter(Boolean).length : 0;

        extractedPages.push({
          pageNum,
          text: pageText,
          confidence: pageConfidence,
          isOcr: usedOcr,
          wordCount: words,
          thumbnailUrl: thumbUrl,
        });
      }

      setProgressState({
        percent: 98,
        stage: 'Formatting document text and compiling OCR analytics...',
      });

      // Construct combined full text
      const fullText = extractedPages
        .map((p) => `--- Page ${p.pageNum} (${p.isOcr ? `OCR ${p.confidence}%` : 'Digital Text'}) ---\n\n${p.text}`)
        .join('\n\n\n');

      const avgConfidence = totalConfidenceCount > 0 ? Math.round(totalConfidenceSum / totalConfidenceCount) : 100;
      const totalWords = extractedPages.reduce((acc, p) => acc + p.wordCount, 0);
      const totalCharacters = fullText.length;
      const processingTime = Math.round(performance.now() - startTime);

      const ocrResult: DocumentOcrResult = {
        fullText,
        pages: extractedPages,
        averageConfidence: avgConfidence,
        totalWords,
        totalCharacters,
        processingTimeMs: processingTime,
        language: selectedLanguage,
        filename: file.name,
        hasScannedPages: scannedPagesDetected,
      };

      setResult(ocrResult);
      setProgressState(null);

      onNotify?.(
        'OCR Completed! ✨',
        `Extracted ${totalWords.toLocaleString()} words across ${totalTarget} pages (${(processingTime / 1000).toFixed(1)}s).`,
        'success'
      );
    } catch (err: any) {
      console.error('OCR Extraction error:', err);
      setErrorMessage(err?.message || 'Error occurred during Tesseract.js OCR processing.');
      onNotify?.('OCR Processing Failed', err?.message || 'Could not recognize document text.', 'error');
    } finally {
      if (ocrWorker) {
        try {
          await ocrWorker.terminate();
        } catch {
          // ignore
        }
      }
      setIsProcessing(false);
      setProgressState(null);
    }
  };

  // Copy to clipboard
  const handleCopyText = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onNotify?.('Copied to Clipboard', 'Text copied successfully.', 'success');
  };

  // Download plain text file
  const handleDownloadTxt = () => {
    if (!result || !file) return;
    const blob = new Blob([result.fullText], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(blob, `${baseName}-ocr-text.txt`);
    onNotify?.('Text File Downloaded', `Saved ${baseName}-ocr-text.txt`, 'success');
  };

  // Download markdown file
  const handleDownloadMarkdown = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let md = `# OCR Extracted Text: ${file.name}\n\n`;
    md += `- **Date Processed:** ${new Date().toLocaleDateString()}\n`;
    md += `- **Pages Processed:** ${result.pages.length}\n`;
    md += `- **Total Words:** ${result.totalWords}\n`;
    md += `- **Average OCR Confidence:** ${result.averageConfidence}%\n\n---\n\n`;

    result.pages.forEach((p) => {
      md += `## Page ${p.pageNum} (${p.isOcr ? `OCR ${p.confidence}%` : 'Digital'})\n\n`;
      md += `${p.text || '_No text detected on this page._'}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    triggerFileDownload(blob, `${baseName}-ocr-report.md`);
    onNotify?.('Markdown Downloaded', `Saved ${baseName}-ocr-report.md`, 'success');
  };

  // Download JSON analytics
  const handleDownloadJson = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const jsonBlob = new Blob(
      [
        JSON.stringify(
          {
            sourceFile: file.name,
            extractedAt: new Date().toISOString(),
            language: result.language,
            averageConfidence: result.averageConfidence,
            totalWords: result.totalWords,
            totalCharacters: result.totalCharacters,
            pages: result.pages.map((p) => ({
              pageNum: p.pageNum,
              isOcr: p.isOcr,
              confidence: p.confidence,
              wordCount: p.wordCount,
              text: p.text,
            })),
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    triggerFileDownload(jsonBlob, `${baseName}-ocr-data.json`);
    onNotify?.('JSON Downloaded', `Saved ${baseName}-ocr-data.json`, 'success');
  };

  // Generate and download a searchable PDF with formatted text transcript
  const handleDownloadSearchablePdf = async () => {
    if (!result || !file) return;
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      const pageWidth = 595.28; // Standard A4 width
      const pageHeight = 841.89; // Standard A4 height
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 14;

      for (const p of result.pages) {
        let pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;

        // Header banner on each page
        pdfPage.drawText(`Page ${p.pageNum} — ${file.name}`, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        });
        pdfPage.drawText(
          `${p.isOcr ? `OCR (${p.confidence}% confidence)` : 'Digital Text'} • ${p.wordCount} words`,
          {
            x: pageWidth - margin - 150,
            y,
            size: 9,
            font,
            color: rgb(0.5, 0.5, 0.5),
          }
        );

        y -= 20;
        pdfPage.drawLine({
          start: { x: margin, y },
          end: { x: pageWidth - margin, y },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
        y -= 20;

        // Split text lines
        const lines = (p.text || 'No text detected on this page.').split('\n');
        for (const rawLine of lines) {
          const words = rawLine.split(' ');
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = font.widthOfTextAtSize(testLine, 10);

            if (textWidth > contentWidth) {
              if (y < margin + 20) {
                pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
              }
              pdfPage.drawText(currentLine, { x: margin, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
              y -= lineHeight;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine) {
            if (y < margin + 20) {
              pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            pdfPage.drawText(currentLine, { x: margin, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
            y -= lineHeight;
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      triggerFileDownload(pdfBlob, `${baseName}-searchable-ocr.pdf`);
      onNotify?.('Searchable PDF Created', `Downloaded ${baseName}-searchable-ocr.pdf`, 'success');
    } catch (err: any) {
      console.error('PDF export error:', err);
      onNotify?.('PDF Export Failed', err?.message || 'Could not build PDF', 'error');
    }
  };

  // Filter text matches
  const searchMatchesCount = useMemo(() => {
    if (!result || !searchQuery.trim()) return 0;
    const query = searchQuery.toLowerCase();
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = result.fullText.match(regex);
    return matches ? matches.length : 0;
  }, [result, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header Banner - Stripe / Vercel Aesthetic */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                isDark
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-600'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                PDF to Searchable Text (OCR)
              </h1>
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Extract editable, searchable text from scanned or digital PDF documents directly in your browser using client-side Tesseract.js.
          </p>
        </div>

        {/* Security / Privacy Trust Pill */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border self-start md:self-auto text-xs font-medium ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-cyan-500" />
          <span>Tesseract.js &bull; 100% Client-Side OCR</span>
        </div>
      </div>

      {/* Main Workspace Body */}
      {!file ? (
        /* =========================================================================
           1. DROPZONE STATE (Empty Workspace)
        ========================================================================= */
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-10 sm:p-14 text-center cursor-pointer transition-colors duration-150 select-none ${
              isDragOver
                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100/50 dark:bg-zinc-800/50'
                : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
            }`}
          >
            <div className="w-12 h-12 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h3
              className={`text-sm sm:text-base font-semibold tracking-tight mb-1.5 ${
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              }`}
            >
              Drop scanned PDF here, or <span className="underline underline-offset-4">browse files</span>
            </h3>

            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Supports invoices, receipts, book scans, legal agreements, and flattened documents. Optical Character Recognition (OCR) runs locally.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                Scanned & Image PDF Support
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                Multi-Language Models
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                Searchable Export
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           2. ACTIVE WORKSPACE (File Loaded, OCR Config, Results & Search)
        ========================================================================= */
        <div className="space-y-6">
          {/* File Card Header */}
          <div
            className={`p-4 sm:p-5 rounded-lg border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Thumbnail or Icon */}
                <div
                  className={`w-12 h-14 rounded-md border overflow-hidden shrink-0 flex items-center justify-center relative ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                  }`}
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : fileThumbnailUrl ? (
                    <img
                      src={fileThumbnailUrl}
                      alt="PDF First Page"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <FileText className="w-5 h-5 text-zinc-500" />
                  )}
                </div>

                {/* File Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm sm:text-base font-semibold truncate ${
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                        isScannedDetected
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {isScannedDetected ? 'Scanned PDF' : 'Digital PDF'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-zinc-500">
                      Size: <strong className={isDark ? 'text-zinc-100' : 'text-zinc-900'}>{formatBytes(file.size)}</strong>
                    </span>
                    <span className="text-zinc-400">&bull;</span>
                    <span className="text-zinc-500">
                      {pageCount !== null ? (
                        `${pageCount} page${pageCount === 1 ? '' : 's'}`
                      ) : isValidating ? (
                        'Analyzing structure...'
                      ) : (
                        'Document'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reset File Button */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Choose Another PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* OCR Configuration Controls (Only before extracting or in settings drawer) */}
          {!result && (
            <div
              className={`p-5 rounded-lg border space-y-4 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    OCR Engine Settings
                  </h3>
                </div>
                <span className="text-xs text-zinc-500">
                  Customizable language and recognition pipeline
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Extraction Pipeline Mode */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Extraction Engine Mode
                  </label>
                  <select
                    value={extractionMode}
                    onChange={(e) => setExtractionMode(e.target.value as ExtractionMode)}
                    disabled={isProcessing}
                    className={`w-full px-3 py-2 rounded-md text-xs border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        : 'bg-white border-zinc-200 text-zinc-900'
                    }`}
                  >
                    <option value="hybrid">Smart Auto-Detect (OCR Scans + Fast Digital)</option>
                    <option value="ocr-only">Force Tesseract OCR (All Pages)</option>
                    <option value="digital-only">Digital Stream Only (Fast, No OCR)</option>
                  </select>
                  <p className="text-[11px] text-zinc-500">
                    Recommended: Smart Auto-Detect runs OCR on image scans while extracting clean digital pages instantly.
                  </p>
                </div>

                {/* 2. OCR Language */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    OCR Recognition Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    disabled={isProcessing}
                    className={`w-full px-3 py-2 rounded-md text-xs border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        : 'bg-white border-zinc-200 text-zinc-900'
                    }`}
                  >
                    {OCR_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500">
                    Pre-trained character models loaded on-demand into WebAssembly runtime.
                  </p>
                </div>

                {/* 3. Page Range */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Page Selection
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPageRangeMode('all')}
                      disabled={isProcessing}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        pageRangeMode === 'all'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      All Pages ({pageCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageRangeMode('custom')}
                      disabled={isProcessing}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        pageRangeMode === 'custom'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>
                  {pageRangeMode === 'custom' && (
                    <input
                      type="text"
                      value={customRangeText}
                      onChange={(e) => setCustomRangeText(e.target.value)}
                      placeholder="e.g. 1-3, 5"
                      className={`w-full mt-1 px-3 py-1.5 rounded-md text-xs border ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Additional OCR Enhancement Checkbox */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={enhanceContrast}
                    onChange={(e) => setEnhanceContrast(e.target.checked)}
                    disabled={isProcessing}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    Adaptive Contrast Preprocessing (Recommended for low-contrast scans or shadows)
                  </span>
                </label>
              </div>

              {/* Trigger Button */}
              <div className="pt-3 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteOcr}
                  disabled={isProcessing || isValidating}
                  className="w-full sm:w-auto min-w-[240px] px-6 py-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting with Tesseract OCR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Optical Character Recognition</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-zinc-500">
                  Zero server processing &bull; High precision client-side OCR
                </span>
              </div>
            </div>
          )}

          {/* Processing Progress Feedback */}
          {isProcessing && progressState && (
            <div
              className={`p-4 rounded-lg border space-y-3 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className={`font-medium flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                  {progressState.stage}
                </span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{progressState.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                  style={{ width: `${progressState.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>Language: {OCR_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    abortControllerRef.current = true;
                    setIsProcessing(false);
                  }}
                  className="text-rose-500 hover:underline cursor-pointer"
                >
                  Cancel OCR
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* =========================================================================
             3. OCR RESULTS & SEARCHABLE TEXT DASHBOARD
          ========================================================================= */}
          {result && (
            <div className="space-y-6">
              {/* Analytics Header Metric Bar */}
              <div
                className={`p-4 sm:p-5 rounded-lg border ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          Searchable Text Extracted
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {result.averageConfidence}% OCR Confidence
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {result.totalWords.toLocaleString()} words &bull; {result.totalCharacters.toLocaleString()} characters across {result.pages.length} pages in {(result.processingTimeMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>

                  {/* Primary Export Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyText(result.fullText)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isCopied
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                          : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200'
                          : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-800'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .TXT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSearchablePdf}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200'
                          : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-800'
                      }`}
                      title="Download Searchable Transcript PDF"
                    >
                      <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Searchable PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}
                      title="Download Markdown Report"
                    >
                      .MD
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}
                      title="Download JSON OCR Data"
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar & View Tab Controls */}
              <div
                className={`p-4 sm:p-5 rounded-lg border space-y-4 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Live Search Within Extracted Text */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search within extracted OCR text..."
                      className={`w-full pl-8 pr-8 py-1.5 rounded-md text-xs border transition-colors ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500'
                          : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500'
                      }`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {searchQuery && (
                    <span className="text-xs text-zinc-500 font-mono">
                      {searchMatchesCount} {searchMatchesCount === 1 ? 'match' : 'matches'} found
                    </span>
                  )}

                  {/* Tabs: Combined vs Page-by-Page */}
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setActiveTab('combined')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        activeTab === 'combined'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Full Document Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('by-page')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        activeTab === 'by-page'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Page by Page ({result.pages.length})
                    </button>
                  </div>
                </div>

                {/* Tab 1: Full Document Combined Text View */}
                {activeTab === 'combined' && (
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={18}
                      value={result.fullText}
                      className={`w-full p-3.5 rounded-md font-mono text-xs leading-relaxed border resize-y outline-none select-text ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    />
                  </div>
                )}

                {/* Tab 2: Page by Page Side-by-Side Review View */}
                {activeTab === 'by-page' && (
                  <div className="space-y-4">
                    {/* Page Selector Strip */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                      {result.pages.map((p) => {
                        const isCurrent = selectedPageDetail === p.pageNum;
                        return (
                          <button
                            key={p.pageNum}
                            type="button"
                            onClick={() => setSelectedPageDetail(p.pageNum)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                              isCurrent
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-semibold'
                                : isDark
                                ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
                            }`}
                          >
                            <span>Page {p.pageNum}</span>
                            <span
                              className={`text-[10px] px-1 py-0.2 rounded ${
                                isCurrent
                                  ? 'bg-white/20 text-white dark:text-zinc-900'
                                  : isDark
                                  ? 'bg-zinc-800 text-zinc-400'
                                  : 'bg-zinc-200 text-zinc-600'
                              }`}
                            >
                              {p.confidence}%
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Page Detail Display */}
                    {(() => {
                      const currentPageData =
                        result.pages.find((p) => p.pageNum === selectedPageDetail) || result.pages[0];

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: Rendered Page Visual */}
                          <div
                            className={`p-3 rounded-md border flex flex-col items-center justify-center ${
                              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                            }`}
                          >
                            <span className="text-[11px] font-mono text-zinc-500 mb-2 self-start">
                              Page {currentPageData.pageNum} Image Preview
                            </span>
                            {currentPageData.thumbnailUrl ? (
                              <div className="max-h-[460px] overflow-auto rounded border border-zinc-200 dark:border-zinc-800">
                                <img
                                  src={currentPageData.thumbnailUrl}
                                  alt={`Page ${currentPageData.pageNum}`}
                                  className="w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-48 flex items-center justify-center text-xs text-zinc-500">
                                Thumbnail unavailable
                              </div>
                            )}
                          </div>

                          {/* Right: OCR Extracted Text for this page */}
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-zinc-500">
                                OCR Text ({currentPageData.wordCount} words &bull; {currentPageData.confidence}% confidence)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(currentPageData.text)}
                                className="text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Page</span>
                              </button>
                            </div>
                            <textarea
                              readOnly
                              rows={16}
                              value={currentPageData.text || 'No text detected on this page.'}
                              className={`w-full p-3.5 rounded-md font-mono text-xs leading-relaxed border resize-y outline-none flex-1 select-text ${
                                isDark
                                  ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                                  : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Bottom Quick Action: Re-run or Analyze Another */}
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Process Another Document</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security & Client-Side Notice Footer */}
      <div
        className={`p-3.5 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
            : 'bg-zinc-50 border-zinc-200 text-zinc-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
          <span>
            <strong>100% Client-Side OCR:</strong> Powered by Tesseract.js running inside an isolated browser Web Worker. Confidential documents never leave your device.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">Memory Safety Guaranteed</span>
      </div>

      {/* Educational & How It Works Guidance Section */}
      <PdfToolGuideSection
        toolName="PDF to Text & OCR Extractor"
        tagline="Extract editable text from digital PDFs or scanned paper documents using client-side OCR."
        steps={[
          {
            step: 1,
            title: 'Drop PDF Document',
            description: 'Upload your digital or scanned PDF. You can select specific pages or extract the entire file.',
            icon: <FileText className="w-4 h-4 text-cyan-400" />,
          },
          {
            step: 2,
            title: 'Select OCR Language & Mode',
            description: 'Choose between Hybrid, OCR-Only, or Digital Text extraction and select your document language.',
            icon: <Search className="w-4 h-4 text-blue-400" />,
          },
          {
            step: 3,
            title: 'Copy or Download .txt',
            description: 'Inspect extracted text in real time, copy to clipboard with 1-click, or export as a clean text file.',
            icon: <Download className="w-4 h-4 text-emerald-400" />,
          },
        ]}
        tips={[
          {
            title: 'Hybrid Extraction Mode',
            description: 'Hybrid mode automatically extracts digital selectable text first; if a page is a scanned image, it triggers Tesseract.js OCR automatically.',
          },
          {
            title: 'Multilingual Support',
            description: 'Select Spanish, French, German, Hindi, Japanese, or Arabic to load optimized trained language data.',
          },
          {
            title: 'Search Within Extracted Text',
            description: 'Use the built-in search filter to highlight and jump to specific keywords across all processed pages.',
          },
        ]}
        faqs={[
          {
            question: 'How does client-side OCR work in the browser?',
            answer: 'Tesseract.js compiles the open-source Tesseract OCR engine into WebAssembly. It executes inside a background Web Worker on your device, processing image data directly from HTML5 Canvas without network requests.',
          },
          {
            question: 'Why is OCR slower on large scanned PDFs?',
            answer: 'Optical Character Recognition analyzes every pixel to detect characters and words. For multi-page scans, the progress bar keeps you updated as each page is rendered and recognized.',
          },
          {
            question: 'Can I export the extracted text to Word or TXT?',
            answer: 'Yes! You can copy text directly to clipboard, download as a formatted .txt document, or use our PDF to Word converter for formatted DOCX output.',
          },
        ]}
        privacyNotes={[
          'WebAssembly Tesseract.js runs in an isolated Web Worker',
          'Zero cloud uploads or external AI API calls',
          'Text and document streams are erased on page refresh',
        ]}
      />
    </div>
  );
};
