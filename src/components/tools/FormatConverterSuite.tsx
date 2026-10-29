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
  Target,
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
  const [mode, setMode] = useState<'target-size' | 'quality'>('target-size');
  const [quality, setQuality] = useState<number>(85);
  const [targetKb, setTargetKb] = useState<number>(100);
  const [targetKbInput, setTargetKbInput] = useState<string>('100');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [outputDimensions, setOutputDimensions] = useState<{ width: number; height: number } | null>(null);
  const [wasDownscaled, setWasDownscaled] = useState<boolean>(false);

  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const executionIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);

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
    setOutputDimensions(null);
    setWasDownscaled(false);
    imageElementRef.current = null;
    try {
      window.history.pushState(null, '', `/${newToolId}`);
    } catch {
      // safe fallback if history API is restricted
    }
  };

  const runConversion = async (
    img: HTMLImageElement,
    currentQuality: number,
    currentTargetKb: number,
    currentMode: 'target-size' | 'quality',
    notifyOnSuccess: boolean = true
  ) => {
    const currentTaskId = ++executionIdRef.current;
    setIsProcessing(true);
    setWasDownscaled(false);
    try {
      let blob: Blob;
      let outW = img.naturalWidth || img.width;
      let outH = img.naturalHeight || img.height;
      let didDownscale = false;

      if (currentMode === 'target-size') {
        const res = await CanvasEngine.compressToTargetSize(img, {
          targetKb: currentTargetKb,
          format: activeMeta.targetFormat,
          allowDownscaling: true,
        });
        blob = res.blob;
        outW = res.width;
        outH = res.height;
        didDownscale = res.wasDownscaled;
      } else {
        const q = activeMeta.targetFormat === 'image/png' ? 1.0 : currentQuality / 100;
        blob = await CanvasEngine.compress(img, {
          format: activeMeta.targetFormat,
          quality: q,
        });
      }

      // Discard stale responses if a newer conversion was triggered in the meantime
      if (currentTaskId !== executionIdRef.current) return;

      setConvertedBlob(blob);
      setWasDownscaled(didDownscale);
      setOutputDimensions({ width: outW, height: outH });

      if (convertedPreviewUrl && convertedPreviewUrl !== sourcePreviewUrl) {
        revokeSafeObjectURL(convertedPreviewUrl);
      }
      const resUrl = createSafeObjectURL(blob);
      setConvertedPreviewUrl(resUrl);

      if (didDownscale) {
        onNotify(
          'Dimensions Auto-Adjusted',
          `Resolution reduced to ${outW}×${outH}px to strictly meet the ${currentTargetKb} KB limit.`,
          'info'
        );
      } else if (notifyOnSuccess) {
        onNotify('Converted Successfully', `Target: ${activeMeta.to} format (${formatBytes(blob.size)})`, 'success');
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

  const triggerConversionDebounced = (
    newQuality: number,
    newTargetKb: number,
    newMode: 'target-size' | 'quality'
  ) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (imageElementRef.current) {
        runConversion(imageElementRef.current, newQuality, newTargetKb, newMode, false);
      }
    }, 70);
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
    setIsProcessing(true);

    try {
      let img: HTMLImageElement;
      let preview: string;

      if (activeToolId === 'heic-to-jpg') {
        const jpegBlob = await convertHeicToJpeg(file);
        img = await CanvasEngine.loadImage(jpegBlob);
        preview = createSafeObjectURL(jpegBlob);
      } else {
        // Automatically extracts and corrects EXIF rotation for iPhone/Android photos
        img = await CanvasEngine.loadImage(file);
        preview = img.src.startsWith('blob:') ? img.src : createSafeObjectURL(file);
      }

      imageElementRef.current = img;
      setSourcePreviewUrl(preview);
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;
      setImgDimensions({ width: w, height: h });
      setOutputDimensions({ width: w, height: h });

      // Intelligently choose initial target KB (~35% of original size, clamped between 30 and 4000 KB)
      const initialTarget = Math.min(4000, Math.max(30, Math.round((file.size / 1024) * 0.35)));
      setTargetKb(initialTarget);
      setTargetKbInput(String(initialTarget));

      await runConversion(img, quality, initialTarget, mode, true);
    } catch (err: any) {
      setIsProcessing(false);
      onNotify('File Error', err?.message || 'Could not decode image.', 'error');
    }
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
    setOutputDimensions(null);
    setWasDownscaled(false);
    imageElementRef.current = null;
  }, [sourcePreviewUrl, convertedPreviewUrl]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
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

  const savings =
    convertedBlob && sourceFile && sourceFile.size > convertedBlob.size
      ? Math.round(((sourceFile.size - convertedBlob.size) / sourceFile.size) * 100)
      : 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Top Inline Hero Row */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            {activeMeta.name} Converter
          </h1>
          {/* Format Switch Pills */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CONVERTER_TOOLS.map((t) => {
              const isSelected = activeToolId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToolChange(t.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {t.from}→{t.to}
                </button>
              );
            })}
          </div>
          {sourceFile && (
            <span className="text-[10px] font-mono text-zinc-400 hidden md:inline-block truncate max-w-[120px]">
              {sourceFile.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {sourceFile ? (
            <>
              {/* Live Status Pill */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  {isProcessing
                    ? 'Converting...'
                    : convertedBlob
                      ? `✓ ${formatBytes(convertedBlob.size)} (${activeMeta.to.toUpperCase()})`
                      : 'Ready'}
                </span>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New</span>
              </button>
            </>
          ) : (
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Client-Side</span>
            </span>
          )}
        </div>
      </div>

      {/* Workspace: Empty Dropzone or Active State */}
      {!sourceFile ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Mobile Format Switch Pills */}
          <div className="flex sm:hidden items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {CONVERTER_TOOLS.map((t) => {
              const isSelected = activeToolId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToolChange(t.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {t.from}→{t.to}
                </button>
              );
            })}
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={handleFileLoaded}
              accept={activeMeta.accept}
              title={`Drop ${activeMeta.from} file to convert to ${activeMeta.to}`}
              description="Instant client-side encoding with zero server uploads"
              className="h-[230px] sm:h-[260px] lg:h-[280px]"
            />
          </div>
        </div>
      ) : (
        /* Active Workspace: 2-Column Zero-Scroll Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-start">
          {/* Left Column: Canvas Preview & Tuning (lg:col-span-7 xl:col-span-8) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-1.5">
            {/* Studio Canvas Preview */}
            <div
              className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 flex items-center justify-center select-none transition-colors h-[230px] sm:h-[260px] lg:h-[280px] xl:h-[300px]"
              style={{
                backgroundImage: isDark
                  ? 'radial-gradient(#27272a 1.2px, transparent 1.2px)'
                  : 'radial-gradient(#d4d4d8 1.2px, transparent 1.2px)',
                backgroundSize: '16px 16px',
              }}
            >
              {convertedPreviewUrl || sourcePreviewUrl ? (
                <img
                  src={convertedPreviewUrl || sourcePreviewUrl || ''}
                  alt="Converted Output Preview"
                  className="max-h-[210px] sm:max-h-[240px] lg:max-h-[260px] max-w-[90%] object-contain rounded-md shadow-md border border-zinc-200 dark:border-zinc-700 bg-white"
                />
              ) : (
                <div className="text-center p-4">
                  <FileCode className="w-12 h-12 mx-auto text-zinc-400 mb-2 opacity-50" />
                  <p className="text-xs text-zinc-500">Processing image data...</p>
                </div>
              )}

              {/* Top-Left Live Metadata Pill */}
              <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-white border border-zinc-700/50 backdrop-blur-xs flex items-center gap-1">
                  Original {formatBytes(sourceFile.size)} · {imgDimensions ? `${imgDimensions.width}×${imgDimensions.height}px` : ''}
                </span>
                {convertedBlob && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 backdrop-blur-xs font-semibold">
                    {activeMeta.to.toUpperCase()}: {formatBytes(convertedBlob.size)}
                  </span>
                )}
              </div>

              {/* Downscaled Warning Pill if Auto-Downscaled */}
              {wasDownscaled && outputDimensions && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 pointer-events-none z-10">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 backdrop-blur-xs flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    Auto-scaled to {outputDimensions.width}×{outputDimensions.height}px
                  </span>
                </div>
              )}
            </div>

            {/* Docked Controls Strip */}
            <div className="p-1.5 sm:p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between flex-wrap gap-1.5">
              {/* Mode Toggle: Target KB vs Quality % */}
              <div className="flex items-center gap-1">
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('target-size');
                      triggerConversionDebounced(quality, targetKb, 'target-size');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      mode === 'target-size'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Target KB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('quality');
                      triggerConversionDebounced(quality, targetKb, 'quality');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      mode === 'quality'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Quality %
                  </button>
                </div>
              </div>

              {mode === 'target-size' ? (
                /* Target KB Presets & Input */
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[20, 50, 100, 200, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setTargetKb(preset);
                        setTargetKbInput(String(preset));
                        triggerConversionDebounced(quality, preset, 'target-size');
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                        targetKb === preset
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      {preset}KB
                    </button>
                  ))}
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={targetKbInput}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setTargetKbInput(valStr);
                        const num = parseInt(valStr, 10);
                        if (!isNaN(num) && num >= 5) {
                          setTargetKb(num);
                          triggerConversionDebounced(quality, num, 'target-size');
                        }
                      }}
                      className="w-14 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[10px] font-mono text-center"
                    />
                    <span className="text-zinc-400">KB</span>
                  </div>
                </div>
              ) : (
                /* Quality % Slider & Presets */
                <div className="flex items-center gap-2 flex-1 max-w-[260px]">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuality(val);
                      triggerConversionDebounced(val, targetKb, 'quality');
                    }}
                    className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                  <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300 font-semibold w-8 text-right">
                    {quality}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Output Verification & Download (lg:col-span-5 xl:col-span-4) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-1.5">
            <div className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              {/* Header / Requirements Summary */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Conversion Verification
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {activeMeta.from} → {activeMeta.to}
                </span>
              </div>

              {/* Compact Check Rows */}
              <div className="space-y-1 text-xs">
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Original Size</span>
                  <span className="font-mono text-[10px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatBytes(sourceFile.size)}
                  </span>
                </div>
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Target Mode</span>
                  <span className="font-mono text-[10px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {mode === 'target-size' ? `< ${targetKb} KB limit` : `${quality}% Quality`}
                  </span>
                </div>
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Output Size</span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isProcessing ? 'Optimizing...' : convertedBlob ? `${formatBytes(convertedBlob.size)} ✓` : '...'}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="px-2 py-1 rounded border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Savings</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      -{savings}% Smaller
                    </span>
                  </div>
                )}
              </div>

              {/* Download CTA Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!convertedBlob || isProcessing}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {convertedBlob
                      ? `Download ${activeMeta.to.toUpperCase()} (${formatBytes(convertedBlob.size)})`
                      : 'Converting...'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId={activeToolId} />
    </div>
  );
};
