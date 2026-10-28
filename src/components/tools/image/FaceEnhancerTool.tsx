'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Share2,
  RotateCcw,
  Sliders,
  Check,
  Eye,
  Zap,
  Cpu,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Upload,
  Image as ImageIcon,
  Wand2,
  ShieldCheck,
  Sun,
  Film,
  Feather,
  Loader2,
  Info,
} from 'lucide-react';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { ComparisonSlider } from '../../ui/ComparisonSlider';
import { useTheme } from '../../../core/themeContext';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { ImageToolGuideSection } from './ImageToolGuideSection';
import { triggerFileDownload, formatBytes } from '../../../utils/memory';
import { copyImageToClipboard, shareFileOrBlob, isShareSupported } from '../../../utils/clipboardAndShare';
import {
  FaceEnhancerEngine,
  FaceEnhanceSettings,
  DEFAULT_ENHANCE_SETTINGS,
  FACE_ENHANCER_PRESETS,
  FacePreset,
} from '../../../core/engine/FaceEnhancerEngine';
import { FaceEnhanceWorkerClient } from '../../../core/engine/FaceEnhanceWorkerClient';

interface FaceEnhancerToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFiles?: File[] | null;
}

type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';
type ViewMode = 'split' | 'side-by-side' | 'enhanced-only';

