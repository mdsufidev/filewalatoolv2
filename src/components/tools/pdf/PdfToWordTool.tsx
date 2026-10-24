'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  PageBreak,
  AlignmentType,
} from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';
import { createWorker } from 'tesseract.js';
import {
  FileText,
  Download,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Eye,
  ShieldCheck,
  Loader2,
  X,
  Copy,
  Check,
  RefreshCw,
  Palette,
  FileCheck,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { formatBytes, triggerFileDownload } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { PdfPreviewModal } from './PdfPreviewModal';

// Ensure unified PDF.js worker is ready
ensurePdfWorkerInitialized();

export type WordConversionMode = 'flow' | 'page-break';
export type WordColorTheme = 'clean' | 'accent' | 'monochrome';

export interface PreviewSpan {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
  color?: string;
}

export interface PreviewParagraph {
  isHeading?: boolean;
  headingLevel?: number;
  pageNum: number;
  text: string;
  spans: PreviewSpan[];
}

export interface ConvertedWordResult {
  blob: Blob;
  url: string;
  filename: string;
  originalSize: number;
  wordFileSize: number;
  totalPages: number;
  totalWords: number;
  totalParagraphs: number;
  processingTimeMs: number;
  paragraphsPreview: PreviewParagraph[];
  colorMode: WordColorTheme;
}

interface PdfToWordToolProps {
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

interface RawSpan {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
}

interface GroupedLine {
  y: number;
  height: number;
  spans: RawSpan[];
}

export const PdfToWordTool: React.FC<PdfToWordToolProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileThumbnailUrl, setFileThumbnailUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isScannedDetected, setIsScannedDetected] = useState<boolean | null>(null);

  // Conversion options
  const [conversionMode, setConversionMode] = useState<WordConversionMode>('flow');
  const [colorTheme, setColorTheme] = useState<WordColorTheme>('clean');

  // Processing state
  const [isConverting, setIsConverting] = useState(false);
  const [progressState, setProgressState] = useState<{
    percent: number;
    stage: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<ConvertedWordResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUrlsRef = useRef<Set<string>>(new Set());

  // URL memory management
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
    if (fileThumbnailUrl) revokeTrackedUrl(fileThumbnailUrl);
    if (result?.url) revokeTrackedUrl(result.url);

    setFile(null);
    setPageCount(null);
    setFileThumbnailUrl(null);
    setIsScannedDetected(null);
    setResult(null);
    setErrorMessage(null);
    setProgressState(null);
    setIsConverting(false);
    setIsPreviewOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileThumbnailUrl, result, revokeTrackedUrl]);

  // Load and inspect PDF
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
        onNotify?.('Empty File', 'Please select a non-empty PDF document.', 'error');
        return;
      }

      if (uploadedFile.size > 200 * 1024 * 1024) {
        setErrorMessage('File exceeds browser memory safety limit of 200 MB.');
        onNotify?.('File Too Large', 'Maximum file size is 200 MB.', 'error');
        return;
      }

      if (fileThumbnailUrl) revokeTrackedUrl(fileThumbnailUrl);
      if (result?.url) revokeTrackedUrl(result.url);
      setResult(null);

      setFile(uploadedFile);
      setIsValidating(true);

      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const total = pdfDoc.numPages;
        setPageCount(total);

        if (total > 0) {
          const firstPage = await pdfDoc.getPage(1);

          // Check if page 1 has digital text
          const textContent = await firstPage.getTextContent();
          const digitalLength = textContent.items.reduce(
            (acc: number, item: any) =>
              acc + ('str' in item && typeof item.str === 'string' ? item.str.trim().length : 0),
            0
          );
          setIsScannedDetected(digitalLength < 25);

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

        onNotify?.('PDF Loaded', `${uploadedFile.name} (${total} pages) ready to convert.`, 'success');
      } catch (err: any) {
        console.error('PDF inspection error:', err);
        setErrorMessage('Unable to inspect PDF structure. File may be encrypted or corrupted.');
        onNotify?.('PDF Inspection Failed', 'Could not parse document structure.', 'error');
      } finally {
        setIsValidating(false);
      }
    },
    [fileThumbnailUrl, result, registerTrackedUrl, revokeTrackedUrl, onNotify]
  );

  // Generate high quality sample PDF for 1-click evaluation (exact UX as MergePdfTool)
  const handleLoadSamplePdf = useCallback(async () => {
    try {
      setIsConverting(true);
      setProgressState({ percent: 15, stage: 'Generating Sample Formatted Document...' });

      const sampleDoc = await PDFDocument.create();
      const helvetica = await sampleDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await sampleDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await sampleDoc.embedFont(StandardFonts.HelveticaOblique);

      // Page 1: Structured Document with Title, Headings, Paragraphs and Bullet List
      const p1 = sampleDoc.addPage([595.28, 841.89]);

      // Title
      p1.drawText('Sample Document: Cloud Architecture Proposal', {
        x: 50,
        y: 780,
        size: 20,
        font: helveticaBold,
        color: rgb(0.06, 0.09, 0.16),
      });

      p1.drawText('Prepared for Engineering & Infrastructure Leadership', {
        x: 50,
        y: 752,
        size: 11,
        font: helveticaOblique,
        color: rgb(0.38, 0.44, 0.52),
      });

      // Section 1 Heading
      p1.drawText('1. Executive Overview & Objectives', {
        x: 50,
        y: 700,
        size: 15,
        font: helveticaBold,
        color: rgb(0.12, 0.23, 0.54),
      });

      // Paragraph 1
      p1.drawText(
        'This document highlights the proposed multi-cloud framework engineered for high reliability,',
        { x: 50, y: 672, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );
      p1.drawText(
        'instant autoscaling, and zero single-point failures. All client processing is isolated locally',
        { x: 50, y: 654, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );
      p1.drawText(
        'ensuring full regulatory data compliance and enterprise confidentiality.',
        { x: 50, y: 636, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );

      // Section 2 Heading
      p1.drawText('2. Key Architecture Pillars', {
        x: 50,
        y: 588,
        size: 15,
        font: helveticaBold,
        color: rgb(0.12, 0.23, 0.54),
      });

      // Bullet items
      const bullets = [
        'Zero Server Data Retention: All compute tasks execute client-side in the browser tab.',
        'High-Performance WebAssembly Pipelines: Near-native memory operations and processing speeds.',
        'Automatic Typography Preservation: Reconstructed heading hierarchy, font metrics and text flow.',
        'Seamless Word Export: Instant download of clean .docx documents with zero color clashing.',
      ];

      let currentY = 560;
      for (const b of bullets) {
        p1.drawText('•', { x: 50, y: currentY, size: 12, font: helveticaBold, color: rgb(0.2, 0.35, 0.7) });
        p1.drawText(b, { x: 65, y: currentY, size: 10.5, font: helvetica, color: rgb(0.15, 0.18, 0.26) });
        currentY -= 26;
      }

      // Section 3 Heading
      p1.drawText('3. Implementation Timeline & Deliverables', {
        x: 50,
        y: currentY - 20,
        size: 15,
        font: helveticaBold,
        color: rgb(0.12, 0.23, 0.54),
      });

      p1.drawText(
        'Milestone Alpha begins during Week 2, delivering foundational document parser benchmarks.',
        { x: 50, y: currentY - 48, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );
      p1.drawText(
        'Final deployment and automated continuous testing will conclude across all target browser engines.',
        { x: 50, y: currentY - 66, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );

      // Page 2: Summary Page
      const p2 = sampleDoc.addPage([595.28, 841.89]);
      p2.drawText('4. Security & Compliance Review', {
        x: 50,
        y: 780,
        size: 16,
        font: helveticaBold,
        color: rgb(0.12, 0.23, 0.54),
      });

      p2.drawText(
        'Every converted document conforms to strict cryptographic boundary checks.',
        { x: 50, y: 748, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );
      p2.drawText(
        'No remote telemetry or packet egress occurs during runtime execution.',
        { x: 50, y: 730, size: 11, font: helvetica, color: rgb(0.12, 0.16, 0.24) }
      );

      const pdfBytes = await sampleDoc.save();
      const sampleBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const sampleFile = new File([sampleBlob], 'sample-architecture-proposal.pdf', {
        type: 'application/pdf',
      });

      await handleProcessFile(sampleFile);
      onNotify?.('Sample PDF Loaded', 'Ready to convert to Word (.docx) with 1 click.', 'info');
    } catch (err: any) {
      console.error('Failed to create sample PDF:', err);
      onNotify?.('Sample Creation Failed', 'Could not build sample PDF.', 'error');
    } finally {
      setIsConverting(false);
      setProgressState(null);
    }
  }, [handleProcessFile, onNotify]);

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

  // =========================================================================
  // CORE HIGH-PRECISION PDF TO WORD (.DOCX) CONVERSION ENGINE
  // Solves formatting & color mix-match by standardizing typography,
  // normalizing paragraph text runs, and preventing character color noise
  // =========================================================================
  const handleExecuteConvertToWord = async () => {
    if (!file || !pageCount) return;

    setIsConverting(true);
    setErrorMessage(null);
    setProgressState({ percent: 5, stage: 'Analyzing document typography & paragraph structure...' });
    const startTime = performance.now();

    let ocrWorker: any = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      const docxChildren: Paragraph[] = [];
      const previewParagraphs: PreviewParagraph[] = [];
      let totalExtractedWords = 0;

      // Color scheme definitions to prevent chaotic rainbow / subpixel color noise
      const getHeadingColor = () => {
        if (colorTheme === 'monochrome') return '000000';
        if (colorTheme === 'accent') return '1E40AF'; // Crisp Royal Navy Accent
        return '0F172A'; // Clean Slate 900
      };

      const getBodyColor = () => {
        if (colorTheme === 'monochrome') return '000000';
        return '1E293B'; // Clean, readable Slate 800
      };

      for (let i = 1; i <= numPages; i++) {
        const stepPercent = Math.round(10 + ((i - 0.5) / numPages) * 75);
        setProgressState({
          percent: stepPercent,
          stage: `Extracting Page ${i} of ${numPages} (Headings, Paragraphs & Flow)...`,
        });

        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        const rawSpans: RawSpan[] = [];

        textContent.items.forEach((item: any) => {
          if ('str' in item && typeof item.str === 'string') {
            const str = item.str;
            if (str.trim().length > 0) {
              const transform = item.transform || [1, 0, 0, 1, 0, 0];
              const x = transform[4];
              const y = transform[5];
              const height = item.height || Math.abs(transform[0]) || 12;
              const width = item.width || str.length * (height * 0.5);

              // Inspect font family for bold/italic traits
              const fontStyle = textContent.styles ? textContent.styles[item.fontName] : null;
              const fontName = (fontStyle?.fontFamily || item.fontName || '').toLowerCase();
              const isBold =
                fontName.includes('bold') ||
                fontName.includes('black') ||
                fontName.includes('heavy') ||
                fontName.includes('700') ||
                fontName.includes('semibold');
              const isItalic = fontName.includes('italic') || fontName.includes('oblique');

              const ptSize = Math.max(8, Math.min(48, Math.round(height)));

              rawSpans.push({
                str,
                x,
                y,
                width,
                height,
                fontSize: ptSize,
                isBold,
                isItalic,
              });
            }
          }
        });

        // Scanned Page Fallback via Tesseract OCR if page has no digital text
        if (rawSpans.length === 0) {
          setProgressState({
            percent: stepPercent,
            stage: `Running OCR on scanned Page ${i}...`,
          });

          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

            if (!ocrWorker) {
              ocrWorker = await createWorker('eng', 1);
            }

            const ocrResult = await ocrWorker.recognize(canvas);
            const ocrText = ocrResult?.data?.text?.trim() || '';

            if (ocrText) {
              const ocrParagraphs = ocrText.split(/\n\s*\n/);
              for (const ocrP of ocrParagraphs) {
                const cleaned = ocrP.replace(/\s+/g, ' ').trim();
                if (cleaned) {
                  const words = cleaned.split(' ').length;
                  totalExtractedWords += words;

                  docxChildren.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cleaned,
                          size: 22, // 11pt
                          font: 'Calibri',
                          color: getBodyColor(),
                        }),
                      ],
                      spacing: { after: 140, line: 276 },
                    })
                  );

                  previewParagraphs.push({
                    isHeading: false,
                    pageNum: i,
                    text: cleaned,
                    spans: [{ text: cleaned, fontSize: 11, color: getBodyColor() }],
                  });
                }
              }
            }
            canvas.width = 0;
            canvas.height = 0;
          }
        } else {
          // Digital PDF: Group spans into lines and paragraphs with uniform typography
          // 1. Calculate median body font size for this page
          const fontSizes = rawSpans.map((s) => s.fontSize).sort((a, b) => a - b);
          const medianBodySize = fontSizes[Math.floor(fontSizes.length / 2)] || 11;

          // 2. Sort spans: top-to-bottom (y descending), then left-to-right (x ascending)
          rawSpans.sort((a, b) => {
            const yDiff = b.y - a.y;
            if (Math.abs(yDiff) > 3.0) {
              return yDiff;
            }
            return a.x - b.x;
          });

          // 3. Cluster spans into horizontal lines
          const lines: GroupedLine[] = [];
          let curLine: GroupedLine | null = null;

          for (const span of rawSpans) {
            if (!curLine) {
              curLine = { y: span.y, height: span.height, spans: [span] };
            } else if (Math.abs(curLine.y - span.y) <= 3.2) {
              curLine.spans.push(span);
              curLine.height = Math.max(curLine.height, span.height);
            } else {
              lines.push(curLine);
              curLine = { y: span.y, height: span.height, spans: [span] };
            }
          }
          if (curLine) {
            lines.push(curLine);
          }

          // 4. Assemble lines into cohesive paragraphs
          // Avoid creating a paragraph per line! Join lines into natural fluid paragraphs.
          let paragraphLines: GroupedLine[] = [];

          for (let l = 0; l < lines.length; l++) {
            const line = lines[l];
            const nextLine = lines[l + 1];

            paragraphLines.push(line);

            // Reconstruct full text of current line with clean spacing
            line.spans.sort((a, b) => a.x - b.x);
            let lineText = '';
            for (let sIdx = 0; sIdx < line.spans.length; sIdx++) {
              const span = line.spans[sIdx];
              const prevSpan = line.spans[sIdx - 1];

              if (prevSpan) {
                const gap = span.x - (prevSpan.x + prevSpan.width);
                if (gap > 2.0 && !lineText.endsWith(' ') && !span.str.startsWith(' ')) {
                  lineText += ' ';
                }
              }
              lineText += span.str;
            }
            lineText = lineText.trim();

            const maxFontSizeOnLine = Math.max(...line.spans.map((s) => s.fontSize));
            const isHeadingCandidate =
              maxFontSizeOnLine >= medianBodySize * 1.25 && lineText.length < 90 && !lineText.endsWith('.');

            const isListBullet =
              lineText.startsWith('•') ||
              lineText.startsWith('-') ||
              lineText.startsWith('*') ||
              /^\d+\.\s/.test(lineText);

            // Paragraph break criteria:
            // - Next line has large vertical gap (> 1.5x line height)
            // - Current line is a heading
            // - Current line or next line is a list item
            // - Last line on the page
            const isLastLine =
              !nextLine ||
              isHeadingCandidate ||
              isListBullet ||
              (nextLine && Math.abs(line.y - nextLine.y) > line.height * 1.55) ||
              (nextLine && Math.max(...nextLine.spans.map((s) => s.fontSize)) >= medianBodySize * 1.25);

            if (isLastLine && paragraphLines.length > 0) {
              // Assemble the full text and unified runs for this paragraph
              let fullParaText = '';
              const consolidatedRuns: { text: string; isBold: boolean; isItalic: boolean }[] = [];

              for (let plIdx = 0; plIdx < paragraphLines.length; plIdx++) {
                const pLine = paragraphLines[plIdx];
                pLine.spans.sort((a, b) => a.x - b.x);

                let lineSegment = '';
                let runBold = pLine.spans[0]?.isBold || false;
                let runItalic = pLine.spans[0]?.isItalic || false;

                for (let sIdx = 0; sIdx < pLine.spans.length; sIdx++) {
                  const span = pLine.spans[sIdx];
                  const prevSpan = pLine.spans[sIdx - 1];

                  let prefix = '';
                  if (prevSpan) {
                    const gap = span.x - (prevSpan.x + prevSpan.width);
                    if (gap > 2.0 && !lineSegment.endsWith(' ') && !span.str.startsWith(' ')) {
                      prefix = ' ';
                    }
                  }

                  if (span.isBold !== runBold || span.isItalic !== runItalic) {
                    if (lineSegment.trim().length > 0) {
                      consolidatedRuns.push({
                        text: lineSegment,
                        isBold: runBold,
                        isItalic: runItalic,
                      });
                    }
                    lineSegment = prefix + span.str;
                    runBold = span.isBold;
                    runItalic = span.isItalic;
                  } else {
                    lineSegment += prefix + span.str;
                  }
                }

                if (lineSegment.length > 0) {
                  consolidatedRuns.push({
                    text: lineSegment + (plIdx < paragraphLines.length - 1 ? ' ' : ''),
                    isBold: runBold,
                    isItalic: runItalic,
                  });
                }
              }

              fullParaText = consolidatedRuns.map((r) => r.text).join('').trim();

              if (fullParaText.length > 0) {
                const wordsCount = fullParaText.split(/\s+/).filter(Boolean).length;
                totalExtractedWords += wordsCount;

                // Determine whether this paragraph is a title/heading or body text
                const isHeading =
                  isHeadingCandidate ||
                  (paragraphLines.length === 1 &&
                    maxFontSizeOnLine >= medianBodySize * 1.25 &&
                    fullParaText.length < 80);

                let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined = undefined;
                let normalizedSize = 22; // 11pt default body size
                let targetColor = getBodyColor();

                if (isHeading) {
                  if (maxFontSizeOnLine >= medianBodySize * 1.6) {
                    headingLevel = HeadingLevel.TITLE;
                    normalizedSize = 36; // 18pt
                  } else if (maxFontSizeOnLine >= medianBodySize * 1.35) {
                    headingLevel = HeadingLevel.HEADING_1;
                    normalizedSize = 28; // 14pt
                  } else {
                    headingLevel = HeadingLevel.HEADING_2;
                    normalizedSize = 24; // 12pt
                  }
                  targetColor = getHeadingColor();
                } else if (isListBullet) {
                  normalizedSize = 22; // 11pt
                }

                // Construct clean Word TextRuns (ensuring NO color or format mix-match)
                const docxRuns = consolidatedRuns.map((r) => {
                  return new TextRun({
                    text: r.text,
                    bold: isHeading || r.isBold,
                    italics: r.isItalic,
                    size: normalizedSize,
                    color: targetColor,
                    font: 'Calibri',
                  });
                });

                docxChildren.push(
                  new Paragraph({
                    children: docxRuns,
                    heading: headingLevel,
                    spacing: {
                      before: isHeading ? 220 : 0,
                      after: isHeading ? 120 : 100,
                      line: 276, // 1.15 line pitch
                    },
                    indent: isListBullet ? { left: 400 } : undefined,
                  })
                );

                previewParagraphs.push({
                  isHeading,
                  headingLevel: isHeading ? (headingLevel === HeadingLevel.TITLE ? 1 : 2) : undefined,
                  pageNum: i,
                  text: fullParaText,
                  spans: [
                    {
                      text: fullParaText,
                      isBold: isHeading || consolidatedRuns.some((r) => r.isBold),
                      fontSize: Math.round(normalizedSize / 2),
                      color: targetColor,
                    },
                  ],
                });
              }

              paragraphLines = [];
            }
          }
        }

        // Add page break if selected
        if (conversionMode === 'page-break' && i < numPages) {
          docxChildren.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          );
        }
      }

      setProgressState({ percent: 92, stage: 'Compiling genuine Microsoft Word (.docx) package...' });

      // Build Document
      const doc = new Document({
        title: file.name.replace(/\.[^/.]+$/, ''),
        creator: 'FileWala Client-Side PDF Engine',
        description: 'Converted from PDF with true typography, unified colors and paragraph flow.',
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch = 1440 twips
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: docxChildren,
          },
        ],
      });

      const docxBlob = await Packer.toBlob(doc);
      const processingTime = Math.round(performance.now() - startTime);

      if (result?.url) revokeTrackedUrl(result.url);

      const downloadUrl = registerTrackedUrl(URL.createObjectURL(docxBlob));
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const docxFilename = `${baseName}.docx`;

      const convertedResult: ConvertedWordResult = {
        blob: docxBlob,
        url: downloadUrl,
        filename: docxFilename,
        originalSize: file.size,
        wordFileSize: docxBlob.size,
        totalPages: numPages,
        totalWords: totalExtractedWords,
        totalParagraphs: previewParagraphs.length,
        processingTimeMs: processingTime,
        paragraphsPreview: previewParagraphs,
        colorMode: colorTheme,
      };

      setResult(convertedResult);
      setProgressState(null);

      onNotify?.(
        'Word Document Ready! 📝',
        `Converted ${numPages} pages with clean formatting & colors in ${(processingTime / 1000).toFixed(1)}s.`,
        'success'
      );
    } catch (err: any) {
      console.error('Word Conversion error:', err);
      setErrorMessage(err?.message || 'Error occurred while converting PDF to Word.');
      onNotify?.('Conversion Failed', err?.message || 'Could not convert to Word.', 'error');
    } finally {
      if (ocrWorker) {
        try {
          await ocrWorker.terminate();
        } catch {
          // ignore
        }
      }
      setIsConverting(false);
      setProgressState(null);
    }
  };

  // Download DOCX
  const handleDownloadDocx = () => {
    if (!result) return;
    triggerFileDownload(result.blob, result.filename);
    onNotify?.('Download Started', `Saving ${result.filename} (${formatBytes(result.wordFileSize)})`, 'success');
  };

  // Copy Preview Text
  const handleCopyPreviewText = () => {
    if (!result) return;
    const allText = result.paragraphsPreview.map((p) => p.text).join('\n\n');
    navigator.clipboard.writeText(allText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onNotify?.('Copied to Clipboard', 'Extracted text copied.', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Tool Header (Exact UI/UX matching MergePdfTool) */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>100% Client-Side · Zero Server Uploads · Real .DOCX Output</span>
        </div>

        <h1
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}
        >
          Convert PDF to Word
        </h1>
        <p
          className={`text-xs sm:text-sm leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Transform PDF documents into editable Microsoft Word (.docx) files in seconds.
          Preserves typography, aligned paragraphs, and unified colors directly in your browser.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUCCESS & DOWNLOAD DASHBOARD (Exact UI/UX matching MergePdfTool) */}
      {result ? (
        <div
          className={`p-6 sm:p-8 rounded-lg border space-y-6 ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-white'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold">
                  Word Document Created Successfully!
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Compiled {result.totalPages} pages into genuine .docx in{' '}
                  <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                    {result.processingTimeMs}ms
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                }`}
              >
                Output: {formatBytes(result.wordFileSize)}
              </span>
            </div>
          </div>

          {/* 4-Column Metrics Summary Cards matching MergePdfTool */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3.5 rounded-md border ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Original PDF
              </div>
              <div className="text-lg font-bold font-mono mt-0.5 text-zinc-700 dark:text-zinc-300">
                {formatBytes(result.originalSize)}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-md border ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Word Document
              </div>
              <div className="text-lg font-bold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {formatBytes(result.wordFileSize)}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-md border ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Extracted Words
              </div>
              <div className="text-lg font-bold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {result.totalWords} Words
              </div>
            </div>

            <div
              className={`p-3.5 rounded-md border ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Total Pages
              </div>
              <div className="text-lg font-bold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {result.totalPages} Pages
              </div>
            </div>
          </div>

          {/* Action CTAs matching MergePdfTool */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleDownloadDocx}
              className={`w-full sm:flex-1 py-2.5 px-6 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Download Word Document ({formatBytes(result.wordFileSize)})</span>
            </button>

            <button
              onClick={() => setIsPreviewOpen(true)}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview Word Text</span>
            </button>

            <button
              onClick={() => setIsPdfPreviewOpen(true)}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Preview Source PDF</span>
            </button>

            <button
              onClick={handleReset}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                  : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Convert Another PDF</span>
            </button>
          </div>
        </div>
      ) : (
        /* WORKSPACE: DROPZONE & CONFIGURATION */
        <div className="space-y-6">
          {!file ? (
            /* Dropzone matching MergePdfTool */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group border border-dashed rounded-lg p-8 sm:p-12 text-center cursor-pointer transition-colors duration-150 select-none ${
                isDragOver
                  ? isDark
                    ? 'border-zinc-500 bg-zinc-800/40'
                    : 'border-zinc-500 bg-zinc-50'
                  : isDark
                    ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    : 'border-zinc-300 bg-white hover:border-zinc-400'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-3.5">
                <div
                  className={`w-12 h-12 rounded-md flex items-center justify-center transition-colors border ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Select PDF document or drag & drop here
                  </h3>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Converts pages into clean, editable Microsoft Word (.docx) documents. 100% processed client-side.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                    }`}
                  >
                    Browse Computer
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSamplePdf();
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Try with Sample PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Document Queue Card with Live Preview & Controls matching MergePdfTool */
            <div
              className={`p-6 rounded-lg border space-y-6 ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-zinc-200'
              }`}
            >
              {/* Document Queue Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Active Document
                  </h3>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                    }`}
                  >
                    {pageCount ? `${pageCount} Pages Total` : 'Analyzing Pages...'} · {formatBytes(file.size)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleReset}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Choose Different File</span>
                  </button>
                </div>
              </div>

              {/* Document Card Item */}
              <div
                className={`p-4 rounded-md border flex items-center justify-between gap-4 ${
                  isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-14 rounded border flex items-center justify-center shrink-0 overflow-hidden ${
                      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    {isValidating ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : fileThumbnailUrl ? (
                      <img src={fileThumbnailUrl} alt="Page 1" className="w-full h-full object-cover object-top" />
                    ) : (
                      <FileText className="w-6 h-6 text-blue-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatBytes(file.size)} · {pageCount !== null ? `${pageCount} pages` : 'Reading...'}
                      {isScannedDetected && (
                        <span className="ml-2 text-amber-500 font-medium">· Scanned PDF (OCR Ready)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPdfPreviewOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 text-blue-400'
                        : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview PDF</span>
                  </button>

                  <span
                    className={`text-[10px] font-mono px-2 py-1 rounded-full border shrink-0 ${
                      isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}
                  >
                    Ready to Convert
                  </span>
                </div>
              </div>

              {/* CONVERSION OPTIONS: Color & Formatting Quality Controls */}
              <div className="space-y-4 pt-2">
                {/* 1. Color Harmony Control (fixes user's color mix match problem) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Palette className="w-3.5 h-3.5 text-blue-400" />
                      <span>Document Typography & Color Scheme</span>
                    </label>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Fixes mismatched or jittery colors in Word
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setColorTheme('clean')}
                      className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        colorTheme === 'clean'
                          ? isDark
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'bg-zinc-50 border-zinc-900 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${colorTheme === 'clean' ? 'text-zinc-900 dark:text-zinc-100' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Clean Professional
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Recommended
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Uniform dark text (#1E293B) and crisp headings. Zero mismatched colors or random subpixel noise.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setColorTheme('accent')}
                      className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        colorTheme === 'accent'
                          ? isDark
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'bg-zinc-50 border-zinc-900 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${colorTheme === 'accent' ? 'text-zinc-900 dark:text-zinc-100' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Preserve Accents
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Stylized
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Deep Navy headings (#1E40AF) with clean body typography. Preserves document structure.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setColorTheme('monochrome')}
                      className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        colorTheme === 'monochrome'
                          ? isDark
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'bg-zinc-50 border-zinc-900 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${colorTheme === 'monochrome' ? 'text-zinc-900 dark:text-zinc-100' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Classic Monochrome
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Print
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Pure black (#000000) text throughout. Ideal for legal filings, academic papers, and print.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Flow & Pagination Mode */}
                <div className="space-y-2.5 pt-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Document Flow & Layout</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setConversionMode('flow')}
                      className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer flex items-center gap-3 ${
                        conversionMode === 'flow'
                          ? isDark
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'bg-zinc-50 border-zinc-900 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        conversionMode === 'flow' ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100' : 'border-zinc-400'
                      }`}>
                        {conversionMode === 'flow' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${conversionMode === 'flow' ? 'text-zinc-900 dark:text-zinc-100' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          Continuous Flowing Paragraphs
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Fluid text with natural spacing. Best for editing and updating in Word.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConversionMode('page-break')}
                      className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer flex items-center gap-3 ${
                        conversionMode === 'page-break'
                          ? isDark
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'bg-zinc-50 border-zinc-900 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        conversionMode === 'page-break' ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100' : 'border-zinc-400'
                      }`}>
                        {conversionMode === 'page-break' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${conversionMode === 'page-break' ? 'text-zinc-900 dark:text-zinc-100' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          Page-by-Page (With Page Breaks)
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Maintains strict page partitions matching the original PDF document.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress State */}
              {isConverting && progressState && (
                <div
                  className={`p-4 rounded-md border space-y-3 ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className={`font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                      {progressState.stage}
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{progressState.percent}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-150 rounded-full"
                      style={{ width: `${progressState.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Primary Action Button matching MergePdfTool */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecuteConvertToWord}
                  disabled={isConverting || isValidating}
                  className={`w-full py-2.5 px-6 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900'
                  }`}
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Converting PDF to Word (.docx)...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Convert to Word (.docx)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4-Step PDF to Word Workflow Guide */}
      <div
        className={`p-6 rounded-lg border space-y-4 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-500" />
          <h3
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}
          >
            How PDF to Word Conversion Works in FileWala
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            className={`p-3.5 rounded-md border ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Add PDF Document
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Drag and drop any PDF file up to 200 MB or click Browse Computer to select from your device.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-md border ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Layout & Palette
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Select continuous flowing paragraphs or page breaks, with clean uniform colors for Word.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-md border ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                100% In-Browser Engine
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Paragraphs, bold headings, and bullet lists are structured locally in RAM without server latency.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-md border ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                1-Click .DOCX Download
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Download your genuine Microsoft Word document ready to edit, copy, and share immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Feature & Privacy Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div
          className={`p-4 rounded-lg border space-y-1.5 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <div
            className={`font-semibold text-xs flex items-center gap-1.5 ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Confidential & Secure</span>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Documents remain strictly in your local memory. Never sent over the internet — compliant for contracts, business reports, and private docs.
          </p>
        </div>

        <div
          className={`p-4 rounded-lg border space-y-1.5 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <div
            className={`font-semibold text-xs flex items-center gap-1.5 ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>True Editable Paragraphs</span>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Generates real Word text elements, headings, and lists in Calibri typography — not locked screenshots or messy image scans.
          </p>
        </div>

        <div
          className={`p-4 rounded-lg border space-y-1.5 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <div
            className={`font-semibold text-xs flex items-center gap-1.5 ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span>No File Size or Count Caps</span>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Convert multi-page presentations or single-page invoices with zero paywalls, no login requirements, and no watermarks.
          </p>
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ) */}
      <div
        className={`p-6 rounded-lg border space-y-4 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-zinc-500" />
          <h3
            className={`text-sm font-semibold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            PDF to Word FAQs
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div
            className={`p-3.5 rounded-md border space-y-1 ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Will the downloaded Word (.docx) file be fully editable?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Yes! Unlike basic converters that paste pictures into Word, FileWala generates genuine editable paragraphs, headings, and text runs with Calibri font.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-md border space-y-1 ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              How is text color and font mix-matching prevented?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Our engine normalizes body text font sizes to 11pt and eliminates noisy subpixel canvas color artifacts, ensuring crisp, uniform readability throughout.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-md border space-y-1 ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Can scanned PDFs or photo documents be converted?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Yes! When a scanned or image-based PDF is detected, built-in Tesseract.js OCR automatically recognizes characters and formats them into clean paragraphs.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-md border space-y-1 ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Are my documents uploaded to any remote server?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              No. FileWala runs 100% locally on your computer inside the browser using WebAssembly and client-side JavaScript. No document data is ever transmitted to the cloud.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Client-Side Notice Footer */}
      <div
        className={`p-4 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
            : 'bg-zinc-50 border-zinc-200 text-zinc-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Zero Server Processing:</strong> Your PDF bytes never leave this browser tab. All conversion, paragraph formatting, and Word compilation run locally.
          </span>
        </div>
        <span className="font-mono text-[11px] text-zinc-500 shrink-0">100% In-Browser Privacy</span>
      </div>

      {/* TEXT PREVIEW MODAL */}
      {isPreviewOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl max-h-[85vh] rounded-lg border shadow-lg flex flex-col overflow-hidden ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold">Document Content Preview</h3>
                <span className="text-xs text-slate-400 font-mono">({result.totalWords} words)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPreviewText}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 font-sans text-sm leading-relaxed max-h-[60vh]">
              {result.paragraphsPreview.map((p, idx) => (
                <div
                  key={idx}
                  className={
                    p.isHeading
                      ? p.headingLevel === 1
                        ? 'text-lg font-bold pt-3 pb-1 text-blue-500'
                        : 'text-base font-bold pt-2 pb-0.5 text-indigo-400'
                      : isDark
                      ? 'text-slate-300'
                      : 'text-slate-700'
                  }
                >
                  {p.text}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Page {result.totalPages} pages compiled with Calibri typography
              </span>
              <button
                onClick={handleDownloadDocx}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                Download .docx
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Built-in PDF Document Preview Modal */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        isDark={isDark}
        title="PDF Document Preview"
        file={file || null}
        fileName={file?.name || 'Document.pdf'}
        fileSize={file?.size || 0}
      />
    </div>
  );
};
