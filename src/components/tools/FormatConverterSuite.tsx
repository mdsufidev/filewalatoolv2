import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ShieldCheck,
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
import { ImageToolGuideSection } from './image/ImageToolGuideSection';

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

const normalizeToolId = (id?: string): ConverterToolId => {
  if (id && CONVERTER_TOOLS.some((t) => t.id === id)) {
    return id as ConverterToolId;
  }
  return 'png-to-webp';
};

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
  const [activeToolId, setActiveToolId] = useState<ConverterToolId>(() => normalizeToolId(initialToolId));
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedPreviewUrl, setConvertedPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(85);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  const executionIdRef = useRef<number>(0);
  const qualityDebounceTimerRef = useRef<any>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (initialToolId) {
      setActiveToolId(normalizeToolId(initialToolId));
    }
  }, [initialToolId]);

  const activeMeta = CONVERTER_TOOLS.find((t) => t.id === activeToolId) || CONVERTER_TOOLS[0];

  const handleToolChange = (newToolId: ConverterToolId) => {
    setActiveToolId(newToolId);
    setSourceFile(null);
    setConvertedBlob(null);
    if (sourcePreviewUrl) revokeSafeObjectURL(sourcePreviewUrl);
    if (convertedPreviewUrl && convertedPreviewUrl !== sourcePreviewUrl) revokeSafeObjectURL(convertedPreviewUrl);
    setSourcePreviewUrl(null);
    setConvertedPreviewUrl(null);
    setImgDimensions(null);
    try {
      window.history.pushState(null, '', `/${newToolId}`);
    } catch {
      // safe fallback if history API is restricted
    }
  };

  const runConversion = async (
    img: HTMLImageElement,
    currentQuality: number,
    notifyOnSuccess: boolean = true
  ) => {
    const currentTaskId = ++executionIdRef.current;
    setIsProcessing(true);
    try {
      const q = activeMeta.targetFormat === 'image/png' ? 1.0 : currentQuality / 100;
      const blob = await CanvasEngine.compress(img, {
        format: activeMeta.targetFormat,
        quality: q,
      });

      // Discard stale responses if a newer conversion was triggered in the meantime
      if (currentTaskId !== executionIdRef.current) return;

      setConvertedBlob(blob);
      if (convertedPreviewUrl && convertedPreviewUrl !== sourcePreviewUrl) {
        revokeSafeObjectURL(convertedPreviewUrl);
      }
      const resUrl = createSafeObjectURL(blob);
      setConvertedPreviewUrl(resUrl);

      if (notifyOnSuccess) {
        onNotify('Converted Successfully', `Target: ${activeMeta.to} format`, 'success');
      }
    } catch (e: any) {
      if (currentTaskId !== executionIdRef.current) return;
      onNotify('Conversion Failed', e?.message || 'Error converting graphic', 'error');
    } finally {
      if (currentTaskId === executionIdRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const handleFileLoaded = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setSourceFile(file);
    setConvertedBlob(null);
    if (convertedPreviewUrl && convertedPreviewUrl !== sourcePreviewUrl) {
      revokeSafeObjectURL(convertedPreviewUrl);
    }
    setConvertedPreviewUrl(null);

    if (activeToolId === 'heic-to-jpg') {
      try {
        setIsProcessing(true);
        const jpegBlob = await convertHeicToJpeg(file);
        const preview = createSafeObjectURL(jpegBlob);
        setSourcePreviewUrl(preview);
        setConvertedBlob(jpegBlob);
        setConvertedPreviewUrl(preview);

        // Load image to compute dimensions
        const img = new Image();
        img.onload = () => {
          setImgDimensions({
            width: img.naturalWidth || img.width || 800,
            height: img.naturalHeight || img.height || 600,
          });
        };
        img.src = preview;

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
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;
      setImgDimensions({ width: w, height: h });
      runConversion(img, quality, true);
    };
    img.onerror = () => {
      onNotify('File Error', 'Could not decode image. The file might be corrupted or unsupported.', 'error');
      setIsProcessing(false);
    };
    img.src = preview;
  };

  // Load initial files if passed from global drop zone
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileLoaded(initialFiles);
      onClearPendingFiles?.();
    }
  }, [initialFiles]);

  const handleDownload = useCallback(() => {
    if (!convertedBlob || !sourceFile) return;
    const baseName = sourceFile.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}.${activeMeta.extension}`;
    triggerFileDownload(convertedBlob, outName);
    onNotify('Download Started', `Saved ${outName}`, 'success');
  }, [convertedBlob, sourceFile, activeMeta.extension, onNotify]);

  const handleReset = useCallback(() => {
    setSourceFile(null);
    setConvertedBlob(null);
    if (sourcePreviewUrl) revokeSafeObjectURL(sourcePreviewUrl);
    if (convertedPreviewUrl && convertedPreviewUrl !== sourcePreviewUrl) revokeSafeObjectURL(convertedPreviewUrl);
    setSourcePreviewUrl(null);
    setConvertedPreviewUrl(null);
    setImgDimensions(null);
  }, [sourcePreviewUrl, convertedPreviewUrl]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (qualityDebounceTimerRef.current) {
        clearTimeout(qualityDebounceTimerRef.current);
      }
      if (sourcePreviewUrl) revokeSafeObjectURL(sourcePreviewUrl);
      if (convertedPreviewUrl && convertedPreviewUrl !== sourcePreviewUrl) revokeSafeObjectURL(convertedPreviewUrl);
    };
  }, [sourcePreviewUrl, convertedPreviewUrl]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (sourceFile) {
          e.preventDefault();
          handleReset();
          onNotify('Reset', 'Cleared workspace.', 'info');
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (convertedBlob) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (convertedBlob) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sourceFile, convertedBlob, handleDownload, handleReset, onNotify]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header Section */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Client-Side Engine · Zero Uploads</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {activeMeta.name} Converter
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          {activeMeta.description}
        </p>
      </div>

      {/* 8 Converters Tabs Grid (Soft Unboxed Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {CONVERTER_TOOLS.map((t) => {
          const isSelected = activeToolId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleToolChange(t.id)}
              className={`p-3 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                isSelected
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                    : 'bg-zinc-900 text-white shadow-xs font-semibold'
                  : isDark
                    ? 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    : 'bg-zinc-100/70 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-zinc-900 text-blue-400'
                      : 'bg-zinc-800 text-blue-300'
                    : isDark
                      ? 'bg-zinc-800/60 text-zinc-400'
                      : 'bg-white text-zinc-600 shadow-xs'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold leading-tight line-clamp-1">
                {t.from} → {t.to}
              </span>
              {t.badge && (
                <span
                  className={`mt-1 text-[9px] font-mono px-1 py-0.2 rounded ${
                    isSelected
                      ? isDark
                        ? 'bg-zinc-950 text-blue-400'
                        : 'bg-zinc-800 text-blue-300'
                      : isDark
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-white text-zinc-600'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Workspace: Unboxed 2D Flat Dropzone or Active State */}
      {!sourceFile ? (
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={handleFileLoaded}
            accept={activeMeta.accept}
            title={`Drop ${activeMeta.from} file to convert to ${activeMeta.to}`}
            description={`Instant client-side encoding with zero server uploads`}
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
                {sourcePreviewUrl && (
                  <img src={sourcePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className={`text-xs sm:text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {sourceFile.name}
                </h3>
                <div className={`flex items-center gap-2 text-[11px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <span>Original: {formatBytes(sourceFile.size)}</span>
                  {imgDimensions && (
                    <>
                      <span>·</span>
                      <span>{imgDimensions.width} × {imgDimensions.height} px</span>
                    </>
                  )}
                  {convertedBlob && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500 font-semibold">Output: {formatBytes(convertedBlob.size)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace File</span>
              </button>

              <button
                disabled={!convertedBlob || isProcessing}
                onClick={handleDownload}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {activeMeta.to} {convertedBlob ? `(${formatBytes(convertedBlob.size)})` : ''}</span>
              </button>
            </div>
          </div>

          {/* Quality Control Card if format supports lossy quantization */}
          {activeMeta.targetFormat !== 'image/png' && (
            <div
              className={`p-4 sm:p-5 rounded-xl border max-w-xl mx-auto space-y-3 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <label className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Encoding Quality
                </label>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-800 bg-zinc-100'}`}>
                  {quality}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuality(val);
                  if (sourcePreviewUrl) {
                    if (qualityDebounceTimerRef.current) {
                      clearTimeout(qualityDebounceTimerRef.current);
                    }
                    qualityDebounceTimerRef.current = setTimeout(() => {
                      const img = new Image();
                      img.onload = () => runConversion(img, val, false);
                      img.src = sourcePreviewUrl;
                    }, 60);
                  }
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Adjust compression ratio vs visual sharpness. Default 85% is ideal for web graphics.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId={activeToolId} />
    </div>
  );
};
