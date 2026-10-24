'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  Expand,
} from 'lucide-react';
import { pdfjsLib, PDFJS_VERSION, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';

export interface PdfViewerProps {
  /** The PDF file source: File, Blob, object URL, or Uint8Array */
  file: File | Blob | string | Uint8Array | null;
  fileName?: string;
  fileSize?: number;
  badgeLabel?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  isDark?: boolean;
  maxHeight?: string;
  showToolbar?: boolean;
  className?: string;
  onDownload?: () => void;
  onPageChange?: (page: number, totalPages: number) => void;
  externalPage?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  fileName = 'Document.pdf',
  fileSize,
  badgeLabel,
  badgeColor = 'blue',
  isDark = true,
  maxHeight = '65vh',
  showToolbar = true,
  className = '',
  onDownload,
  onPageChange,
  externalPage,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPageRendering, setIsPageRendering] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Sync external page if provided (useful for synchronized side-by-side comparison)
  useEffect(() => {
    if (externalPage && externalPage !== pageNumber && numPages && externalPage <= numPages) {
      setPageNumber(externalPage);
    }
  }, [externalPage, numPages]);

  // Measure container width for responsive scaling
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    }
  }, []);

  useEffect(() => {
    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, [updateContainerWidth]);

  // Load PDF Document via native pdfjsLib
  const loadDocument = useCallback(async () => {
    if (!file) {
      setIsLoading(false);
      setNumPages(null);
      pdfDocRef.current = null;
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    ensurePdfWorkerInitialized();

    try {
      let data: Uint8Array | undefined;
      let url: string | undefined;

      if (file instanceof Uint8Array) {
        data = file;
      } else if (file instanceof Blob || file instanceof File) {
        const arrayBuf = await file.arrayBuffer();
        data = new Uint8Array(arrayBuf);
      } else if (typeof file === 'string') {
        url = file;
      }

      const loadingTask = pdfjsLib.getDocument({
        data,
        url,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      pdfDocRef.current = doc;
      setNumPages(doc.numPages);
      setPageNumber(1);
      setIsLoading(false);
      onPageChange?.(1, doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF in preview:', err);
      setIsLoading(false);
      pdfDocRef.current = null;
      setLoadError(err?.message || 'Unable to render PDF document preview.');
    }
  }, [file, onPageChange]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Render current page to Canvas
  const renderPage = useCallback(async () => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    try {
      setIsPageRendering(true);

      // Cancel any ongoing rendering task before starting a new one
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }

      const page = await doc.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

      // Determine proportional display width
      let targetWidth = unscaledViewport.width * scale;
      if (containerWidth > 150) {
        const maxAvailableWidth = containerWidth - 48;
        if (scale === 1.0) {
          targetWidth = Math.min(maxAvailableWidth, 750);
        } else {
          targetWidth = Math.min(maxAvailableWidth * scale, 1200 * scale);
        }
      }

      const computedScale = Math.max(0.2, targetWidth / unscaledViewport.width);
      const viewport = page.getViewport({ scale: computedScale, rotation });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(viewport.width * dpr);
      canvas.height = Math.round(viewport.height * dpr);
      canvas.style.width = `${Math.round(viewport.width)}px`;
      canvas.style.height = `${Math.round(viewport.height)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      } as any);

      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
      setIsPageRendering(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Page render error:', err);
      }
      setIsPageRendering(false);
    }
  }, [pageNumber, scale, rotation, containerWidth]);

  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      renderPage();
    }
  }, [isLoading, renderPage]);

  // Page navigation handlers
  const handlePrevPage = () => {
    if (pageNumber > 1) {
      const next = pageNumber - 1;
      setPageNumber(next);
      onPageChange?.(next, numPages || 1);
    }
  };

  const handleNextPage = () => {
    if (numPages && pageNumber < numPages) {
      const next = pageNumber + 1;
      setPageNumber(next);
      onPageChange?.(next, numPages);
    }
  };

  const handlePageSelect = (page: number) => {
    if (numPages && page >= 1 && page <= numPages) {
      setPageNumber(page);
      onPageChange?.(page, numPages);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleFitWidth = () => {
    setScale(1.25);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const badgeColorClasses = {
    blue: isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
    purple: isDark ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200',
    slate: isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300',
  }[badgeColor];

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return null;
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (!file) {
    return (
      <div
        className={`p-12 text-center rounded-lg border flex flex-col items-center justify-center gap-3 ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
        } ${className}`}
      >
        <FileText className="w-8 h-8 opacity-40 text-zinc-400" />
        <p className="text-sm font-medium">No PDF file selected for preview</p>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative flex flex-col rounded-lg border overflow-hidden transition-colors ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''} ${className}`}
    >
      {/* TOOLBAR */}
      {showToolbar && (
        <div
          className={`px-3 py-2 sm:px-4 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 z-10 shrink-0 select-none ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          {/* File Info & Badge */}
          <div className="flex items-center gap-2 min-w-0 max-w-[50%]">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {fileName}
                </span>
                {badgeLabel && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${badgeColorClasses}`}>
                    {badgeLabel}
                  </span>
                )}
              </div>
              {fileSize && (
                <span className="text-[11px] font-mono text-slate-400">
                  {formatFileSize(fileSize)}
                </span>
              )}
            </div>
          </div>

          {/* Navigation & Zoom Controls */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            {/* Page Navigator */}
            <div
              className={`flex items-center rounded-xl border px-1 py-0.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
                title="Previous page"
                className="p-1.5 rounded-lg hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-300 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2 text-xs font-mono font-medium flex items-center gap-1">
                <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>
                  {pageNumber}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{numPages || '–'}</span>
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={!numPages || pageNumber >= numPages}
                title="Next page"
                className="p-1.5 rounded-lg hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-300 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div
              className={`hidden md:flex items-center rounded-xl border px-1 py-0.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                title="Zoom out"
                className="p-1.5 rounded-lg hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-300 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset zoom to 100%"
                className="px-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 2.5}
                title="Zoom in"
                className="p-1.5 rounded-lg hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-300 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fit Width */}
            <button
              type="button"
              onClick={handleFitWidth}
              title="Fit to Container Width"
              className={`hidden sm:flex p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Expand className="w-4 h-4" />
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotate}
              title="Rotate 90°"
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Optional Download */}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                title="Download file"
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400 hover:bg-blue-600/30'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF DOCUMENT CANVAS CONTAINER */}
      <div
        ref={containerRef}
        className={`relative flex-1 overflow-auto flex items-center justify-center p-4 sm:p-6 select-none ${
          isDark ? 'bg-slate-900/50' : 'bg-slate-100/70'
        }`}
        style={{
          minHeight: '280px',
          maxHeight: isFullscreen ? 'calc(100vh - 60px)' : maxHeight,
        }}
      >
        {/* Loading Spinner */}
        {(isLoading || isPageRendering) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/40 backdrop-blur-[1px]">
            <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <p className="text-xs font-medium text-zinc-300">
              {isLoading ? 'Loading PDF document...' : 'Rendering page...'}
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="p-6 text-center max-w-sm space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h4 className="text-sm font-semibold text-rose-400">Failed to render preview</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setLoadError(null);
                loadDocument();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Native High-DPI HTML5 Canvas */}
        <div className="transition-transform duration-150 shadow-md rounded border border-zinc-200 dark:border-zinc-800 bg-white overflow-hidden flex items-center justify-center">
          <canvas ref={canvasRef} className="block max-w-full h-auto" />
        </div>
      </div>

      {/* QUICK PAGE JUMP STRIP (if more than 1 page) */}
      {numPages && numPages > 1 && (
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-between text-[11px] font-mono shrink-0 ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Quick Jump:</span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[80%] py-0.5">
            {Array.from({ length: Math.min(numPages, 12) }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => handlePageSelect(pg)}
                className={`w-6 h-6 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                  pageNumber === pg
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-slate-200 text-slate-700'
                }`}
              >
                {pg}
              </button>
            ))}
            {numPages > 12 && (
              <span className="text-slate-500 text-[10px] px-1">... {numPages}</span>
            )}
          </div>
          <span className="hidden sm:inline text-[10px] text-slate-500">
            Use ← → keys to navigate
          </span>
        </div>
      )}
    </div>
  );
};
