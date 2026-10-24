'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Split,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { PdfViewer } from './PdfViewer';

export interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  isDark?: boolean;

  /** Single PDF mode (or primary/processed PDF) */
  file?: File | Blob | string | Uint8Array | null;
  fileName?: string;
  fileSize?: number;

  /** Optional "Before" / Original PDF for comparison mode */
  originalFile?: File | Blob | string | Uint8Array | null;
  originalFileName?: string;
  originalFileSize?: number;

  /** Processed / "After" file for comparison mode */
  processedFile?: File | Blob | string | Uint8Array | null;
  processedFileName?: string;
  processedFileSize?: number;

  /** Download handler for the active/processed file */
  onDownload?: () => void;
  downloadLabel?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title = 'Document Preview',
  isDark = true,
  file,
  fileName = 'Document.pdf',
  fileSize,
  originalFile,
  originalFileName,
  originalFileSize,
  processedFile,
  processedFileName,
  processedFileSize,
  onDownload,
  downloadLabel = 'Download PDF',
}) => {
  // If original and processed are both provided, comparison mode is available
  const hasComparison = Boolean(originalFile && processedFile);

  // Comparison view mode: 'tabs' (toggle between before/after) or 'side-by-side'
  const [compareMode, setCompareMode] = useState<'tabs' | 'side-by-side'>(
    hasComparison ? 'tabs' : 'tabs'
  );
  // Active tab in 'tabs' compare mode
  const [activeTab, setActiveTab] = useState<'original' | 'processed'>(
    processedFile ? 'processed' : 'original'
  );

  // Synchronized page number across side-by-side viewers
  const [syncPage, setSyncPage] = useState<number>(1);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate compression reduction %
  const compressionRatio =
    originalFileSize && processedFileSize && originalFileSize > 0
      ? Math.max(0, Math.round(((originalFileSize - processedFileSize) / originalFileSize) * 100))
      : null;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Window */}
      <div
        className={`relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-lg border shadow-lg overflow-hidden z-10 transition-all ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* MODAL HEADER */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          {/* Title & Trust Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold truncate">
                  {title}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck className="w-3 h-3" />
                  <span>100% In-Browser</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {hasComparison
                  ? `${originalFileName || 'Original PDF'} · Compare quality & compression`
                  : fileName}
              </p>
            </div>
          </div>

          {/* Comparison Mode Switches */}
          {hasComparison && (
            <div className="flex items-center gap-2">
              {/* Tab Selector: Original vs Compressed */}
              <div
                className={`p-0.5 rounded-md border flex items-center gap-1 ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('original');
                    setCompareMode('tabs');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    compareMode === 'tabs' && activeTab === 'original'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span>Before</span>
                  {originalFileSize && (
                    <span className="text-[10px] opacity-80 font-mono">
                      ({formatBytes(originalFileSize)})
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('processed');
                    setCompareMode('tabs');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    compareMode === 'tabs' && activeTab === 'processed'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>After</span>
                  {processedFileSize && (
                    <span className="text-[10px] opacity-80 font-mono">
                      ({formatBytes(processedFileSize)})
                    </span>
                  )}
                </button>
              </div>

              {/* Side-by-Side Toggle Button */}
              <button
                type="button"
                onClick={() => setCompareMode(compareMode === 'side-by-side' ? 'tabs' : 'side-by-side')}
                title="Toggle Side-by-Side View"
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  compareMode === 'side-by-side'
                    ? isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>

              {/* Savings Badge */}
              {compressionRatio !== null && compressionRatio > 0 && (
                <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Percent className="w-3 h-3" />
                  <span>-{compressionRatio}% smaller</span>
                </div>
              )}
            </div>
          )}

          {/* Action CTAs & Close Button */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="py-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{downloadLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Close Preview (Esc)"
              className={`p-1.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY VIEWPORT */}
        <div className={`flex-1 overflow-hidden p-3 sm:p-4 ${isDark ? 'bg-zinc-950/60' : 'bg-zinc-50'}`}>
          {hasComparison ? (
            compareMode === 'side-by-side' ? (
              /* SIDE-BY-SIDE SPLIT VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                {/* Left: Original Before */}
                <div className="flex flex-col h-full rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div
                    className={`px-3 py-1.5 border-b text-xs font-medium flex items-center justify-between ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      Original (Before Compression)
                    </span>
                    {originalFileSize && (
                      <span className="font-mono text-zinc-500 text-[11px]">{formatBytes(originalFileSize)}</span>
                    )}
                  </div>
                  <PdfViewer
                    file={originalFile || null}
                    fileName={originalFileName || 'Original.pdf'}
                    fileSize={originalFileSize}
                    badgeLabel="Original"
                    badgeColor="blue"
                    isDark={isDark}
                    maxHeight="calc(80vh - 120px)"
                    externalPage={syncPage}
                    onPageChange={(p) => setSyncPage(p)}
                  />
                </div>

                {/* Right: Compressed After */}
                <div className="flex flex-col h-full rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div
                    className={`px-3 py-1.5 border-b text-xs font-medium flex items-center justify-between ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-white border-zinc-200 text-emerald-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Compressed (After Compression)
                    </span>
                    {processedFileSize && (
                      <span className="font-mono text-[11px]">{formatBytes(processedFileSize)}</span>
                    )}
                  </div>
                  <PdfViewer
                    file={processedFile || null}
                    fileName={processedFileName || 'Compressed.pdf'}
                    fileSize={processedFileSize}
                    badgeLabel="Compressed"
                    badgeColor="emerald"
                    isDark={isDark}
                    maxHeight="calc(80vh - 120px)"
                    externalPage={syncPage}
                    onPageChange={(p) => setSyncPage(p)}
                    onDownload={onDownload}
                  />
                </div>
              </div>
            ) : (
              /* TABBED SINGLE VIEW (Before or After) */
              <div className="h-full flex flex-col">
                {activeTab === 'original' ? (
                  <PdfViewer
                    file={originalFile || null}
                    fileName={originalFileName || 'Original.pdf'}
                    fileSize={originalFileSize}
                    badgeLabel="Original (Before)"
                    badgeColor="blue"
                    isDark={isDark}
                    maxHeight="calc(80vh - 100px)"
                  />
                ) : (
                  <PdfViewer
                    file={processedFile || null}
                    fileName={processedFileName || 'Compressed.pdf'}
                    fileSize={processedFileSize}
                    badgeLabel="Compressed (After)"
                    badgeColor="emerald"
                    isDark={isDark}
                    maxHeight="calc(80vh - 100px)"
                    onDownload={onDownload}
                  />
                )}
              </div>
            )
          ) : (
            /* STANDARD SINGLE DOCUMENT PREVIEW */
            <PdfViewer
              file={file || null}
              fileName={fileName}
              fileSize={fileSize}
              badgeLabel="Document"
              badgeColor="blue"
              isDark={isDark}
              maxHeight="calc(82vh - 90px)"
              onDownload={onDownload}
            />
          )}
        </div>
      </div>
    </div>
  );
};
