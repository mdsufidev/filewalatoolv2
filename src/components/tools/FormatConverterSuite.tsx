import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Download,
  RefreshCw,
  Sparkles,
  FileCode,
  Sliders,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { CanvasEngine, ImageFormat } from '../../core/engine/CanvasEngine';
import { convertHeicToJpeg } from '../../utils/heicHelper';
import {
  createSafeObjectURL,
  revokeSafeObjectURL,
  formatBytes,
  triggerFileDownload,
} from '../../utils/memory';
import { useTheme } from '../../core/themeContext';

export type ConverterToolId =
  | 'png-to-webp'
  | 'webp-to-jpg'
  | 'heic-to-jpg'
  | 'jpg-to-webp'
  | 'png-to-jpg'
  | 'jpg-to-png'
  | 'avif-to-jpg'
  | 'svg-to-png';

export interface ConverterToolMeta {
  id: ConverterToolId;
  name: string;
  from: string;
  to: string;
  accept: string;
  targetFormat: ImageFormat;
  extension: string;
  description: string;
  badge?: string;
}

export const CONVERTER_TOOLS: ConverterToolMeta[] = [
  {
    id: 'png-to-webp',
    name: 'PNG to WebP',
    from: 'PNG',
    to: 'WebP',
    accept: 'image/png,.png',
    targetFormat: 'image/webp',
    extension: 'webp',
    description: 'Compress PNG by up to 80% while keeping alpha transparency intact.',
    badge: 'Popular',
  },
  {
    id: 'webp-to-jpg',
    name: 'WebP to JPG',
    from: 'WebP',
    to: 'JPG',
    accept: 'image/webp,.webp',
    targetFormat: 'image/jpeg',
    extension: 'jpg',
    description: 'Convert modern WebP graphics to universal, universally compatible JPEG.',
  },
  {
    id: 'heic-to-jpg',
    name: 'HEIC to JPG',
    from: 'HEIC',
    to: 'JPG',
    accept: '.heic,.heif,image/heic,image/heif',
    targetFormat: 'image/jpeg',
    extension: 'jpg',
    description: 'Decode Apple iPhone HEIC photos into standard JPEG files right in your browser.',
    badge: 'iPhone / iOS',
  },
  {
    id: 'jpg-to-webp',
    name: 'JPG to WebP',
    from: 'JPG',
    to: 'WebP',
    accept: 'image/jpeg,image/jpg,.jpg,.jpeg',
    targetFormat: 'image/webp',
    extension: 'webp',
    description: 'Convert heavy JPEG files to lightweight WebP for lightning-fast web performance.',
    badge: 'Modern Web',
  },
  {
    id: 'png-to-jpg',
    name: 'PNG to JPG',
    from: 'PNG',
    to: 'JPG',
    accept: 'image/png,.png',
    targetFormat: 'image/jpeg',
    extension: 'jpg',
    description: 'Convert PNG graphics with automatic crisp white background fill for transparency.',
  },
  {
    id: 'jpg-to-png',
    name: 'JPG to PNG',
    from: 'JPG',
    to: 'PNG',
    accept: 'image/jpeg,image/jpg,.jpg,.jpeg',
    targetFormat: 'image/png',
    extension: 'png',
    description: 'Convert JPEG images to uncompressed, lossless PNG image format.',
  },
  {
    id: 'avif-to-jpg',
    name: 'AVIF to JPG',
    from: 'AVIF',
    to: 'JPG',
    accept: 'image/avif,.avif',
    targetFormat: 'image/jpeg',
    extension: 'jpg',
    description: 'Transcode high-efficiency AVIF photos to standard JPEG for legacy photo editors.',
    badge: 'Next-Gen',
  },
  {
    id: 'svg-to-png',
    name: 'SVG to PNG',
    from: 'SVG',
    to: 'PNG',
    accept: 'image/svg+xml,.svg',
    targetFormat: 'image/png',
    extension: 'png',
    description: 'Rasterize vector SVG artwork into crisp, high-resolution PNG bitmap graphics.',
    badge: 'Vector',
  },
];

