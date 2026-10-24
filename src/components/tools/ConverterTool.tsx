import React, { useState } from 'react';
import { Download, RefreshCw, FileCode, Check, ArrowRight, Copy, Share2 } from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { formatBytes, triggerFileDownload } from '../../utils/memory';
import { ImageFormat } from '../../core/engine/CanvasEngine';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../utils/clipboardAndShare';

interface FormatOption {
  id: ImageFormat;
  extension: string;
  name: string;
  description: string;
  supportsTransparency: boolean;
  idealFor: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'image/webp',
    extension: 'webp',
    name: 'WebP',
    description: 'Next-gen web format developed by Google with superior compression.',
    supportsTransparency: true,
    idealFor: 'Modern websites and mobile apps',
  },
  {
    id: 'image/png',
    extension: 'png',
    name: 'PNG',
    description: 'Lossless raster format preserving alpha transparency and crisp lines.',
    supportsTransparency: true,
    idealFor: 'Graphics, logos, screenshots, transparent art',
  },
  {
    id: 'image/jpeg',
    extension: 'jpg',
    name: 'JPEG / JPG',
    description: 'Universal photo format compatible across all devices and platforms.',
    supportsTransparency: false,
    idealFor: 'Photographs, camera captures, wallpapers',
  },
  {
    id: 'image/avif',
    extension: 'avif',
    name: 'AVIF',
    description: 'High efficiency open image coding format based on AV1 video codec.',
    supportsTransparency: true,
    idealFor: 'Ultra-lightweight modern web assets',
  },
  {
    id: 'image/bmp',
    extension: 'bmp',
    name: 'BMP',
    description: 'Uncompressed Windows bitmap format storing raw color data.',
    supportsTransparency: false,
    idealFor: 'Legacy software and Windows systems',
  },
];

export const ConverterTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();
  const { isProcessing, result, processConvert } = useCanvasEngine();

  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>('image/webp');
  const [quality, setQuality] = useState<number>(90);

  const currentFormatMeta = FORMAT_OPTIONS.find((f) => f.id === selectedFormat) || FORMAT_OPTIONS[0];

  const handleConvert = async () => {
    if (!currentImage) return;
    const res = await processConvert(
      currentImage.imageElement,
      selectedFormat,
      quality / 100,
      currentImage.sizeBytes
    );

    if (res) {
      onNotify(
        'Format Converted!',
        `Converted to ${currentFormatMeta.name} (${formatBytes(res.sizeBytes)})`,
        'success'
      );
    }
  };

  const handleDownload = () => {
    if (!result || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}.${currentFormatMeta.extension}`;
    triggerFileDownload(result.blob, filename);
    onNotify('File Downloaded', `Saved as ${filename}`, 'success');
  };

  const handleCopy = async () => {
    if (!result) return;
    const ok = await copyImageToClipboard(result.blob);
    if (ok) {
      onNotify('Copied to Clipboard', `${currentFormatMeta.name} image copied. You can now paste (Ctrl+V) it anywhere.`, 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    if (!result || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}.${currentFormatMeta.extension}`;
    const shared = await shareFileOrBlob({
      blob: result.blob,
      filename,
      title: 'Converted Image',
      text: `Converted to ${currentFormatMeta.name} with FileWala.`,
    });
    if (shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
    }
  };

  if (!currentImage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Convert Image Formats
          </h2>
          <p className="text-sm text-zinc-500">
            Switch between PNG, JPG, WebP, AVIF, and BMP in milliseconds. No file uploads, no watermarks, completely unlimited.
          </p>
        </div>

        <Dropzone
          onFilesSelected={(files) => loadFile(files[0])}
          title="Drop image to convert"
          description="Support for PNG, JPG, WebP, AVIF, BMP, GIF, and SVG"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-200/80">
          {FORMAT_OPTIONS.slice(0, 4).map((f) => (
            <div
              key={f.id}
              className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl"
            >
              <div className="font-bold text-xs text-zinc-900">{f.name}</div>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                {f.idealFor}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-zinc-200 rounded-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={currentImage.previewUrl}
              alt="Source"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 truncate">
              {currentImage.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
              <span className="font-mono uppercase font-semibold text-zinc-700">
                {currentImage.format.replace('image/', '') || 'IMAGE'}
              </span>
              <span>·</span>
              <span>{formatBytes(currentImage.sizeBytes)}</span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetImage}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Change Image
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Format Selector Column */}
        <div className="lg:col-span-6 bg-white border border-zinc-200 rounded-lg p-5 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 mb-1">Select Target Format</h4>
            <p className="text-xs text-zinc-500">
              Choose the output image format standard
            </p>
          </div>

          <div className="space-y-2">
            {FORMAT_OPTIONS.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <div
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`p-3.5 rounded-md border transition-colors cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                      isSelected
                        ? 'bg-zinc-950 border-zinc-950 text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900">
                        {fmt.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded">
                        .{fmt.extension}
                      </span>
                      {fmt.supportsTransparency && (
                        <span className="text-[10px] text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded">
                          Alpha
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{fmt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedFormat !== 'image/png' && (
            <div className="pt-4 border-t border-zinc-100">
              <Slider
                label="Quality"
                value={quality}
                min={20}
                max={100}
                step={5}
                unit="%"
                onChange={setQuality}
                helperText="Higher quality preserves fine gradations, lower quality reduces size."
              />
            </div>
          )}

          <Button
            size="lg"
            variant="primary"
            onClick={handleConvert}
            isLoading={isProcessing}
            className="w-full"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Convert to {currentFormatMeta.name}
          </Button>
        </div>

        {/* Output Preview Column */}
        <div className="lg:col-span-6 bg-white border border-zinc-200 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-900">
                {result ? 'Converted Preview' : 'Source Preview'}
              </h4>
              {result && (
                <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {formatBytes(result.sizeBytes)}
                </span>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-center min-h-[300px]">
              <img
                src={result ? result.url : currentImage.previewUrl}
                alt="Converted Preview"
                className="max-h-[340px] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>

            {result && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 text-xs flex justify-between">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Format</span>
                  <span className="font-semibold text-zinc-900">{currentFormatMeta.name}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Dimensions</span>
                  <span className="font-mono text-zinc-900">{result.width} × {result.height} px</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">File Size</span>
                  <span className="font-mono font-semibold text-zinc-900">{formatBytes(result.sizeBytes)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            {result ? (
              <div className="space-y-2">
                <Button
                  size="xl"
                  variant="primary"
                  onClick={handleDownload}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                  leftIcon={<Download className="w-5 h-5" />}
                >
                  Download {currentFormatMeta.name} Image
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                onClick={handleConvert}
                isLoading={isProcessing}
                className="w-full"
              >
                Click to Convert
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