export const FaceEnhancerTool: React.FC<FaceEnhancerToolProps> = ({ onNotify, initialFiles }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  // Hardware acceleration status
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Settings & Presets
  const [settings, setSettings] = useState<FaceEnhanceSettings>(DEFAULT_ENHANCE_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>('smart-auto');
  const [upscaleFactor, setUpscaleFactor] = useState<1 | 2 | 4>(1);

  // Export settings
  const [exportFormat, setExportFormat] = useState<OutputFormat>('image/jpeg');
  const [exportQuality, setExportQuality] = useState<number>(92); // 70 to 100

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Processing & Worker state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [enhancedDimensions, setEnhancedDimensions] = useState<{ width: number; height: number } | null>(null);

  const workerClientRef = useRef<FaceEnhanceWorkerClient | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Check WebGPU availability
  useEffect(() => {
    async function checkWebGPU() {
      if (typeof window !== 'undefined' && 'navigator' in window && 'gpu' in navigator && (navigator as any).gpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setHasWebGPU(!!adapter);
        } catch {
          setHasWebGPU(false);
        }
      } else {
        setHasWebGPU(false);
      }
    }
    checkWebGPU();
  }, []);

  // Initialize Worker client on mount
  useEffect(() => {
    workerClientRef.current = new FaceEnhanceWorkerClient();
    return () => {
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
        workerClientRef.current = null;
      }
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  // Load initial file if provided
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !currentImage) {
      loadFile(initialFiles[0]);
    }
  }, [initialFiles, loadFile, currentImage]);

  // When a new image is loaded, set up initial sources and trigger initial smart enhance
  useEffect(() => {
    if (!currentImage) {
      setPreviewSrc(null);
      setOriginalSrc(null);
      setProcessedBlob(null);
      setEnhancedDimensions(null);
      return;
    }

    const img = currentImage.imageElement;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // Create original preview URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const origDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
      setOriginalSrc(origDataUrl);
    }

    // Apply default preset
    applyPreset('smart-auto');
  }, [currentImage]);

  // Execute Face Enhancement pipeline
  const runEnhancement = useCallback(
    async (targetSettings: FaceEnhanceSettings, targetUpscale: 1 | 2 | 4) => {
      if (!currentImage) return;

      setIsProcessing(true);
      setProgressPercent(5);
      setProgressStage('Preparing canvas...');

      try {
        const img = currentImage.imageElement;
        const sourceW = img.naturalWidth || img.width;
        const sourceH = img.naturalHeight || img.height;

        // Render to working canvas
        const canvas = document.createElement('canvas');
        canvas.width = sourceW;
        canvas.height = sourceH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Could not create canvas context');

        ctx.drawImage(img, 0, 0);
        const sourceImageData = ctx.getImageData(0, 0, sourceW, sourceH);

        let finalImageData: ImageData;

        // If worker is available, run off-main-thread
        if (workerClientRef.current) {
          finalImageData = await workerClientRef.current.process(
            sourceImageData,
            targetSettings,
            targetUpscale,
            (pct, stage) => {
              setProgressPercent(pct);
              setProgressStage(stage);
            }
          );
        } else {
          // Main-thread synchronous fallback
          setProgressStage('Processing on main thread...');
          const enhancedCanvas = FaceEnhancerEngine.processImage(canvas, targetSettings);
          const ectx = enhancedCanvas.getContext('2d');
          finalImageData = ectx!.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
          setProgressPercent(100);
        }

        // Render final result to canvas
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = finalImageData.width;
        outputCanvas.height = finalImageData.height;
        const outCtx = outputCanvas.getContext('2d');
        if (outCtx) {
          outCtx.putImageData(finalImageData, 0, 0);
        }

        setEnhancedDimensions({ width: finalImageData.width, height: finalImageData.height });

        // Convert to Blob
        outputCanvas.toBlob(
          (blob) => {
            if (blob) {
              if (activeBlobUrlRef.current) {
                URL.revokeObjectURL(activeBlobUrlRef.current);
              }
              const url = URL.createObjectURL(blob);
              activeBlobUrlRef.current = url;
              setPreviewSrc(url);
              setProcessedBlob(blob);
            }
            setIsProcessing(false);
          },
          exportFormat,
          exportQuality / 100
        );
      } catch (err: any) {
        console.error('Enhancement pipeline error:', err);
        setIsProcessing(false);
        onNotify('Processing Warning', 'Enhanced with standard engine: ' + (err.message || ''), 'info');
      }
    },
    [currentImage, exportFormat, exportQuality, onNotify]
  );

  // Debounced auto-run when sliders or upscale change
  const scheduleEnhancement = useCallback(
    (newSettings: FaceEnhanceSettings, newUpscale: 1 | 2 | 4) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        runEnhancement(newSettings, newUpscale);
      }, 150);
    },
    [runEnhancement]
  );

  // Handle setting slider changes
  const updateSetting = (key: keyof FaceEnhanceSettings, val: number | boolean) => {
    setActivePresetId('custom');
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    scheduleEnhancement(updated, upscaleFactor);
  };

  // Handle preset selection
  const applyPreset = (presetId: string) => {
    const preset = FACE_ENHANCER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(presetId);
    setSettings(preset.settings);
    scheduleEnhancement(preset.settings, upscaleFactor);
  };

  // Handle upscale factor change
  const handleUpscaleChange = (factor: 1 | 2 | 4) => {
    setUpscaleFactor(factor);
    runEnhancement(settings, factor);
  };

  // Download enhanced image
  const handleDownload = () => {
    if (!processedBlob || !currentImage) return;
    const baseName = currentImage.file.name.replace(/\.[^/.]+$/, '');
    const ext = exportFormat === 'image/jpeg' ? 'jpg' : exportFormat === 'image/png' ? 'png' : 'webp';
    const upscaleSuffix = upscaleFactor > 1 ? `_${upscaleFactor}x_HD` : '_enhanced';
    triggerFileDownload(processedBlob, `${baseName}${upscaleSuffix}.${ext}`);
    onNotify('Download Started', `Saved as high-res ${ext.toUpperCase()}`, 'success');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!processedBlob) return;
    try {
      await copyImageToClipboard(processedBlob);
      onNotify('Copied to Clipboard', 'Portrait ready to paste anywhere', 'success');
    } catch {
      onNotify('Clipboard Error', 'Please use Direct Download instead', 'error');
    }
  };

  // Share
  const handleShare = async () => {
    if (!processedBlob || !currentImage) return;
    try {
      const ext = exportFormat === 'image/jpeg' ? 'jpg' : 'png';
      await shareFileOrBlob({
        blob: processedBlob,
        filename: `enhanced_portrait.${ext}`,
        title: 'Enhanced Face Portrait',
        text: 'Enhanced with FileWala AI Face Enhancer',
      });
      onNotify('Shared Successfully', '', 'success');
    } catch {
      // Ignored if user dismissed share sheet
    }
  };

  // Reset to original settings
  const handleReset = () => {
    applyPreset('smart-auto');
    setUpscaleFactor(1);
    onNotify('Settings Reset', 'Restored to Smart Auto AI defaults', 'info');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10">
      {/* Tool Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 dark:border-zinc-800 border-zinc-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                AI Face Enhancer & Photo Retouch
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Instant In-Browser Portrait Enhancement, Skin Smoothing & Eye Clarity with Zero Uploads
              </p>
            </div>
          </div>
        </div>

        {/* Hardware Acceleration Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {hasWebGPU ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>WebGPU Hardware Accelerated</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Cpu className="w-3.5 h-3.5" />
              <span>Multi-Threaded Worker + WebGL</span>
            </div>
          )}
        </div>
      </div>

      {!currentImage ? (
        /* Empty Upload State */
        <div className="max-w-2xl mx-auto space-y-6">
          <Dropzone
            onFilesSelected={(files) => {
              if (files.length > 0) loadFile(files[0]);
            }}
            title="Upload Portrait, Selfie, or ID Photo"
            description="Drag & drop or click to enhance facial clarity, smooth skin, and unblur eyes"
            accept="image/*"
          />

          {/* Quick Features Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <Wand2 className="w-5 h-5 mx-auto text-rose-500 mb-2" />
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Smart Skin Soften</h4>
              <p className="text-xs text-zinc-500 mt-1">Blends blemishes & rough pores while preserving facial edge sharpness</p>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <Eye className="w-5 h-5 mx-auto text-blue-500 mb-2" />
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Eye & Teeth Clarity</h4>
              <p className="text-xs text-zinc-500 mt-1">Sharpens pupils, eyelashes, and brightens smile with zero halo artifacts</p>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <Layers className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">2x / 4x HD Upscale</h4>
              <p className="text-xs text-zinc-500 mt-1">Super-resolution upscaling for passport photos, prints, and high-res avatars</p>
            </div>
          </div>
        </div>
      ) : (
        /* Active Enhancement Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visual Comparison Area (8 Columns) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Top Workspace Toolbar */}
            <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {currentImage.file.name}
                </span>
                <span className="text-xs text-zinc-400">
                  {enhancedDimensions ? `${enhancedDimensions.width} × ${enhancedDimensions.height} px` : `${currentImage.width} × ${currentImage.height} px`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hold to Compare Button */}
                <button
                  type="button"
                  onMouseDown={() => setIsHoldingOriginal(true)}
                  onMouseUp={() => setIsHoldingOriginal(false)}
                  onTouchStart={() => setIsHoldingOriginal(true)}
                  onTouchEnd={() => setIsHoldingOriginal(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition select-none ${
                    isHoldingOriginal
                      ? 'bg-rose-500 text-white'
                      : isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                  title="Press and hold to see original raw image"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hold for Original</span>
                </button>

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                      viewMode === 'split' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title="Split Comparison Slider"
                  >
                    <Columns className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('enhanced-only')}
                    className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                      viewMode === 'enhanced-only' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title="Enhanced Only"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reset & Upload New */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Reset to Smart Auto Defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={resetImage}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Change Image"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Preview Canvas with Comparison Slider */}
            <div className={`relative min-h-[460px] max-h-[680px] w-full rounded-2xl overflow-hidden border flex items-center justify-center ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
              {/* Processing Progress Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-white text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
                  <p className="text-sm font-semibold tracking-wide">{progressStage || 'Enhancing Portrait...'}</p>
                  <div className="w-64 max-w-full bg-white/20 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/70 mt-1.5">{progressPercent}%</span>
                </div>
              )}

              {/* Hold for Original Preview Override */}
              {isHoldingOriginal && originalSrc ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img
                    src={originalSrc}
                    alt="Original Raw"
                    className="max-h-[600px] w-auto max-w-full object-contain rounded-lg shadow-xl"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/20">
                    RAW ORIGINAL
                  </div>
                </div>
              ) : viewMode === 'split' && originalSrc && previewSrc ? (
                /* Interactive Split Slider */
                <div className="w-full h-full p-2 flex items-center justify-center">
                  <ComparisonSlider
                    originalSrc={originalSrc}
                    processedSrc={previewSrc}
                    originalLabel="Original"
                    processedLabel={upscaleFactor > 1 ? `Enhanced (${upscaleFactor}x HD)` : 'AI Enhanced'}
                    className="max-h-[620px] w-full rounded-xl overflow-hidden shadow-2xl"
                  />
                </div>
              ) : previewSrc ? (
                /* Enhanced Only View */
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img
                    src={previewSrc}
                    alt="AI Enhanced Portrait"
                    className="max-h-[600px] w-auto max-w-full object-contain rounded-lg shadow-2xl"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-rose-500 text-white text-xs font-semibold rounded-full shadow-lg">
                    {upscaleFactor > 1 ? `ENHANCED (${upscaleFactor}x HD)` : 'AI ENHANCED'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm">Initializing Face Engine...</span>
                </div>
              )}
            </div>

            {/* Hint bar */}
            <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
              <span>Drag the split handle horizontally to inspect facial details side-by-side.</span>
              <span className="hidden sm:inline">100% Client-Side In-Browser Processing</span>
            </div>
          </div>

          {/* Controls & Export Panel (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Presets Selector */}
            <div className={`p-5 rounded-2xl border space-y-3.5 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-rose-500" />
                  <span>1-Click AI Presets</span>
                </h3>
                {activePresetId !== 'custom' && (
                  <span className="text-[11px] font-medium text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {FACE_ENHANCER_PRESETS.map((p) => {
                  const isActive = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`flex flex-col items-start p-2.5 rounded-xl text-left border transition cursor-pointer ${
                        isActive
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                          : isDark
                          ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 text-zinc-300'
                          : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold">{p.name}</span>
                        {p.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold uppercase">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{p.tagline}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Super-Resolution Upscaling */}
            <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>AI Super-Resolution Upscale</span>
                </h3>
                <span className="text-xs font-semibold text-blue-500">{upscaleFactor}x Resolution</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpscaleChange(1)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                    upscaleFactor === 1
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : isDark
                      ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  }`}
                >
                  1x Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleUpscaleChange(2)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                    upscaleFactor === 2
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : isDark
                      ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  }`}
                >
                  2x HD
                </button>
                <button
                  type="button"
                  onClick={() => handleUpscaleChange(4)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                    upscaleFactor === 4
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : isDark
                      ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  }`}
                >
                  4x Ultra HD
                </button>
              </div>
            </div>

            {/* Fine-Tuning Retouch Sliders */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>Pro Facial Adjustments</span>
              </h3>

              <div className="space-y-4">
                {/* Skin Smoothing */}
                <Slider
                  label="Skin Smoothing & Denoise"
                  unit="%"
                  min={0}
                  max={100}
                  value={settings.smooth}
                  onChange={(val) => updateSetting('smooth', val)}
                />

                {/* Facial Sharpening */}
                <Slider
                  label="Sharpening & Eye Contours"
                  unit="%"
                  min={0}
                  max={100}
                  value={settings.sharpness}
                  onChange={(val) => updateSetting('sharpness', val)}
                />

                {/* Eye & Teeth Clarity */}
                <Slider
                  label="Eye & Teeth Brightening"
                  unit="%"
                  min={0}
                  max={100}
                  value={settings.eyeTeethClarity}
                  onChange={(val) => updateSetting('eyeTeethClarity', val)}
                />

                {/* Studio Skin Glow */}
                <Slider
                  label="Studio Skin Radiance"
                  unit="%"
                  min={0}
                  max={100}
                  value={settings.glow}
                  onChange={(val) => updateSetting('glow', val)}
                />

                {/* Skin Warmth */}
                <Slider
                  label="Skin Warmth (Tone)"
                  min={-50}
                  max={50}
                  value={settings.warmth}
                  onChange={(val) => updateSetting('warmth', val)}
                />

                {/* Exposure / Brightness */}
                <Slider
                  label="Face Exposure Lift"
                  min={-50}
                  max={50}
                  value={settings.brightness}
                  onChange={(val) => updateSetting('brightness', val)}
                />

                {/* Dynamic Contrast */}
                <Slider
                  label="Dynamic Contrast"
                  min={-50}
                  max={50}
                  value={settings.contrast}
                  onChange={(val) => updateSetting('contrast', val)}
                />
              </div>
            </div>

            {/* Export & Download Card */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                <span>Export & Download</span>
                {processedBlob && (
                  <span className="text-xs text-zinc-400 font-normal">
                    {formatBytes(processedBlob.size)}
                  </span>
                )}
              </h3>

              {/* Format selection */}
              <div className="grid grid-cols-3 gap-2">
                {(['image/jpeg', 'image/png', 'image/webp'] as OutputFormat[]).map((fmt) => {
                  const label = fmt === 'image/jpeg' ? 'JPG' : fmt === 'image/png' ? 'PNG' : 'WebP';
                  const isSelected = exportFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => {
                        setExportFormat(fmt);
                        runEnhancement(settings, upscaleFactor);
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                          : isDark
                          ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Quality slider for JPG / WebP */}
              {exportFormat !== 'image/png' && (
                <Slider
                  label="Compression Quality"
                  unit="%"
                  min={70}
                  max={100}
                  value={exportQuality}
                  onChange={(val) => {
                    setExportQuality(val);
                    runEnhancement(settings, upscaleFactor);
                  }}
                />
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleDownload}
                  disabled={!processedBlob || isProcessing}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Enhanced Photo</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!processedBlob || isProcessing}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                        : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!processedBlob || isProcessing}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                        : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive SEO & Educational Guide Section */}
      <div className="pt-8">
        <ImageToolGuideSection toolId="face-enhancer" />
      </div>
    </div>
  );
};