interface FormatConverterSuiteProps {
  initialToolId?: ConverterToolId;
  initialFiles?: File[] | null;
  onClearPendingFiles?: () => void;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const FormatConverterSuite: React.FC<FormatConverterSuiteProps> = ({
  initialToolId = 'png-to-webp',
  initialFiles,
  onClearPendingFiles,
  onNotify,
}) => {
  const [activeToolId, setActiveToolId] = useState<ConverterToolId>(initialToolId);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedPreviewUrl, setConvertedPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(85);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (initialToolId) {
      setActiveToolId(initialToolId);
    }
  }, [initialToolId]);

  const activeMeta = CONVERTER_TOOLS.find((t) => t.id === activeToolId) || CONVERTER_TOOLS[0];

  const handleToolChange = (newToolId: ConverterToolId) => {
    setActiveToolId(newToolId);
    setSourceFile(null);
    setConvertedBlob(null);
    if (sourcePreviewUrl) revokeSafeObjectURL(sourcePreviewUrl);
    if (convertedPreviewUrl) revokeSafeObjectURL(convertedPreviewUrl);
    setSourcePreviewUrl(null);
    setConvertedPreviewUrl(null);
    setImgDimensions(null);
  };

  const handleFileLoaded = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setSourceFile(file);
    setConvertedBlob(null);
    if (convertedPreviewUrl) revokeSafeObjectURL(convertedPreviewUrl);
    setConvertedPreviewUrl(null);

    if (activeToolId === 'heic-to-jpg') {
      try {
        setIsProcessing(true);
        const jpegBlob = await convertHeicToJpeg(file);
        const preview = createSafeObjectURL(jpegBlob);
        setSourcePreviewUrl(preview);
        setConvertedBlob(jpegBlob);
        setConvertedPreviewUrl(preview);
        onNotify('HEIC Decoded Successfully', 'Converted to JPEG in browser.', 'success');
      } catch (err: any) {
        onNotify('Conversion Failed', err?.message || 'Failed to convert HEIC.', 'error');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const preview = createSafeObjectURL(file);
    setSourcePreviewUrl(preview);

    const img = new Image();
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      runConversion(img, file, quality);
    };
    img.src = preview;
  };

  const runConversion = async (img: HTMLImageElement, file: File, currentQuality: number) => {
    setIsProcessing(true);
    try {
      const q = activeMeta.targetFormat === 'image/png' ? 1.0 : currentQuality / 100;
      const blob = await CanvasEngine.compress(img, {
        format: activeMeta.targetFormat,
        quality: q,
      });

      setConvertedBlob(blob);
      if (convertedPreviewUrl) revokeSafeObjectURL(convertedPreviewUrl);
      const resUrl = createSafeObjectURL(blob);
      setConvertedPreviewUrl(resUrl);
      onNotify('Converted Successfully', `Target: ${activeMeta.to} format`, 'success');
    } catch (e: any) {
      onNotify('Conversion Failed', e?.message || 'Error converting graphic', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load initial files if passed from global drop zone
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileLoaded(initialFiles);
    }
  }, [initialFiles]);

  const handleDownload = () => {
    if (!convertedBlob || !sourceFile) return;
    const baseName = sourceFile.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}.${activeMeta.extension}`;
    triggerFileDownload(convertedBlob, outName);
    onNotify('Download Started', `Saved ${outName}`, 'success');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Format Converters & Codecs</span>
        </div>
        <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {activeMeta.name} Converter
        </h2>
        <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {activeMeta.description}
        </p>
      </div>

      {/* 8 Converters Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {CONVERTER_TOOLS.map((t) => {
          const isSelected = activeToolId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleToolChange(t.id)}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                isSelected
                  ? isDark
                    ? 'bg-slate-800 border-slate-700 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/50'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 border transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-900 border-slate-700 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-blue-300'
                    : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold leading-tight line-clamp-1">
                {t.from} → {t.to}
              </span>
              {t.badge && (
                <span
                  className={`mt-1 text-[9px] font-mono px-1 py-0.2 rounded border ${
                    isSelected
                      ? isDark
                        ? 'bg-slate-950 text-blue-400 border-slate-800'
                        : 'bg-slate-800 text-blue-300 border-slate-700'
                      : isDark
                        ? 'bg-slate-800 text-slate-400 border-slate-700/60'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Converter Card */}
      <div
        className={`p-6 md:p-8 rounded-lg border ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        {!sourceFile ? (
          <Dropzone
            onFilesSelected={handleFileLoaded}
            accept={activeMeta.accept}
            title={`Drop ${activeMeta.from} file to convert to ${activeMeta.to}`}
            description={`Instant client-side encoding with zero server uploads`}
          />
        ) : (
          <div className="space-y-6">
            <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                {sourcePreviewUrl && (
                  <img
                    src={sourcePreviewUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                  />
                )}
                <div>
                  <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{sourceFile.name}</h4>
                  <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Original: {formatBytes(sourceFile.size)}</span>
                    {imgDimensions && (
                      <span>· {imgDimensions.width} × {imgDimensions.height} px</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSourceFile(null)}
                >
                  Change File
                </Button>
                {convertedBlob && (
                  <Button
                    onClick={handleDownload}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download {activeMeta.to} ({formatBytes(convertedBlob.size)})
                  </Button>
                )}
              </div>
            </div>

            {activeMeta.targetFormat !== 'image/png' && (
              <div className="max-w-md">
                <Slider
                  label="Encoding Quality"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(val) => {
                    setQuality(val);
                    if (sourcePreviewUrl) {
                      const img = new Image();
                      img.onload = () => runConversion(img, sourceFile, val);
                      img.src = sourcePreviewUrl;
                    }
                  }}
                  unit="%"
                  helperText="Adjust compression ratio vs visual sharpness"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
