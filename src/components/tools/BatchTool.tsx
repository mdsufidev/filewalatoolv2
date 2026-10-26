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
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header Section */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Client-Side Engine · Zero Uploads</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Batch Image Processor
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Bulk compress, convert, or resize dozens of images simultaneously and download them in a single ZIP file.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="max-w-3xl mx-auto">
          <Dropzone
            multiple
            onFilesSelected={handleAddFiles}
            title="Drop multiple images for bulk processing"
            description="Select as many images as you need — 100% in-browser client-side"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Workspace Top Header Bar */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 border rounded-xl ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                }`}
              >
                <Archive className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xs sm:text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Batch Queue: {items.length} Images
                </h3>
                <div className={`flex items-center gap-2 text-[11px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <span>Original: {formatBytes(totalOriginal)}</span>
                  {hasFinished && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500 font-semibold">Processed: {formatBytes(totalProcessed)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAll}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear Queue</span>
              </button>

              {hasFinished ? (
                <button
                  onClick={downloadAllAsZip}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ZIP ({items.filter((i) => i.status === 'done').length})</span>
                </button>
              ) : (
                <button
                  disabled={isProcessingAll}
                  onClick={processAll}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isProcessingAll ? `Processing (${progress}%)` : 'Process All'}</span>
                </button>
              )}
            </div>
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                Batch Configuration
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Rule applied to all {items.length} images
              </p>
            </div>

            {/* Mode Switcher (Soft Tabs) */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs">
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
                  className={`py-2 rounded-md font-medium transition-colors cursor-pointer ${
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
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Output Format
              </label>
              <div className="grid grid-cols-3 gap-2">
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
                    className={`py-2 text-xs rounded-lg font-medium text-center transition-colors cursor-pointer ${
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
              <Slider
                label="Compression Quality"
                value={quality}
                min={20}
                max={95}
                step={5}
                unit="%"
                onChange={setQuality}
                helperText="Higher quality preserves subtle details."
              />
            )}

            {mode === 'resize' && (
              <Slider
                label="Scale Factor"
                value={scalePct}
                min={10}
                max={100}
                step={5}
                unit="%"
                onChange={setScalePct}
                helperText="Scale original dimensions down proportionally."
              />
            )}

            {/* Processing Progress Bar */}
            {isProcessingAll && (
              <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <span>Processing queue...</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              size="lg"
              variant="primary"
              onClick={processAll}
              isLoading={isProcessingAll}
              className="w-full"
              leftIcon={<Zap className="w-4 h-4 text-amber-300" />}
            >
              Start Batch Processing ({items.length})
            </Button>

            {hasFinished && (
              <Button
                size="xl"
                variant="primary"
                onClick={downloadAllAsZip}
                className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                leftIcon={<Archive className="w-5 h-5" />}
              >
                Download All as ZIP
              </Button>
            )}
          </div>

          {/* Files List Column (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Image Queue ({items.length})
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Total initial payload: {formatBytes(totalOriginal)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[460px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-[11px] mt-0.5">
                      <span>{formatBytes(item.originalSize)}</span>
                      {item.processedSize && (
                        <>
                          <ArrowRight className="w-3 h-3 text-zinc-400" />
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatBytes(item.processedSize)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'processing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-400" />
                    )}
                    {item.status === 'done' && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        Failed
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-zinc-400 font-medium">Ready</span>
                    )}

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick add more files dropzone */}
            <Dropzone
              multiple
              compact
              onFilesSelected={handleAddFiles}
              title="Add more images to queue"
              description="Click or drop additional files"
            />
          </div>
        </div>
      </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId="batch-image-cropper" />
    </div>
  );
};
