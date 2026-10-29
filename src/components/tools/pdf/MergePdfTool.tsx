'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  Plus,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  Layers,
  ShieldCheck,
  ArrowUpDown,
  FileCheck,
  X,
  ExternalLink,
  SlidersHorizontal,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { formatBytes, triggerFileDownload } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { Dropzone } from '../../ui/Dropzone';
import { PdfPreviewModal } from './PdfPreviewModal';
import { PdfToolGuideSection } from './PdfToolGuideSection';

export interface MergePdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

export interface MergedPdfResult {
  blob: Blob;
  url: string;
  size: number;
  filename: string;
  pageCount: number;
  filesMergedCount: number;
  originalTotalBytes: number;
  processingTimeMs: number;
}

interface MergePdfToolProps {
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFiles?: File[] | null;
}

export const MergePdfTool: React.FC<MergePdfToolProps> = ({ onNotify, initialFiles }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // File queue state
  const [files, setFiles] = useState<MergePdfFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Configuration state
  const [outputFilename, setOutputFilename] = useState('merged-document.pdf');

  // Processing state
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<{
    current: number;
    total: number;
    stage: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [mergedResult, setMergedResult] = useState<MergedPdfResult | null>(null);

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<{
    file: File | string | null;
    name: string;
    size?: number;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // File inputs refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Track active object URLs to prevent memory leaks
  const activeUrlsRef = useRef<Set<string>>(new Set());

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

  // Revoke all URLs on unmount
  useEffect(() => {
    const trackedUrls = activeUrlsRef.current;
    return () => {
      trackedUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      trackedUrls.clear();
    };
  }, []);

  // Inspect page counts asynchronously using pdf-lib
  const inspectPdfPageCount = useCallback(async (file: File): Promise<number | null> => {
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch {
      return null;
    }
  }, []);

  // Process incoming files
  const handleAddFiles = useCallback(
    async (incoming: FileList | File[]) => {
      setErrorMessage(null);
      const fileList = Array.from(incoming);

      if (fileList.length === 0) return;

      const pdfFiles: File[] = [];
      const invalidFiles: string[] = [];

      for (const file of fileList) {
        const isPdf =
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          pdfFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      }

      if (invalidFiles.length > 0) {
        const msg = `Skipped ${invalidFiles.length} non-PDF file(s): ${invalidFiles.slice(0, 3).join(', ')}${
          invalidFiles.length > 3 ? '...' : ''
        }`;
        onNotify?.('Non-PDF Files Ignored', msg, 'info');
      }

      if (pdfFiles.length === 0) {
        if (invalidFiles.length > 0) {
          setErrorMessage('Please upload valid .pdf documents.');
        }
        return;
      }

      // Check file size (warn on 100MB+ per file)
      const oversized = pdfFiles.filter((f) => f.size > 100 * 1024 * 1024);
      if (oversized.length > 0) {
        onNotify?.(
          'Large PDF Detected',
          `${oversized[0].name} exceeds 100MB. Processing may take longer.`,
          'info'
        );
      }

      // Generate items with loading status
      const newItems: MergePdfFileItem[] = pdfFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        pageCount: null,
        status: 'loading',
      }));

      setFiles((prev) => [...prev, ...newItems]);
      onNotify?.('Added to Merge Queue', `Added ${newItems.length} document(s).`, 'info');

      // Asynchronously resolve page count for each new item
      newItems.forEach(async (item) => {
        const count = await inspectPdfPageCount(item.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  pageCount: count,
                  status: count !== null ? 'ready' : 'ready',
                }
              : f
          )
        );
      });
    },
    [inspectPdfPageCount, onNotify]
  );

  // Load initial files if passed from global drop zone
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleAddFiles(initialFiles);
    }
  }, [initialFiles, handleAddFiles]);

  // Generate 2 sample test PDFs in-memory for instant 1-click evaluation
  const handleLoadSamplePdfs = useCallback(async () => {
    try {
      setIsMerging(true);
      setMergeProgress({ current: 1, total: 2, stage: 'Generating Sample PDF #1...' });

      // Sample 1: Annual Report Cover & Summary (2 pages)
      const doc1 = await PDFDocument.create();
      const helvetica = await doc1.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await doc1.embedFont(StandardFonts.HelveticaBold);

      const p1 = doc1.addPage([600, 400]);
      p1.drawRectangle({
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        color: rgb(0.06, 0.09, 0.16),
      });
      p1.drawText('Sample Document 1: Project Overview', {
        x: 50,
        y: 280,
        size: 22,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      p1.drawText('Generated client-side inside browser via FileWala PDF Engine', {
        x: 50,
        y: 240,
        size: 13,
        font: helvetica,
        color: rgb(0.58, 0.64, 0.72),
      });
      p1.drawText('Page 1 of 2 · Confidential Internal Record', {
        x: 50,
        y: 60,
        size: 10,
        font: helvetica,
        color: rgb(0.38, 0.44, 0.52),
      });

      const p2 = doc1.addPage([600, 400]);
      p2.drawRectangle({
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        color: rgb(0.08, 0.11, 0.18),
      });
      p2.drawText('Financial Summary & Key Performance Metrics', {
        x: 50,
        y: 300,
        size: 18,
        font: helveticaBold,
        color: rgb(0.38, 0.72, 1.0),
      });
      p2.drawText('• Metric Alpha: 99.8% Client-Side Uptime\n• Zero Network Traffic: 100% In-Browser Privacy\n• High-Fidelity Vector & Font Preservations', {
        x: 50,
        y: 230,
        size: 12,
        font: helvetica,
        color: rgb(0.85, 0.88, 0.92),
        lineHeight: 22,
      });

      const bytes1 = await doc1.save();
      const file1 = new File([bytes1 as unknown as BlobPart], 'Sample-1-Project-Overview.pdf', {
        type: 'application/pdf',
      });

      setMergeProgress({ current: 2, total: 2, stage: 'Generating Sample PDF #2...' });

      // Sample 2: Certificate of Completion (1 page)
      const doc2 = await PDFDocument.create();
      const doc2Font = await doc2.embedFont(StandardFonts.HelveticaBold);
      const doc2Sub = await doc2.embedFont(StandardFonts.Helvetica);

      const p3 = doc2.addPage([600, 400]);
      p3.drawRectangle({
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        color: rgb(0.04, 0.06, 0.12),
      });
      p3.drawText('Sample Document 2: Certificate of Audit', {
        x: 50,
        y: 280,
        size: 22,
        font: doc2Font,
        color: rgb(0.32, 0.84, 0.53),
      });
      p3.drawText('Zero Server Storage · Validated for Instant Merge Test', {
        x: 50,
        y: 240,
        size: 13,
        font: doc2Sub,
        color: rgb(0.68, 0.74, 0.82),
      });
      p3.drawText('Authorized by FileWala PDF Engine · 100% Client Memory Safe', {
        x: 50,
        y: 60,
        size: 10,
        font: doc2Sub,
        color: rgb(0.38, 0.44, 0.52),
      });

      const bytes2 = await doc2.save();
      const file2 = new File([bytes2 as unknown as BlobPart], 'Sample-2-Audit-Certificate.pdf', {
        type: 'application/pdf',
      });

      setIsMerging(false);
      setMergeProgress(null);

      // Add to file queue
      handleAddFiles([file1, file2]);
      onNotify?.('Sample PDFs Ready', 'Loaded 2 test documents. Ready to merge!', 'success');
    } catch (err: any) {
      setIsMerging(false);
      setMergeProgress(null);
      onNotify?.('Error', err?.message || 'Could not create sample PDFs', 'error');
    }
  }, [handleAddFiles, onNotify]);

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
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Reordering handlers
  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleReverseOrder = () => {
    setFiles((prev) => [...prev].reverse());
    onNotify?.('Order Reversed', 'PDF documents queue inverted.', 'info');
  };

  const handleSortAlphabetical = () => {
    setFiles((prev) =>
      [...prev].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
    );
    onNotify?.('Sorted A-Z', 'Documents sorted alphabetically.', 'info');
  };

  const handleClearAll = () => {
    setFiles([]);
    setErrorMessage(null);
  };

  // Execute PDF Merge via pdf-lib
  const handleExecuteMerge = async () => {
    if (files.length < 2) {
      const msg = 'Please add at least 2 PDF documents to merge.';
      setErrorMessage(msg);
      onNotify?.('Minimum 2 Files Required', msg, 'error');
      return;
    }

    setErrorMessage(null);
    setIsMerging(true);
    const startTime = performance.now();

    try {
      // 1. Create a blank target PDF document
      const mergedPdf = await PDFDocument.create();

      // Set clean document metadata
      const cleanTitle = (outputFilename || 'merged-document.pdf').replace(/\.pdf$/i, '');
      mergedPdf.setTitle(cleanTitle);
      mergedPdf.setProducer('FileWala Client-Side PDF Suite');
      mergedPdf.setCreator('FileWala Tool (100% In-Browser Engine)');

      let totalPagesCount = 0;
      const totalOriginalBytes = files.reduce((acc, curr) => acc + curr.size, 0);

      // 2. Iterate each file and copy all pages
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setMergeProgress({
          current: i + 1,
          total: files.length,
          stage: `Processing (${i + 1}/${files.length}): ${item.name}...`,
        });

        // Read ArrayBuffer
        const buffer = await item.file.arrayBuffer();

        // Load document
        const sourceDoc = await PDFDocument.load(buffer, {
          ignoreEncryption: true,
        });

        // Copy all pages
        const pageIndices = sourceDoc.getPageIndices();
        totalPagesCount += pageIndices.length;

        const copiedPages = await mergedPdf.copyPages(sourceDoc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      setMergeProgress({
        current: files.length,
        total: files.length,
        stage: 'Finalizing and compiling document stream...',
      });

      // 3. Save merged PDF with object stream compression
      const mergedBytes = await mergedPdf.save({
        useObjectStreams: true,
      });

      const elapsedMs = Math.round(performance.now() - startTime);

      // 4. Create safe Blob & Object URL
      const blob = new Blob([mergedBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });

      // Revoke prior result URL if any
      if (mergedResult?.url) {
        revokeTrackedUrl(mergedResult.url);
      }

      const safeUrl = registerTrackedUrl(URL.createObjectURL(blob));

      const finalName = outputFilename.trim().toLowerCase().endsWith('.pdf')
        ? outputFilename.trim()
        : `${outputFilename.trim() || 'merged-document'}.pdf`;

      const result: MergedPdfResult = {
        blob,
        url: safeUrl,
        size: blob.size,
        filename: finalName,
        pageCount: totalPagesCount,
        filesMergedCount: files.length,
        originalTotalBytes: totalOriginalBytes,
        processingTimeMs: elapsedMs,
      };

      setMergedResult(result);
      setIsMerging(false);
      setMergeProgress(null);

      onNotify?.(
        'PDFs Merged Successfully!',
        `Combined ${files.length} documents (${totalPagesCount} total pages) in ${elapsedMs}ms.`,
        'success'
      );
    } catch (err: any) {
      setIsMerging(false);
      setMergeProgress(null);
      const errMsg =
        err?.message ||
        'Failed to merge PDF documents. One of the files might be corrupted or password-protected.';
      setErrorMessage(errMsg);
      onNotify?.('Merge Failed', errMsg, 'error');
    }
  };

  // Download Trigger
  const handleDownload = () => {
    if (!mergedResult) return;
    triggerFileDownload(mergedResult.blob, mergedResult.filename);
    onNotify?.(
      'Download Started',
      `Saved ${mergedResult.filename} (${formatBytes(mergedResult.size)})`,
      'success'
    );
  };

  // Reset to merge another set
  const handleResetForNewSet = () => {
    if (mergedResult?.url) {
      revokeTrackedUrl(mergedResult.url);
    }
    setMergedResult(null);
    setFiles([]);
    setErrorMessage(null);
    setOutputFilename('merged-document.pdf');
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (files.length > 0 || mergedResult) {
          e.preventDefault();
          handleResetForNewSet();
          onNotify?.('Reset', 'Cleared PDF queue.', 'info');
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (mergedResult) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (files.length >= 2 && !mergedResult) {
          e.preventDefault();
          handleExecuteMerge();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [files.length, mergedResult, handleDownload, handleExecuteMerge, onNotify]);

  // Calculate queue statistics
  const totalQueueSize = files.reduce((acc, f) => acc + f.size, 0);
  const totalKnownPages = files.reduce((acc, f) => acc + (f.pageCount || 0), 0);
  const allPagesResolved = files.every((f) => f.pageCount !== null);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Merge PDF Files
          </h1>
          <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline-block">
            100% In-Browser · Fast & Private
          </span>
        </div>

        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
              {files.length} Files · {allPagesResolved ? `${totalKnownPages} Pages` : 'Calculating...'}
            </span>
          )}
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" />
            <span>Zero Uploads</span>
          </span>
        </div>
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
            className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUCCESS & DOWNLOAD DASHBOARD */}
      {mergedResult ? (
        <div
          className={`p-5 sm:p-6 rounded-lg border space-y-5 ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  PDF Documents Merged Successfully!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Compiled {mergedResult.filesMergedCount} documents ({mergedResult.pageCount} pages) in{' '}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {mergedResult.processingTimeMs}ms
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                Output: {formatBytes(mergedResult.size)}
              </span>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Documents
              </div>
              <div className="text-base font-semibold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {mergedResult.filesMergedCount} Files
              </div>
            </div>

            <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Total Pages
              </div>
              <div className="text-base font-semibold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {mergedResult.pageCount} Pages
              </div>
            </div>

            <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Combined Input
              </div>
              <div className="text-base font-semibold font-mono mt-0.5 text-zinc-900 dark:text-zinc-100">
                {formatBytes(mergedResult.originalTotalBytes)}
              </div>
            </div>

            <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                Final File Size
              </div>
              <div className="text-base font-semibold font-mono mt-0.5 text-emerald-600 dark:text-emerald-400">
                {formatBytes(mergedResult.size)}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleDownload}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white"
            >
              <Download className="w-4 h-4" />
              <span>Download Merged PDF ({formatBytes(mergedResult.size)})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewItem({
                  file: mergedResult.url,
                  name: mergedResult.filename,
                  size: mergedResult.size,
                });
                setIsPreviewOpen(true);
              }}
              className="w-full sm:w-auto py-2.5 px-3.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            <button
              onClick={handleResetForNewSet}
              className="w-full sm:w-auto py-2.5 px-3.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Merge Another</span>
            </button>
          </div>
        </div>
      ) : (
        /* WORKSPACE: DROPZONE & QUEUE MANAGEMENT */
        <div className="space-y-6">
          {files.length === 0 ? (
            <div className="max-w-[700px] mx-auto">
              <Dropzone
                onFilesSelected={(files: File[]) => handleAddFiles(files)}
                multiple
                accept="application/pdf,.pdf"
                title="Select PDF Files to Merge"
                description="Drag & drop or click to browse. Select 2 or more PDF documents."
                className="h-[230px] sm:h-[260px] lg:h-[280px]"
              />
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-2.5 sm:p-3 text-center cursor-pointer transition-colors duration-150 select-none ${
                isDragOver
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100/50 dark:bg-zinc-800/50'
                  : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddFiles(e.target.files);
                }}
              />

              <div className="flex items-center justify-center gap-3">
                <UploadCloud className="w-5 h-5 text-zinc-500" />
                <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  Drop more PDF documents here or click to browse
                </span>
              </div>
            </div>
          )}

          {/* DOCUMENT QUEUE & REORDERING LIST */}
          {files.length > 0 && (
            <div
              className={`p-5 rounded-lg border space-y-4 ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-zinc-200'
              }`}
            >
              {/* Queue Header & Fast Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                  <h3
                    className={`text-sm font-semibold tracking-tight ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}
                  >
                    Merge Sequence ({files.length} documents)
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded border bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                    {allPagesResolved ? `${totalKnownPages} Pages Total` : 'Analyzing Pages...'} ·{' '}
                    {formatBytes(totalQueueSize)}
                  </span>
                </div>

                {/* Queue Tools */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleAddFiles(e.target.files);
                    }}
                  />
                  <button
                    onClick={() => addMoreInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>

                  <button
                    onClick={handleReverseOrder}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    title="Reverse current sequence"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Reverse</span>
                  </button>

                  <button
                    onClick={handleSortAlphabetical}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    title="Sort files A-Z"
                  >
                    <span>Sort A-Z</span>
                  </button>

                  <button
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-transparent transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1">
                {files.map((item, index) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between gap-3 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    {/* Index & File metadata */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded text-xs font-mono font-medium flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        #{index + 1}
                      </span>

                      <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <FileText className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs sm:text-sm font-medium truncate ${
                              isDark ? 'text-zinc-100' : 'text-zinc-900'
                            }`}
                            title={item.name}
                          >
                            {item.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5 text-zinc-500 dark:text-zinc-400">
                          <span>{formatBytes(item.size)}</span>
                          <span>·</span>
                          <span>
                            {item.pageCount !== null
                              ? `${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}`
                              : 'counting...'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reordering, Preview & Delete Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewItem({
                            file: item.file,
                            name: item.name,
                            size: item.size,
                          });
                          setIsPreviewOpen(true);
                        }}
                        aria-label={`Preview ${item.name}`}
                        className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer mr-0.5"
                        title="Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === 0}
                        onClick={() => handleMoveFile(index, 'up')}
                        aria-label={`Move ${item.name} up`}
                        className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        disabled={index === files.length - 1}
                        onClick={() => handleMoveFile(index, 'down')}
                        aria-label={`Move ${item.name} down`}
                        className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRemoveFile(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* MERGE CONFIGURATION PANEL */}
              <div
                className={`pt-4 mt-4 border-t space-y-4 ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-8 space-y-1.5">
                    <label
                      htmlFor="output-filename"
                      className={`text-xs font-semibold ${
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      Output PDF Filename
                    </label>
                    <div className="relative">
                      <input
                        id="output-filename"
                        type="text"
                        value={outputFilename}
                        onChange={(e) => setOutputFilename(e.target.value)}
                        placeholder="merged-document.pdf"
                        className={`w-full px-3 py-2 rounded-md text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
                          isDark
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-600'
                            : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                        }`}
                      />
                      <span className="absolute right-3 top-2 text-xs text-zinc-400 font-mono pointer-events-none">
                        .pdf
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      disabled={files.length < 2 || isMerging}
                      onClick={handleExecuteMerge}
                      className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMerging ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Merging PDFs...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Merge {files.length} PDFs Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Processing Progress Feedback */}
                {isMerging && mergeProgress && (
                  <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{mergeProgress.stage}</span>
                      <span className="font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.round((mergeProgress.current / mergeProgress.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                        style={{
                          width: `${Math.round(
                            (mergeProgress.current / mergeProgress.total) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comprehensive Educational & Technical Guide Section */}
      <PdfToolGuideSection toolId="merge-pdf" />

      {/* Built-in PDF Document Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isDark={isDark}
        title={mergedResult && previewItem?.file === mergedResult.url ? 'Merged PDF Preview' : 'Document Preview'}
        file={previewItem?.file || null}
        fileName={previewItem?.name || 'Document.pdf'}
        fileSize={previewItem?.size}
        onDownload={
          mergedResult && previewItem?.file === mergedResult.url ? handleDownload : undefined
        }
        downloadLabel={
          mergedResult && previewItem?.file === mergedResult.url
            ? `Download (${formatBytes(mergedResult.size)})`
            : undefined
        }
      />
    </div>
  );
};
