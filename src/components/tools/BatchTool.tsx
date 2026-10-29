import React, { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  Download,
  Trash2,
  FileCheck,
  Zap,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Plus,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import JSZip from 'jszip';
import { ImageToolGuideSection } from './image/ImageToolGuideSection';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { CanvasEngine, ImageFormat } from '../../core/engine/CanvasEngine';
import { formatBytes, triggerFileDownload } from '../../utils/memory';
import { useTheme } from '../../core/themeContext';

interface BatchItem {
  id: string;
  file: File;
  originalSize: number;
  processedBlob?: Blob;
  processedSize?: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export const BatchTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [mode, setMode] = useState<'compress' | 'convert' | 'resize'>('compress');
  const [quality, setQuality] = useState<number>(75);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/webp');
  const [scalePct, setScalePct] = useState<number>(50);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const handleAddFiles = (files: File[]) => {
    const newItems: BatchItem[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      originalSize: f.size,
      status: 'pending',
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setProgress(0);
  };

  const processAll = async () => {
    if (items.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);
    setProgress(0);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      item.status = 'processing';
      setItems([...updated]);

      try {
        const img = await CanvasEngine.loadImage(item.file);
        let blob: Blob;

        if (mode === 'compress') {
          blob = await CanvasEngine.compress(img, {
            quality: quality / 100,
            format: targetFormat,
          });
        } else if (mode === 'convert') {
          blob = await CanvasEngine.convertFormat(img, targetFormat, quality / 100);
        } else {
          // Resize by %
          const factor = scalePct / 100;
          blob = await CanvasEngine.resize(img, {
            width: Math.max(1, Math.round(img.naturalWidth * factor)),
            height: Math.max(1, Math.round(img.naturalHeight * factor)),
            maintainAspectRatio: true,
            format: targetFormat,
            quality: quality / 100,
          });
        }

        item.processedBlob = blob;
        item.processedSize = blob.size;
        item.status = 'done';
      } catch (err: any) {
        item.status = 'error';
        item.error = err?.message || 'Processing failed';
      }

      setProgress(Math.round(((i + 1) / updated.length) * 100));
      setItems([...updated]);
    }

    setIsProcessingAll(false);
    onNotify('Batch Processing Completed!', `Processed ${items.length} images.`, 'success');
  };

  const downloadAllAsZip = async () => {
    const processedItems = items.filter((i) => i.processedBlob && i.status === 'done');
    if (processedItems.length === 0) return;

    try {
      const zip = new JSZip();
      const ext =
        targetFormat === 'image/webp'
          ? 'webp'
          : targetFormat === 'image/jpeg'
          ? 'jpg'
          : targetFormat === 'image/avif'
          ? 'avif'
          : targetFormat === 'image/bmp'
          ? 'bmp'
          : targetFormat === 'image/x-icon'
          ? 'ico'
          : 'png';

      processedItems.forEach((item, index) => {
        const baseName = item.file.name.replace(/\.[^/.]+$/, '');
        const filename = `${baseName}-filewala-${index + 1}.${ext}`;
        zip.file(filename, item.processedBlob!);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerFileDownload(zipBlob, `filewala-batch-${Date.now()}.zip`);
      onNotify('ZIP Download Initiated', `Archived ${processedItems.length} files.`, 'success');
    } catch (e: any) {
      onNotify('ZIP Creation Failed', e?.message || 'Error compiling zip', 'error');
    }
  };

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const totalOriginal = items.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalProcessed = items.reduce(
    (acc, curr) => acc + (curr.processedSize || curr.originalSize),
    0
  );
  const hasFinished = items.some((i) => i.status === 'done');

  // Global Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (items.length > 0) {
          e.preventDefault();
          handleClearAll();
          onNotify('Reset', 'Cleared batch queue.');
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (hasFinished) {
          e.preventDefault();
          downloadAllAsZip();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (hasFinished) {
          e.preventDefault();
          downloadAllAsZip();
          return;
        } else if (items.length > 0 && !isProcessingAll) {
          e.preventDefault();
          processAll();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items.length, hasFinished, isProcessingAll, onNotify]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {items.length === 0 ? (
        <div className="space-y-3 sm:space-y-3.5">
          {/* Header Section */}
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Client-Side Engine · Zero Uploads</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Batch Image Processor
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Bulk compress, convert, or resize dozens of images simultaneously and download them in a single ZIP.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              multiple
              onFilesSelected={handleAddFiles}
              title="Drop multiple images for bulk processing"
              description="Select as many images as you need — 100% in-browser client-side"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {/* Hero Title & Action Bar Row (Ultra-Compact Viewport-Safe) */}
          <div className="flex items-center justify-between gap-3 pt-0 pb-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
                Batch Image Processor
              </h1>
              <span className="hidden sm:inline-block text-zinc-300 dark:text-zinc-700">·</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
                Bulk resize, compress, and re-encode in local RAM.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span>Clear queue</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            {/* LEFT COLUMN: Files List Queue (lg:col-span-7 xl:col-span-8) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between h-full gap-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-xs">
              {/* Header bar inside left card */}
              <div className="flex items-center justify-between gap-3 px-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md overflow-hidden shrink-0 flex items-center justify-center border ${
                      isDark ? 'bg-zinc-850 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <h3 className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Image Queue ({items.length})
                    </h3>
                    <div className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <span>Orig: {formatBytes(totalOriginal)}</span>
                      {hasFinished && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-500 font-semibold">Done: {formatBytes(totalProcessed)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-zinc-400">
                  {items.filter((i) => i.status === 'done').length}/{items.length} Ready
                </span>
              </div>

              {/* Scrollable list */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 h-[220px] sm:h-[240px] lg:h-auto flex-1 min-h-[180px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="py-1.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[11px] text-zinc-900 dark:text-white truncate">{item.file.name}</p>
                      <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] mt-0.5">
                        <span>{formatBytes(item.originalSize)}</span>
                        {item.processedSize && (
                          <>
                            <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatBytes(item.processedSize)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status === 'processing' && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600 dark:text-zinc-400" />
                      )}
                      {item.status === 'done' && (
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-rose-600 dark:text-rose-400 text-[10px] font-medium bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">
                          Failed
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="text-zinc-400 text-[10px] font-medium">Ready</span>
                      )}

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Add Files Bar */}
              <div className="pt-0.5 shrink-0">
                <Dropzone
                  multiple
                  compact
                  onFilesSelected={handleAddFiles}
                  title="Add more images to queue"
                  description="Click or drop additional files"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Configuration (lg:col-span-5 xl:col-span-4) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
              <div
                className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors shadow-xs ${
                  isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                      Batch Rule
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">{items.length} files in queue</span>
                  </div>

                  {/* Mode Switcher */}
                  <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
                    {(
                      [
                        { id: 'compress', label: 'Compress' },
                        { id: 'convert', label: 'Convert' },
                        { id: 'resize', label: 'Resize' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          mode === m.id
                            ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Target Format */}
                  <div className="space-y-1">
                    <span className={`text-[10px] font-semibold block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Output Format
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'image/webp', label: 'WebP' },
                          { id: 'image/jpeg', label: 'JPEG' },
                          { id: 'image/png', label: 'PNG' },
                        ] as const
                      ).map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setTargetFormat(fmt.id)}
                          className={`py-1 text-[10px] rounded font-medium text-center transition-colors cursor-pointer ${
                            targetFormat === fmt.id
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-bold'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders depending on mode */}
                  {mode === 'compress' && (
                    <div className="space-y-1 pt-0.5">
                      <Slider
                        label="Compression Quality"
                        value={quality}
                        min={20}
                        max={95}
                        step={5}
                        unit="%"
                        onChange={setQuality}
                      />
                    </div>
                  )}

                  {mode === 'resize' && (
                    <div className="space-y-1 pt-0.5">
                      <Slider
                        label="Scale Factor"
                        value={scalePct}
                        min={10}
                        max={100}
                        step={5}
                        unit="%"
                        onChange={setScalePct}
                      />
                    </div>
                  )}

                  {/* Processing Progress Bar */}
                  {isProcessingAll && (
                    <div className="space-y-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                      <div className="flex justify-between text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        <span>Processing queue...</span>
                        <span className="font-mono">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 transition-all duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 shrink-0">
                  {hasFinished ? (
                    <button
                      type="button"
                      onClick={downloadAllAsZip}
                      className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Archive className="w-4 h-4 stroke-[2.5]" />
                      <span>Download All as ZIP ({items.filter((i) => i.status === 'done').length})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessingAll}
                      onClick={processAll}
                      className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing ({progress}%)...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-white fill-white" />
                          <span>Start Batch Processing ({items.length})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId="batch-image-cropper" />
    </div>
  );
};
