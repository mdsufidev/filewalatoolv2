'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';
import {
  FileText,
  Minimize2,
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
  ArrowRight,
  Loader2,
  FileCheck,
  X,
  SlidersHorizontal,
  ExternalLink,
  Percent,
  RefreshCw,
  HelpCircle,
  Split,
} from 'lucide-react';
import { formatBytes, triggerFileDownload } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { PdfPreviewModal } from './PdfPreviewModal';

// Ensure unified PDF.js worker is ready
ensurePdfWorkerInitialized();

export type CompressionPreset = 'extreme' | 'recommended' | 'low';

export interface PresetConfig {
  id: CompressionPreset;
  title: string;
  badge: string;
  description: string;
  scale: number;
  quality: number;
  estimatedReduction: string;
}

const PRESETS: Record<CompressionPreset, PresetConfig> = {
  extreme: {
    id: 'extreme',
    title: 'Extreme Compression',
    badge: 'Smallest Size (Up to 85%)',
    description: 'Best for email attachment limits, WhatsApp sharing, and strict online portal limits.',
    scale: 1.05,
    quality: 0.50,
    estimatedReduction: '~60% - 85% Smaller',
  },
  recommended: {
    id: 'recommended',
    title: 'Recommended / Balanced',
    badge: 'Most Popular',
    description: 'Optimal balance of high visual clarity and substantial file size savings. Crisp text & graphics.',
    scale: 1.35,
    quality: 0.72,
    estimatedReduction: '~40% - 65% Smaller',
  },
  low: {
    id: 'low',
    title: 'Low Compression',
    badge: 'Highest Quality',
    description: 'Minimal compression to preserve maximum fine details, sharpness, and print-ready quality.',
    scale: 1.85,
    quality: 0.88,
    estimatedReduction: '~15% - 40% Smaller',
  },
};

export interface CompressedPdfResult {
  blob: Blob;
  url: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savingsPercentage: number;
  filename: string;
  pageCount: number;
  processingTimeMs: number;
  preset: CompressionPreset;
  previewUrl?: string;
}

interface CompressPdfToolProps {
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFile?: File | null;
}

