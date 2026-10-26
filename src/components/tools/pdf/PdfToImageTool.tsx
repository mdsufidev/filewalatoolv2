'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  FileImage,
  Layers,
  Download,
  FileText,
  CheckCircle2,
  UploadCloud,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Eye,
  ShieldCheck,
  X,
  Copy,
  Check,
  Maximize2,
  Sliders,
  Settings2,
  Zap,
  HardDrive,
  Info,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import {
  createSafeObjectURL,
  revokeSafeObjectURL,
  formatBytes,
  triggerFileDownload,
} from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { Dropzone } from '../../ui/Dropzone';
import { PdfPreviewModal } from './PdfPreviewModal';
import { PdfToolGuideSection } from './PdfToolGuideSection';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../../utils/clipboardAndShare';

// Ensure unified PDF.js worker is ready
ensurePdfWorkerInitialized();

export type ImageFormat = 'jpg' | 'png' | 'webp';
export type ScaleFactor = 1 | 2 | 3;

export interface RenderedPageItem {
  pageNum: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  format: ImageFormat;
}

interface PdfToImageToolProps {
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PdfToImageTool: React.FC<PdfToImageToolProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration state
  const [format, setFormat] = useState<ImageFormat>('jpg');
  const [scale, setScale] = useState<ScaleFactor>(2); // 1 = 72 DPI, 2 = 150 DPI, 3 = 300 DPI
  const [quality, setQuality] = useState<number>(0.92); // For JPG and WebP (70% - 100%)
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [customRangeStr, setCustomRangeStr] = useState<string>('');

