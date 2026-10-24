import React, { useState } from 'react';
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
} from 'lucide-react';
import JSZip from 'jszip';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { CanvasEngine, ImageFormat } from '../../core/engine/CanvasEngine';
import { formatBytes, triggerFileDownload } from '../../utils/memory';

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

  const totalOriginal = items.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalProcessed = items.reduce(
    (acc, curr) => acc + (curr.processedSize || curr.originalSize),
    0
  );
  const hasFinished = items.some((i) => i.status === 'done');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Batch Image Processor
        </h2>
        <p className="text-sm text-zinc-500">
          Upload dozens of images, resize, compress, or convert them in bulk, and download everything as a single neat ZIP archive.
        </p>
      </div>

      {items.length === 0 ? (
        <Dropzone
          multiple
          onFilesSelected={handleAddFiles}
          title="Drop multiple images for bulk processing"
          description="Select as many images as you need — 100% in-browser"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-5 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 mb-1">
                Batch Configuration
              </h4>
              <p className="text-xs text-zinc-500">
                Rule applied to all {items.length} images
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-md border border-zinc-200 text-xs">
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
                  className={`py-2 rounded-lg font-medium transition-colors ${
                    mode === m.id
                      ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Target Format */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
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
                    className={`py-2 text-xs rounded-xl font-medium border text-center transition-colors ${
                      targetFormat === fmt.id
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
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
              <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex justify-between text-xs font-medium text-zinc-700">
                  <span>Processing queue...</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 transition-all duration-200"
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
          <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">
                  Image Queue ({items.length})
                </h4>
                <p className="text-xs text-zinc-500">
                  Total initial payload: {formatBytes(totalOriginal)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50"
                >
                  Clear Queue
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="divide-y divide-zinc-100 max-h-[460px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 text-zinc-400 text-[11px] mt-0.5">
                      <span>{formatBytes(item.originalSize)}</span>
                      {item.processedSize && (
                        <>
                          <ArrowRight className="w-3 h-3 text-zinc-400" />
                          <span className="font-bold text-emerald-600">
                            {formatBytes(item.processedSize)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'processing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                    )}
                    {item.status === 'done' && (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded">
                        Failed
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-zinc-400 font-medium">Ready</span>
                    )}

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-zinc-400 hover:text-rose-600 p-1 rounded"
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
      )}
    </div>
  );
};