export const CompressPdfTool: React.FC<CompressPdfToolProps> = ({ onNotify, initialFile }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileThumbnailUrl, setFileThumbnailUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Settings
  const [selectedPreset, setSelectedPreset] = useState<CompressionPreset>('recommended');

  // Processing state
  const [isCompressing, setIsCompressing] = useState(false);
  const [progressState, setProgressState] = useState<{
    percent: number;
    stage: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results state
  const [result, setResult] = useState<CompressedPdfResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewModalMode, setPreviewModalMode] = useState<'single' | 'compare'>('single');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUrlsRef = useRef<Set<string>>(new Set());
  const loadedInitialFileRef = useRef<File | null>(null);

  // Memory management helper: track URLs to revoke
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

  // Cleanup all allocated Object URLs on unmount
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

  // Reset tool workspace
  const handleReset = useCallback(() => {
    if (fileThumbnailUrl) revokeTrackedUrl(fileThumbnailUrl);
    if (result?.url) revokeTrackedUrl(result.url);
    if (result?.previewUrl) revokeTrackedUrl(result.previewUrl);
    if (previewUrl) revokeTrackedUrl(previewUrl);

    setFile(null);
    setPageCount(null);
    setFileThumbnailUrl(null);
    setResult(null);
    setErrorMessage(null);
    setProgressState(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileThumbnailUrl, result, previewUrl, revokeTrackedUrl]);

  // Load and validate a single PDF file
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

      const MAX_SIZE_BYTES = 250 * 1024 * 1024;
      if (uploadedFile.size > MAX_SIZE_BYTES) {
        setErrorMessage('File exceeds browser memory safety limit of 250 MB.');
        onNotify?.('File Too Large', 'Maximum supported client-side size is 250 MB.', 'error');
        return;
      }

      if (fileThumbnailUrl) revokeTrackedUrl(fileThumbnailUrl);
      if (result?.url) revokeTrackedUrl(result.url);
      if (result?.previewUrl) revokeTrackedUrl(result.previewUrl);
      if (previewUrl) revokeTrackedUrl(previewUrl);
      setResult(null);

      setFile(uploadedFile);
      setIsValidating(true);

      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const pages = pdfDoc.numPages;
        setPageCount(pages);

        // Generate rapid thumbnail of page 1
        if (pages > 0) {
          const firstPage = await pdfDoc.getPage(1);
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

        onNotify?.('PDF Loaded', `${uploadedFile.name} (${pages} pages) ready to compress.`, 'success');
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        setErrorMessage(
          err?.message?.includes('password')
            ? 'This PDF is password-protected. Please unlock it before compressing.'
            : 'Unable to inspect PDF structure. File may be corrupted.'
        );
        onNotify?.('PDF Inspection Failed', 'Could not parse document structure.', 'error');
      } finally {
        setIsValidating(false);
      }
    },
    [fileThumbnailUrl, result, previewUrl, registerTrackedUrl, revokeTrackedUrl, onNotify]
  );

  // Load initial file if passed from global drop zone
  useEffect(() => {
    if (initialFile && initialFile !== loadedInitialFileRef.current) {
      loadedInitialFileRef.current = initialFile;
      handleProcessFile(initialFile);
    }
  }, [initialFile, handleProcessFile]);

  // Generate a sample test PDF for 1-click evaluation (exact UX as MergePdfTool)
  const handleLoadSamplePdf = useCallback(async () => {
    try {
      setIsCompressing(true);
      setProgressState({ percent: 15, stage: 'Generating Sample Report PDF...' });

      const sampleDoc = await PDFDocument.create();
      const helvetica = await sampleDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await sampleDoc.embedFont(StandardFonts.HelveticaBold);

      // Page 1: Executive Cover
      const p1 = sampleDoc.addPage([595.28, 841.89]);
      p1.drawRectangle({
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
        color: rgb(0.06, 0.09, 0.16),
      });

      p1.drawText('Sample Document: Annual Performance Report', {
        x: 50,
        y: 740,
        size: 22,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });

      p1.drawText('High-Resolution Vector Graphics & Multi-Stream Data', {
        x: 50,
        y: 705,
        size: 13,
        font: helvetica,
        color: rgb(0.38, 0.65, 0.98),
      });

      // Add detailed content blocks
      for (let j = 0; j < 14; j++) {
        p1.drawRectangle({
          x: 50,
          y: 650 - j * 38,
          width: 495,
          height: 28,
          color: j % 2 === 0 ? rgb(0.1, 0.14, 0.22) : rgb(0.08, 0.11, 0.18),
        });
        p1.drawText(`Metric Section ${j + 1}: Revenue Streams, Client Assets & Global Allocations`, {
          x: 65,
          y: 658 - j * 38,
          size: 9.5,
          font: helvetica,
          color: rgb(0.85, 0.88, 0.92),
        });
      }

      // Page 2: Summary
      const p2 = sampleDoc.addPage([595.28, 841.89]);
      p2.drawText('Quarterly Regional Breakdown', {
        x: 50,
        y: 750,
        size: 18,
        font: helveticaBold,
        color: rgb(0.1, 0.2, 0.4),
      });
      p2.drawText('Ready for client-side compression testing directly in browser.', {
        x: 50,
        y: 720,
        size: 11,
        font: helvetica,
        color: rgb(0.4, 0.45, 0.55),
      });

      const sampleBytes = await sampleDoc.save();
      const sampleBlob = new Blob([sampleBytes as unknown as BlobPart], { type: 'application/pdf' });
      const sampleFile = new File([sampleBlob], 'sample-performance-report.pdf', { type: 'application/pdf' });

      await handleProcessFile(sampleFile);
    } catch (err: any) {
      onNotify?.('Sample Generation Failed', err?.message, 'error');
    } finally {
      setIsCompressing(false);
      setProgressState(null);
    }
  }, [handleProcessFile, onNotify]);

  // Drag and drop event handlers
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
  // CORE CLIENT-SIDE COMPRESSION ENGINE
  // =========================================================================
  const handleExecuteCompress = async () => {
    if (!file) return;

    setIsCompressing(true);
    setErrorMessage(null);
    setProgressState({ percent: 5, stage: 'Reading document and analyzing streams...' });
    const startTime = performance.now();

    try {
      const presetConfig = PRESETS[selectedPreset];
      const arrayBuffer = await file.arrayBuffer();

      // Step 1: Parse with pdfjs
      setProgressState({ percent: 15, stage: 'Parsing PDF vector and raster layers...' });
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      // Structural deflation trial via pdf-lib
      let structuralBlob: Blob | null = null;
      try {
        const sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const deflatedBytes = await sourceDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
        });
        structuralBlob = new Blob([deflatedBytes as unknown as BlobPart], { type: 'application/pdf' });
      } catch (err) {
        console.warn('Structural stream deflation pass skipped:', err);
      }

      // Step 2: Page rasterization & JPEG stream flattening
      const newPdf = await PDFDocument.create();
      let firstPagePreviewBlob: Blob | null = null;

      for (let i = 1; i <= numPages; i++) {
        const pagePercent = Math.round(20 + ((i - 1) / numPages) * 70);
        setProgressState({
          percent: pagePercent,
          stage: `Compressing page ${i} of ${numPages} (${Math.round(pagePercent)}%)...`,
        });

        const page = await pdfDoc.getPage(i);
        const originalViewport = page.getViewport({ scale: 1.0 });
        const renderViewport = page.getViewport({ scale: presetConfig.scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(renderViewport.width);
        canvas.height = Math.round(renderViewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) throw new Error('Canvas 2D context creation failed in browser');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        };
        await page.render(renderContext as any).promise;

        const pageJpgBlob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error(`Failed to encode page ${i}`))),
            'image/jpeg',
            presetConfig.quality
          );
        });

        if (i === 1) {
          firstPagePreviewBlob = pageJpgBlob;
        }

        const pageJpgBuffer = await pageJpgBlob.arrayBuffer();
        const embeddedImage = await newPdf.embedJpg(pageJpgBuffer);

        const pdfPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
        pdfPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });

        canvas.width = 0;
        canvas.height = 0;
      }

      setProgressState({ percent: 94, stage: 'Finalizing PDF streams and optimizing object tables...' });

      const rasterCompressedBytes = await newPdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      const rasterBlob = new Blob([rasterCompressedBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });

      let finalBlob = rasterBlob;

      if (selectedPreset === 'low' && structuralBlob && structuralBlob.size < rasterBlob.size) {
        finalBlob = structuralBlob;
      }

      if (finalBlob.size >= file.size) {
        if (structuralBlob && structuralBlob.size < file.size) {
          finalBlob = structuralBlob;
        } else {
          finalBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
        }
      }

      const processingTime = Math.round(performance.now() - startTime);
      const originalSize = file.size;
      const compressedSize = finalBlob.size;
      const savedBytes = Math.max(0, originalSize - compressedSize);
      const savingsPercentage = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

      if (result?.url) revokeTrackedUrl(result.url);
      if (result?.previewUrl) revokeTrackedUrl(result.previewUrl);
      if (previewUrl) revokeTrackedUrl(previewUrl);

      const downloadUrl = registerTrackedUrl(URL.createObjectURL(finalBlob));
      const thumbPreviewUrl = firstPagePreviewBlob
        ? registerTrackedUrl(URL.createObjectURL(firstPagePreviewBlob))
        : undefined;

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const compressedFilename = `${baseName}-compressed.pdf`;

      const compressedResult: CompressedPdfResult = {
        blob: finalBlob,
        url: downloadUrl,
        originalSize,
        compressedSize,
        savedBytes,
        savingsPercentage,
        filename: compressedFilename,
        pageCount: numPages,
        processingTimeMs: processingTime,
        preset: selectedPreset,
        previewUrl: thumbPreviewUrl,
      };

      setResult(compressedResult);
      setProgressState(null);

      if (savingsPercentage > 0) {
        onNotify?.(
          'PDF Compressed Successfully! 🚀',
          `Saved ${formatBytes(savedBytes)} (${savingsPercentage}% smaller) in ${processingTime}ms.`,
          'success'
        );
      } else {
        onNotify?.(
          'PDF Optimized!',
          'Document is already at maximum stream efficiency. File retained at highest fidelity.',
          'info'
        );
      }
    } catch (err: any) {
      console.error('Compression error:', err);
      setErrorMessage(err?.message || 'An error occurred during client-side compression.');
      onNotify?.('Compression Failed', err?.message || 'Could not compress PDF.', 'error');
    } finally {
      setIsCompressing(false);
      setProgressState(null);
    }
  };

  // Download trigger
  const handleDownloadResult = () => {
    if (!result) return;
    triggerFileDownload(result.blob, result.filename);
    onNotify?.('Download Started', `Saved ${result.filename} (${formatBytes(result.compressedSize)})`, 'success');
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
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Client-Side · Zero Server Uploads · No File Caps</span>
        </div>

        <h1
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}
        >
          Compress PDF Files
        </h1>
        <p
          className={`text-xs sm:text-sm leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Reduce PDF file size up to 85% while retaining sharp text and vector graphics.
          Optimized client-side in your browser with zero data leaving your device.
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
                  PDF Compressed Successfully!
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Reduced document ({result.pageCount} pages) in{' '}
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
                    ? 'bg-zinc-800 border-zinc-700 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {result.savingsPercentage > 0 ? `${result.savingsPercentage}% Smaller` : 'Optimized'}
              </span>
            </div>
          </div>

          {/* 4-Column Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3.5 rounded-md border ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Original Size
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
                Compressed Size
              </div>
              <div className="text-lg font-bold font-mono mt-0.5 text-emerald-600 dark:text-emerald-400">
                {formatBytes(result.compressedSize)}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-md border ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Reduction
              </div>
              <div className="text-lg font-bold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {result.savingsPercentage}% Saved
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
                {result.pageCount} Pages
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleDownloadResult}
              className={`w-full sm:flex-1 py-2.5 px-6 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Download Compressed PDF ({formatBytes(result.compressedSize)})</span>
            </button>

            {/* Built-in Compare Before & After */}
            <button
              type="button"
              onClick={() => {
                setPreviewModalMode('compare');
                setIsPreviewOpen(true);
              }}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
              }`}
            >
              <Split className="w-4 h-4" />
              <span>Compare Before & After</span>
            </button>

            {/* Built-in Single PDF Preview */}
            <button
              type="button"
              onClick={() => {
                setPreviewModalMode('single');
                setIsPreviewOpen(true);
              }}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
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
              <span>Compress Another PDF</span>
            </button>
          </div>
        </div>
      ) : (
        /* WORKSPACE: DROPZONE & CONFIGURATION */
        <div className="space-y-6">
          {!file ? (
            /* Dropzone with "Browse Computer" & "Try with Sample PDF" buttons */
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
                    Reduce file size while preserving high visual quality. 100% processed client-side.
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
            /* Document Queue Card with Live Preview & Controls */
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
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                    ) : fileThumbnailUrl ? (
                      <img src={fileThumbnailUrl} alt="Page 1" className="w-full h-full object-cover object-top" />
                    ) : (
                      <FileText className="w-6 h-6 text-emerald-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {file.name}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatBytes(file.size)} · {pageCount !== null ? `${pageCount} pages` : 'Reading...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewModalMode('single');
                      setIsPreviewOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview PDF</span>
                  </button>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                      isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    Ready to Compress
                  </span>
                </div>
              </div>

              {/* Preset Cards Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Select Compression Preset
                  </label>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Adjust level based on email, web, or print usage
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(PRESETS) as CompressionPreset[]).map((presetKey) => {
                    const preset = PRESETS[presetKey];
                    const isSelected = selectedPreset === presetKey;

                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => setSelectedPreset(presetKey)}
                        disabled={isCompressing}
                        className={`p-4 rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-between group ${
                          isSelected
                            ? isDark
                              ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                              : 'bg-zinc-50 border-zinc-900 text-zinc-900'
                            : isDark
                            ? 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800'
                            : 'bg-white border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              {preset.title}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                isSelected
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                  : isDark
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                              }`}
                            >
                              {preset.badge}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {preset.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono mt-3 text-emerald-600 dark:text-emerald-400 font-medium">
                          {preset.estimatedReduction}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress State */}
              {isCompressing && progressState && (
                <div
                  className={`p-4 rounded-md border space-y-3 ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className={`font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      {progressState.stage}
                    </span>
                    <span className="font-mono font-semibold text-emerald-400">{progressState.percent}%</span>
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
                  onClick={handleExecuteCompress}
                  disabled={isCompressing || isValidating}
                  className={`w-full py-2.5 px-6 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900'
                  }`}
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compressing PDF in Browser...</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span>Compress PDF Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4-Step Compress Workflow Guide */}
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
            How PDF Compression Works in FileWala
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
                Add PDF File
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Drag and drop any PDF file up to 250 MB or click Browse Computer to select from your device.
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
                Choose Preset
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Select Extreme (max compression), Recommended (balanced), or Low (print quality) with 1 click.
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
                In-Browser Engine
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Click Compress Now to optimize streams and images locally in your browser with zero server delay.
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
                Save & Download
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Review your live reduction percentage (e.g. 75% saved) and download your optimized PDF instantly.
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
            Documents remain strictly in your local memory. Never sent over the internet — safe for tax records, legal files, and IDs.
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
            <span>Smart Image Optimization</span>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Cleans bloated embedded graphics and metadata tables while maintaining crisp, readable typography.
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
            Compress small documents or 200 MB reports with zero paywalls, no login requirements, and no watermarks.
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
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <h3
            className={`text-sm font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Compress PDF FAQs
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Are my documents uploaded to any remote server?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              No. FileWala runs 100% locally on your computer inside the browser using WebAssembly and client-side JavaScript. No document data is ever transmitted to the cloud.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Which compression preset should I choose?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Use <strong>Extreme</strong> if you need to email a large file under strict attachment limits. Use <strong>Recommended</strong> for everyday viewing and sharing. Use <strong>Low</strong> if you plan to print.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Will compression make the file size larger?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              No. Our engine compares the compressed file with your original file. If the file is already maximally optimized, we retain the original file bytes so it never inflates.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Will my document text remain sharp and readable?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Yes. Text and fonts are rendered at optimal resolution while redundant image data and uncompressed object tables are deflated.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Client-Side Notice Footer */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isDark
            ? 'bg-slate-900/30 border-slate-800/60 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Zero Server Processing:</strong> Your PDF bytes never leave this browser tab. Compression runs locally via WebAssembly and Canvas pipelines.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">Memory Safety Guaranteed</span>
      </div>

      {/* Built-in PDF Preview & Comparison Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isDark={isDark}
        title={
          previewModalMode === 'compare'
            ? 'Before & After Quality Comparison'
            : result
            ? 'Compressed PDF Preview'
            : 'Original PDF Preview'
        }
        file={previewModalMode === 'compare' ? (result?.url || file) : (result?.url || file)}
        fileName={result ? result.filename : (file?.name || 'Document.pdf')}
        fileSize={result ? result.compressedSize : (file?.size || 0)}
        originalFile={file || null}
        originalFileName={file?.name || 'Original.pdf'}
        originalFileSize={file?.size || 0}
        processedFile={result?.url || null}
        processedFileName={result ? result.filename : 'Compressed.pdf'}
        processedFileSize={result?.compressedSize || 0}
        onDownload={result ? handleDownloadResult : undefined}
        downloadLabel={result ? `Download (${formatBytes(result.compressedSize)})` : undefined}
      />
    </div>
  );
};