  // Execution & Progress state
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    stage: string;
    percentage: number;
  } | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Rendered results state
  const [renderedPages, setRenderedPages] = useState<RenderedPageItem[]>([]);
  const [copiedPageNum, setCopiedPageNum] = useState<number | null>(null);

  // Modals state
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<RenderedPageItem | null>(null);

  // FAQs state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // DOM input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track active blob URLs to clean up immediately
  const activeUrlsRef = useRef<Set<string>>(new Set());

  const registerTrackedUrl = useCallback((url: string) => {
    activeUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeTrackedUrl = useCallback((url: string | null | undefined) => {
    if (url && activeUrlsRef.current.has(url)) {
      revokeSafeObjectURL(url);
      activeUrlsRef.current.delete(url);
    }
  }, []);

  const clearAllRenderedUrls = useCallback(() => {
    activeUrlsRef.current.forEach((url) => {
      revokeSafeObjectURL(url);
    });
    activeUrlsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllRenderedUrls();
    };
  }, [clearAllRenderedUrls]);

  // Parse page range string into array of numbers
  const parsedTargetPages = useMemo(() => {
    if (!pageCount || pageCount <= 0) return [];
    if (rangeMode === 'all') {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    if (!customRangeStr.trim()) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const pagesSet = new Set<number>();
    const tokens = customRangeStr.split(/[,;\s]+/);

    for (const token of tokens) {
      if (!token) continue;
      if (token.includes('-')) {
        const [startStr, endStr] = token.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(pageCount, Math.max(start, end));
          for (let p = from; p <= to; p++) {
            pagesSet.add(p);
          }
        }
      } else {
        const p = parseInt(token, 10);
        if (!isNaN(p) && p >= 1 && p <= pageCount) {
          pagesSet.add(p);
        }
      }
    }

    return Array.from(pagesSet).sort((a, b) => a - b);
  }, [pageCount, rangeMode, customRangeStr]);

  // Quick helper to load PDF page count
  const inspectPdf = useCallback(async (selectedFile: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
        cMapPacked: true,
      });
      const pdfDoc = await loadingTask.promise;
      const count = pdfDoc.numPages;
      setPageCount(count);
      setCustomRangeStr(`1-${count}`);
    } catch (err: any) {
      console.error('Failed to parse PDF info:', err);
      // Fallback via pdf-lib if pdfjs had issue reading header
      try {
        const buffer = await selectedFile.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = doc.getPageCount();
        setPageCount(count);
        setCustomRangeStr(`1-${count}`);
      } catch (fallbackErr: any) {
        setErrorMessage(
          'Could not read this PDF. The file may be password protected or corrupted.'
        );
        setPageCount(null);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Handle incoming file selection
  const handleFileSelected = useCallback(
    async (incomingFile: File) => {
      if (
        incomingFile.type !== 'application/pdf' &&
        !incomingFile.name.toLowerCase().endsWith('.pdf')
      ) {
        setErrorMessage('Please select a valid PDF document (.pdf).');
        onNotify?.('Invalid File', 'Please select a valid PDF file.', 'error');
        return;
      }

      // Reset prior renders
      clearAllRenderedUrls();
      setRenderedPages([]);
      setFile(incomingFile);
      setErrorMessage(null);
      await inspectPdf(incomingFile);
      onNotify?.('PDF Loaded', `Loaded ${incomingFile.name}`, 'info');
    },
    [clearAllRenderedUrls, inspectPdf, onNotify]
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Generate Sample PDF for quick 1-click testing
  const handleLoadSamplePdf = async () => {
    try {
      setIsAnalyzing(true);
      const pdfDoc = await PDFDocument.create();
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Page 1: Title & Cover
      const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
      page1.drawRectangle({
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
        color: rgb(0.96, 0.97, 0.99),
      });
      page1.drawRectangle({
        x: 40,
        y: 720,
        width: 515.28,
        height: 80,
        color: rgb(0.12, 0.28, 0.55),
      });
      page1.drawText('FileWala Client-Side Suite', {
        x: 60,
        y: 760,
        size: 24,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      page1.drawText('High-Performance PDF to Image Converter', {
        x: 60,
        y: 735,
        size: 13,
        font: helvetica,
        color: rgb(0.85, 0.9, 1),
      });
      page1.drawText('Document Sample: Page 1 of 3 (Cover Page)', {
        x: 60,
        y: 660,
        size: 15,
        font: helveticaBold,
        color: rgb(0.1, 0.15, 0.25),
      });
      page1.drawText(
        'This sample multi-page PDF is generated locally inside your browser.\nNo servers or network calls were made. You can convert each page\nto crisp JPG, lossless PNG, or modern WebP images in seconds.',
        {
          x: 60,
          y: 610,
          size: 11,
          font: helvetica,
          color: rgb(0.35, 0.4, 0.5),
          lineHeight: 18,
        }
      );

      // Page 2: Vector Chart & Summary
      const page2 = pdfDoc.addPage([595.28, 841.89]);
      page2.drawText('Page 2: Executive Summary & Metrics', {
        x: 50,
        y: 780,
        size: 20,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
      page2.drawRectangle({
        x: 50,
        y: 640,
        width: 495,
        height: 110,
        color: rgb(0.92, 0.95, 0.99),
        borderColor: rgb(0.7, 0.8, 0.95),
        borderWidth: 1,
      });
      page2.drawText('Metric: 100% In-Browser Rendering Speed', {
        x: 70,
        y: 710,
        size: 14,
        font: helveticaBold,
        color: rgb(0.1, 0.3, 0.6),
      });
      page2.drawText(
        'Browser-native HTML5 Canvas renders text and vector paths with pinpoint accuracy.\nChoose between 72 DPI (1x), 150 DPI (2x), and 300 DPI (3x Ultra HD).',
        {
          x: 70,
          y: 670,
          size: 11,
          font: helvetica,
          color: rgb(0.3, 0.35, 0.45),
          lineHeight: 16,
        }
      );

      // Page 3: Specifications & Terms
      const page3 = pdfDoc.addPage([595.28, 841.89]);
      page3.drawText('Page 3: Technical Specifications & Privacy Guarantee', {
        x: 50,
        y: 780,
        size: 18,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
      page3.drawText(
        '1. Zero Server Uploads: All bytes stay inside your active browser session.\n2. Memory Safety: Dynamic object URL revocation prevents memory leakage.\n3. Formats Supported: Standard JPG, Lossless PNG, and Compressed WebP.\n4. Bulk ZIP Packaging: Download all converted pages in a single archive.',
        {
          x: 50,
          y: 720,
          size: 12,
          font: helvetica,
          color: rgb(0.25, 0.3, 0.4),
          lineHeight: 22,
        }
      );

      const pdfBytes = await pdfDoc.save();
      const sampleFile = new File([pdfBytes as unknown as BlobPart], 'FileWala-Sample-Document.pdf', {
        type: 'application/pdf',
      });
      await handleFileSelected(sampleFile);
      onNotify?.('Sample PDF Loaded', 'Ready to convert to JPG, PNG, or WebP.', 'success');
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
      onNotify?.('Sample Load Failed', 'Could not generate sample PDF.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Convert selected pages to images
  const handleExecuteConvert = async () => {
    if (!file) {
      setErrorMessage('Please select a PDF file first.');
      return;
    }
    if (parsedTargetPages.length === 0) {
      setErrorMessage('Please select at least one page to convert.');
      return;
    }

    setErrorMessage(null);
    setIsRendering(true);
    abortControllerRef.current = false;

    // Clear prior rendered URLs
    clearAllRenderedUrls();
    setRenderedPages([]);

    const totalToRender = parsedTargetPages.length;
    const newRenderedItems: RenderedPageItem[] = [];

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/standard_fonts/',
      });
      const pdfDoc = await loadingTask.promise;

      // Render scale factor: 1x = 1.0 (72 DPI), 2x = 2.0 (150 DPI), 3x = 3.0 (300 DPI)
      const renderScale = scale === 1 ? 1.0 : scale === 2 ? 2.0 : 3.0;

      for (let i = 0; i < parsedTargetPages.length; i++) {
        if (abortControllerRef.current) {
          onNotify?.('Conversion Cancelled', 'Rendering stopped by user.', 'info');
          break;
        }

        const pageNum = parsedTargetPages[i];
        const percent = Math.round(((i + 1) / totalToRender) * 100);

        setProgress({
          current: i + 1,
          total: totalToRender,
          stage: `Rendering Page ${pageNum} of ${pageCount} (${percent}%)...`,
          percentage: percent,
        });

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Canvas 2D context could not be initialized.');
        }

        // Fill solid white background for JPG (and as standard crisp background)
        if (format === 'jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // For PNG and WebP, default to crisp white background for document readability
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext as any).promise;

        const mimeType =
          format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
        const blobQuality = format === 'png' ? undefined : quality;

        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error(`Failed to encode page ${pageNum} into ${format.toUpperCase()}`));
            },
            mimeType,
            blobQuality
          );
        });

        // Clean up canvas memory immediately
        const w = canvas.width;
        const h = canvas.height;
        canvas.width = 0;
        canvas.height = 0;

        const objectUrl = registerTrackedUrl(createSafeObjectURL(blob));

        const item: RenderedPageItem = {
          pageNum,
          blob,
          url: objectUrl,
          width: w,
          height: h,
          size: blob.size,
          format,
        };

        newRenderedItems.push(item);
        // Incremental state update so user sees results in real-time as they render!
        setRenderedPages([...newRenderedItems]);

        // Yield to browser main thread so UI stays fluid
        await new Promise((r) => setTimeout(r, 20));
      }

      if (!abortControllerRef.current) {
        onNotify?.(
          'Conversion Completed!',
          `Successfully converted ${newRenderedItems.length} page(s) to ${format.toUpperCase()}`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Render error:', err);
      const msg = err?.message || 'Error occurred while rendering PDF pages to images.';
      setErrorMessage(msg);
      onNotify?.('Conversion Failed', msg, 'error');
    } finally {
      setIsRendering(false);
      setProgress(null);
    }
  };

  // Cancel rendering handler
  const handleCancelRendering = () => {
    abortControllerRef.current = true;
    setIsRendering(false);
    setProgress(null);
  };

  // Download single image
  const handleDownloadSingleImage = (item: RenderedPageItem) => {
    const baseName = (file?.name || 'document').replace(/\.pdf$/i, '');
    const ext = item.format === 'jpg' ? 'jpg' : item.format === 'png' ? 'png' : 'webp';
    const filename = `${baseName}-page-${String(item.pageNum).padStart(2, '0')}.${ext}`;
    triggerFileDownload(item.blob, filename);
    onNotify?.('Downloaded', `Saved ${filename}`, 'success');
  };

  // Copy image to clipboard
  const handleCopyImageToClipboard = async (item: RenderedPageItem) => {
    const ok = await copyImageToClipboard(item.blob);
    if (ok) {
      setCopiedPageNum(item.pageNum);
      setTimeout(() => setCopiedPageNum(null), 2500);
      onNotify?.('Copied to Clipboard', `Page ${item.pageNum} image copied to clipboard`, 'success');
    } else {
      onNotify?.('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  // Share single page image
  const handleShareSingleImage = async (item: RenderedPageItem) => {
    const baseName = (file?.name || 'document').replace(/\.pdf$/i, '');
    const ext = item.format === 'jpg' ? 'jpg' : item.format === 'png' ? 'png' : 'webp';
    const filename = `${baseName}-page-${String(item.pageNum).padStart(2, '0')}.${ext}`;
    const shared = await shareFileOrBlob({
      blob: item.blob,
      filename,
      title: `Page ${item.pageNum}`,
      text: `Page ${item.pageNum} converted from PDF with FileWala.`,
    });
    if (shared) {
      onNotify?.('Shared', `Page ${item.pageNum} shared successfully.`, 'success');
    }
  };

  // Download all rendered pages as ZIP
  const handleDownloadAllZip = async () => {
    if (renderedPages.length === 0) return;

    setIsZipping(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const baseName = (file?.name || 'document').replace(/\.pdf$/i, '');
      const ext = format === 'jpg' ? 'jpg' : format === 'png' ? 'png' : 'webp';

      renderedPages.forEach((item) => {
        const pageFileName = `${baseName}-page-${String(item.pageNum).padStart(2, '0')}.${ext}`;
        zip.file(pageFileName, item.blob);
      });

      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setZipProgress(Math.round(metadata.percent));
        }
      );

      const zipFilename = `${baseName}-${format.toUpperCase()}-images.zip`;
      triggerFileDownload(zipBlob, zipFilename);
      onNotify?.(
        'ZIP Archive Ready',
        `Downloaded all ${renderedPages.length} images in ${zipFilename} (${formatBytes(zipBlob.size)})`,
        'success'
      );
    } catch (err: any) {
      console.error('ZIP generation error:', err);
      onNotify?.('ZIP Failed', 'Could not create ZIP archive.', 'error');
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  // Reset tool
  const handleReset = () => {
    clearAllRenderedUrls();
    setFile(null);
    setPageCount(null);
    setRenderedPages([]);
    setErrorMessage(null);
    setCustomRangeStr('');
    setRangeMode('all');
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (!file) return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        handleReset();
        onNotify?.('Reset', 'Cleared PDF document.', 'info');
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        if (renderedPages.length > 0) {
          e.preventDefault();
          handleDownloadAllZip();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (renderedPages.length === 0) {
          e.preventDefault();
          handleExecuteConvert();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [file, renderedPages.length, handleDownloadAllZip, handleExecuteConvert, handleReset, onNotify]);

  const totalRenderedSize = renderedPages.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 animate-in fade-in duration-200">
      {/* HEADER SECTION */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-amber-400'
              : 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
          }`}
        >
          <FileImage className="w-3.5 h-3.5" />
          <span>100% Client-Side PDF to Image Engine</span>
        </div>

        <h1
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          PDF to Image Converter
        </h1>

        <p
          className={`text-sm sm:text-base leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Convert PDF pages into high-resolution JPG, lossless PNG, or WebP images in seconds.
        </p>
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div
          className={`p-3.5 rounded-md border flex items-center justify-between gap-3 text-xs ${
            isDark
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-500/20 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="space-y-6">
        {/* 1. SINGLE FILE DROPZONE (When no file is selected) */}
        {!file ? (
          <div className="max-w-3xl mx-auto">
            <Dropzone
              onFilesSelected={(files: File[]) => handleFileSelected(files[0])}
              accept="application/pdf,.pdf"
              title="Upload PDF to Convert to Images"
              description="Drag & drop or click to browse. Converts pages to JPG, PNG, or WebP."
            />
          </div>
        ) : (
          /* 2. ACTIVE FILE CARD & CONVERSION CONFIGURATION WORKSPACE */
          <div className="space-y-6">
            {/* Active Document Card */}
            <div
              className={`p-4 sm:p-5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-sm sm:text-base font-semibold truncate max-w-xs sm:max-w-md ${
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      Validated PDF
                    </span>
                  </div>

                  <p
                    className={`text-xs mt-0.5 flex items-center gap-2 flex-wrap ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {isAnalyzing
                        ? 'Analyzing page count...'
                        : pageCount !== null
                        ? `${pageCount} Page${pageCount === 1 ? '' : 's'}`
                        : 'Page count unknown'}
                    </span>
                    <span>•</span>
                    <span>100% In-Browser</span>
                  </p>
                </div>
              </div>

              {/* Actions on file */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                {/* Built-in PDF Preview Button */}
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  title="Preview source PDF pages before converting"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Preview PDF</span>
                </button>

                {/* Change File button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CONVERSION CONFIGURATION PANEL */}
            <div
              className={`p-5 sm:p-6 rounded-lg border space-y-5 ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-zinc-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-zinc-500" />
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    Image Export Settings
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 self-start sm:self-auto">
                  Target: {parsedTargetPages.length} of {pageCount || 1} pages
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. IMAGE FORMAT SELECTOR */}
                <div className="space-y-2">
                  <label
                    className={`block text-xs font-semibold ${
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    }`}
                  >
                    Image Format
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* JPG */}
                    <button
                      type="button"
                      onClick={() => setFormat('jpg')}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        format === 'jpg'
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">JPG</span>
                      <span className="text-[10px] text-zinc-400">Standard</span>
                    </button>

                    {/* PNG */}
                    <button
                      type="button"
                      onClick={() => setFormat('png')}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        format === 'png'
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">PNG</span>
                      <span className="text-[10px] text-zinc-400">Lossless</span>
                    </button>

                    {/* WebP */}
                    <button
                      type="button"
                      onClick={() => setFormat('webp')}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        format === 'webp'
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">WebP</span>
                      <span className="text-[10px] text-zinc-400">Optimized</span>
                    </button>
                  </div>

                  <p className="text-[11px] leading-tight text-zinc-500">
                    {format === 'jpg' && 'Universal compatibility with solid white background.'}
                    {format === 'png' && 'Lossless rendering, highest crispness for vector text & tables.'}
                    {format === 'webp' && 'Next-gen web format with ultra-compact file sizes.'}
                  </p>
                </div>

                {/* 2. RESOLUTION / DPI SCALE SELECTOR */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      className={`block text-xs font-semibold ${
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      Resolution / DPI Scale
                    </label>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {scale === 1 ? '72 DPI' : scale === 2 ? '150 DPI' : '300 DPI'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* 1x */}
                    <button
                      type="button"
                      onClick={() => setScale(1)}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        scale === 1
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">1x</span>
                      <span className="text-[10px] text-zinc-400">Standard</span>
                    </button>

                    {/* 2x */}
                    <button
                      type="button"
                      onClick={() => setScale(2)}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        scale === 2
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">2x</span>
                      <span className="text-[10px] text-zinc-400">High-Res</span>
                    </button>

                    {/* 3x */}
                    <button
                      type="button"
                      onClick={() => setScale(3)}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        scale === 3
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">3x</span>
                      <span className="text-[10px] text-zinc-400">Ultra HD</span>
                    </button>
                  </div>

                  {/* Quality slider for JPG & WebP */}
                  {format !== 'png' && (
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">
                          Quality: {Math.round(quality * 100)}%
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {quality >= 0.9 ? 'Crisp' : 'Smaller'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.70"
                        max="1.0"
                        step="0.02"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 3. PAGE RANGE SELECTION */}
                <div className="space-y-2">
                  <label
                    className={`block text-xs font-semibold ${
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    }`}
                  >
                    Page Range Selection
                  </label>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRangeMode('all')}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        rangeMode === 'all'
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">All Pages</span>
                      <span className="text-[10px] text-zinc-400">
                        1 to {pageCount || 1}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRangeMode('custom')}
                      className={`p-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        rangeMode === 'custom'
                          ? isDark
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900 font-semibold'
                            : 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">Custom Range</span>
                      <span className="text-[10px] text-zinc-400">e.g. 1-3, 5</span>
                    </button>
                  </div>

                  {rangeMode === 'custom' && (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={customRangeStr}
                        onChange={(e) => setCustomRangeStr(e.target.value)}
                        placeholder={`e.g. 1-${Math.min(pageCount || 3, 3)}, 5`}
                        className={`w-full px-3 py-1.5 rounded-md text-xs font-mono border ${
                          isDark
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500'
                        } outline-hidden`}
                      />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {parsedTargetPages.length} pages targeted
                        </span>
                        <span className="font-mono text-zinc-400 text-[10px]">
                          {parsedTargetPages.slice(0, 5).join(', ')}
                          {parsedTargetPages.length > 5 ? '...' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CONVERT CTA BUTTON */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={isRendering || !file || parsedTargetPages.length === 0}
                  onClick={handleExecuteConvert}
                  className="w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>
                    Convert {parsedTargetPages.length} Page
                    {parsedTargetPages.length === 1 ? '' : 's'} to {format.toUpperCase()} (
                    {scale}x {scale === 1 ? '72 DPI' : scale === 2 ? '150 DPI' : '300 DPI'})
                  </span>
                </button>
              </div>
            </div>

            {/* PROGRESS BAR (Active during rendering) */}
            {isRendering && progress && (
              <div
                className={`p-4 rounded-lg border space-y-3 ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
                    <div>
                      <h4
                        className={`text-xs font-semibold ${
                          isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}
                      >
                        Rendering PDF to {format.toUpperCase()} Images...
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {progress.stage}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelRendering}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>
                    Page {progress.current} of {progress.total}
                  </span>
                  <span>{progress.percentage}% Completed</span>
                </div>
              </div>
            )}

            {/* 3. INTERACTIVE PAGE PREVIEW GRID & BULK ACTIONS */}
            {renderedPages.length > 0 && (
              <div className="space-y-4 pt-1">
                {/* Result Summary & Bulk Actions Toolbar */}
                <div
                  className={`p-4 sm:p-5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <h3
                        className={`text-sm sm:text-base font-semibold ${
                          isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}
                      >
                        {renderedPages.length} Page{renderedPages.length === 1 ? '' : 's'} Converted
                        Successfully
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Format: <span className="font-semibold uppercase">{format}</span> • Total Size:{' '}
                      <span className="font-semibold">{formatBytes(totalRenderedSize)}</span> •
                      Resolution:{' '}
                      <span className="font-semibold">
                        {scale}x ({scale === 1 ? '72' : scale === 2 ? '150' : '300'} DPI)
                      </span>
                    </p>
                  </div>

                  {/* Bulk CTA: Download All as ZIP */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isZipping}
                      onClick={handleDownloadAllZip}
                      className="px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {isZipping
                          ? `Creating ZIP (${zipProgress || 0}%)...`
                          : `Download All as ZIP (${renderedPages.length} images)`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Page Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {renderedPages.map((item) => (
                    <div
                      key={item.pageNum}
                      className={`group rounded-md border overflow-hidden flex flex-col justify-between transition-colors ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                          : 'bg-white border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {/* Card Thumbnail Area with Click-to-Expand */}
                      <div
                        onClick={() => setExpandedImage(item)}
                        className={`relative aspect-[3/4] p-3 flex items-center justify-center cursor-pointer overflow-hidden ${
                          isDark ? 'bg-zinc-950' : 'bg-zinc-50'
                        }`}
                      >
                        {/* Page Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isDark
                                ? 'bg-zinc-900/90 border-zinc-700 text-zinc-100'
                                : 'bg-white/90 border-zinc-200 text-zinc-800'
                            }`}
                          >
                            Page {item.pageNum}
                          </span>
                        </div>

                        {/* Format & Dimensions Pill */}
                        <div className="absolute top-2 right-2 z-10">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isDark
                                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                                : 'bg-white/80 border-zinc-200 text-zinc-600'
                            }`}
                          >
                            {item.format.toUpperCase()}
                          </span>
                        </div>

                        {/* Rendered Image */}
                        <img
                          src={item.url}
                          alt={`Page ${item.pageNum}`}
                          className="max-w-full max-h-full object-contain rounded"
                        />

                        {/* Hover Overlay with Zoom Icon */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          <span className="px-2.5 py-1 rounded bg-black/75 text-white text-[11px] font-medium flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" />
                            <span>Zoom</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Information & Download Actions */}
                      <div className="p-3 space-y-2 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                          <span>
                            {item.width} × {item.height} px
                          </span>
                          <span>{formatBytes(item.size)}</span>
                        </div>

                        <div className={`grid ${isShareSupported() ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleImage(item)}
                            className="py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>

                          {/* Copy Image Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyImageToClipboard(item)}
                            className={`py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              copiedPageNum === item.pageNum
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                : isDark
                                ? 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                            }`}
                          >
                            {copiedPageNum === item.pageNum ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Share Button */}
                          {isShareSupported() && (
                            <button
                              type="button"
                              onClick={() => handleShareSingleImage(item)}
                              className="py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                              title="Share Page Image"
                            >
                              <Share2 className="w-3 h-3 text-zinc-500" />
                              <span>Share</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BUILT-IN SOURCE PDF PREVIEW MODAL */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        isDark={isDark}
        title="Source PDF Document Preview"
        file={file}
        fileName={file?.name || 'Document.pdf'}
        fileSize={file?.size || 0}
      />

      {/* LIGHTBOX MODAL FOR ENLARGED IMAGE PREVIEW */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-4xl max-h-[90vh] rounded-lg border shadow-lg flex flex-col overflow-hidden ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-semibold">
                  Page {expandedImage.pageNum} Image Preview
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  ({expandedImage.width} × {expandedImage.height} px • {formatBytes(expandedImage.size)})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleImage(expandedImage)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={() => handleShareSingleImage(expandedImage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                  >
                    <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Share</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedImage(null)}
                  className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-750 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-zinc-950 max-h-[75vh]">
              <img
                src={expandedImage.url}
                alt={`Page ${expandedImage.pageNum} enlarged`}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Format: {expandedImage.format.toUpperCase()} • Scale: {scale}x
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCopyImageToClipboard(expandedImage)}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to Clipboard</span>
                </button>
                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={() => handleShareSingleImage(expandedImage)}
                    className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Educational & Technical Guide Section */}
      <PdfToolGuideSection toolId="pdf-to-image" />
    </div>
  );
};
