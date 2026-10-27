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

          {/* Target Size vs Final Output Size Side-by-Side Verification Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Original Size */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Original Size
              </span>
              <span className={`text-base sm:text-lg font-bold mt-1 block ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {formatBytes(sourceFile.size)}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block truncate">
                {imgDimensions ? `${imgDimensions.width} × ${imgDimensions.height} px` : sourceFile.type}
              </span>
            </div>

            {/* Card 2: Target Size / Limit */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-blue-500/30' : 'bg-blue-50/50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Target Size Limit
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                  {mode === 'target-size' ? 'Strict Ceiling' : 'Quality Mode'}
                </span>
              </div>
              <span className={`text-base sm:text-lg font-bold mt-1 block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {mode === 'target-size' ? `${targetKb} KB` : `${quality}%`}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block truncate">
                {mode === 'target-size' ? 'Portal & Upload Safe' : 'Standard Web Quality'}
              </span>
            </div>

            {/* Card 3: Final Output Size */}
            <div className={`p-4 rounded-xl border ${convertedBlob ? (isDark ? 'bg-zinc-900 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200') : (isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200')}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Final Output Size
                </span>
                {convertedBlob && mode === 'target-size' && convertedBlob.size <= targetKb * 1024 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                    ✓ Compliant
                  </span>
                )}
              </div>
              <span className="text-base sm:text-lg font-bold mt-1 block text-emerald-500">
                {isProcessing ? 'Optimizing...' : convertedBlob ? formatBytes(convertedBlob.size) : 'Calculating...'}
              </span>
              <span className="text-[11px] text-emerald-500/80 font-mono mt-0.5 block truncate">
                {convertedBlob ? (
                  mode === 'target-size' && convertedBlob.size <= targetKb * 1024
                    ? `✓ Under ${targetKb} KB Target Limit`
                    : sourceFile.size > convertedBlob.size
                      ? `${Math.round(((sourceFile.size - convertedBlob.size) / sourceFile.size) * 100)}% smaller`
                      : `${outputDimensions ? `${outputDimensions.width}×${outputDimensions.height}px` : ''}`
                ) : '...'}
              </span>
            </div>
          </div>

          {/* Downscaled Warning badge if solver automatically resized dimensions for quota */}
          {wasDownscaled && outputDimensions && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-xs flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0 text-indigo-500" />
              <span>
                <strong>Dimensions Auto-Adjusted:</strong> Scaled down to {outputDimensions.width}×{outputDimensions.height} px to strictly comply with your {targetKb} KB limit.
              </span>
            </div>
          )}

          {/* Size & Quality Control Panel */}
          <div
            className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Output Size & Encoding Controls
                </span>
              </div>

              {/* Mode Toggle: Target KB vs Quality */}
              <div className={`flex items-center p-0.5 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('target-size');
                    triggerConversionDebounced(quality, targetKb, 'target-size');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    mode === 'target-size'
                      ? isDark
                        ? 'bg-zinc-700 text-white shadow-xs font-semibold'
                        : 'bg-white text-zinc-900 shadow-xs font-semibold'
                      : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Target KB Quota
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('quality');
                    triggerConversionDebounced(quality, targetKb, 'quality');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    mode === 'quality'
                      ? isDark
                        ? 'bg-zinc-700 text-white shadow-xs font-semibold'
                        : 'bg-white text-zinc-900 shadow-xs font-semibold'
                      : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Quality %
                </button>
              </div>
            </div>

            {mode === 'target-size' ? (
              <div className="space-y-3">
                {/* Target KB Presets */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Quick Presets:
                  </span>
                  {[20, 50, 100, 200, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setTargetKb(preset);
                        setTargetKbInput(String(preset));
                        triggerConversionDebounced(quality, preset, 'target-size');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        targetKb === preset
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {preset} KB
                    </button>
                  ))}
                </div>

                {/* Target KB Input Field */}
                <div className="flex items-center gap-3">
                  <label className={`text-xs font-medium shrink-0 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Custom Limit:
                  </label>
                  <div className="relative max-w-[140px]">
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
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                      placeholder="e.g. 50"
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-zinc-400 pointer-events-none font-mono">
                      KB
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Strict size limit. Automatically scales dimensions if needed.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
                    triggerConversionDebounced(val, targetKb, 'quality');
                  }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Adjust compression ratio vs visual sharpness. Default 85% is ideal for web graphics.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId={activeToolId} />
    </div>
  );
};
