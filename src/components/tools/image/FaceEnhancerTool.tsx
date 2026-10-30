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
  ChevronDown,
  Info,
} from 'lucide-react';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { ComparisonSlider } from '../../ui/ComparisonSlider';
import { HumanLoadingOverlay } from '../../ui/HumanLoadingOverlay';
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
import { NeuralFaceEnhancer, AI_MODEL_CONFIGS, NeuralModelKey } from '../../../core/engine/NeuralFaceEnhancer';

interface FaceEnhancerToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFiles?: File[] | null;
}

type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';
type ViewMode = 'split' | 'side-by-side' | 'enhanced-only';

export const FaceEnhancerTool: React.FC<FaceEnhancerToolProps> = ({ onNotify, initialFiles }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentImage, isLoading: isImageLoading, loadFile, reset: resetImage } = useImageUpload();

  // Hardware acceleration status
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Engine Mode
  const [activeEngineMode, setActiveEngineMode] = useState<'neural' | 'sliders'>('neural');
  const [neuralModelKey, setNeuralModelKey] = useState<NeuralModelKey>('gfpgan-v14');
  const [neuralBlendStrength, setNeuralBlendStrength] = useState<number>(100);
  // Settings & Presets
  const [settings, setSettings] = useState<FaceEnhanceSettings>(DEFAULT_ENHANCE_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>('samsung-ai');
  const [upscaleFactor, setUpscaleFactor] = useState<1 | 2 | 4>(2);
  const [showAdvancedSliders, setShowAdvancedSliders] = useState<boolean>(false);

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
  const isInitialLoadRef = useRef<boolean>(true);
  const neuralRestoredCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastProcessedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasNeuralRestoration, setHasNeuralRestoration] = useState<boolean>(false);

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

  // Initialize Worker client on mount with idle pre-loading
  useEffect(() => {
    workerClientRef.current = new FaceEnhanceWorkerClient();
    NeuralFaceEnhancer.preload();
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
        workerClientRef.current = null;
      }
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      NeuralFaceEnhancer.terminateWorker();
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
      neuralRestoredCanvasRef.current = null;
      setHasNeuralRestoration(false);
      isInitialLoadRef.current = true;
      return;
    }

    isInitialLoadRef.current = true;
    const img = currentImage.imageElement;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // Use instant blob preview URL (zero memory churn, zero main-thread block)
    setOriginalSrc(currentImage.previewUrl);

    // Apply default preset: Samsung AI ProVisual + 2x Super-Resolution
    applyPreset('samsung-ai');
  }, [currentImage]);

  // Execute Face Enhancement pipeline (Always preserves neural face restoration if active)
  const runEnhancement = useCallback(
    async (
      targetSettings: FaceEnhanceSettings,
      targetUpscale: 1 | 2 | 4,
      overrideSourceCanvas?: HTMLCanvasElement | null
    ) => {
      if (!currentImage) return;

      setIsProcessing(true);
      setProgressPercent(5);
      setProgressStage('Preparing canvas...');

      try {
        const baseCanvas = overrideSourceCanvas !== undefined
          ? overrideSourceCanvas
          : neuralRestoredCanvasRef.current;

        const img = currentImage.imageElement;
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        const isMobile =
          typeof navigator !== 'undefined' &&
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        const maxWorkingDim = isMobile ? 1600 : 2560;

        let sourceW: number;
        let sourceH: number;
        let effectiveScale = targetUpscale;

        const canvas = document.createElement('canvas');

        if (baseCanvas) {
          const baseScale = Math.max(1, Math.round(baseCanvas.width / origW));
          if (targetUpscale > baseScale) {
            effectiveScale = Math.round(targetUpscale / baseScale) as 1 | 2 | 4;
            sourceW = baseCanvas.width;
            sourceH = baseCanvas.height;
            canvas.width = sourceW;
            canvas.height = sourceH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not create canvas context');
            ctx.drawImage(baseCanvas, 0, 0);
          } else if (targetUpscale === baseScale) {
            effectiveScale = 1;
            sourceW = baseCanvas.width;
            sourceH = baseCanvas.height;
            canvas.width = sourceW;
            canvas.height = sourceH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not create canvas context');
            ctx.drawImage(baseCanvas, 0, 0);
          } else {
            effectiveScale = 1;
            sourceW = origW * targetUpscale;
            sourceH = origH * targetUpscale;
            canvas.width = sourceW;
            canvas.height = sourceH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not create canvas context');
            ctx.drawImage(baseCanvas, 0, 0, sourceW, sourceH);
          }
        } else {
          sourceW = origW;
          sourceH = origH;
          if (origW > maxWorkingDim || origH > maxWorkingDim) {
            const ratio = maxWorkingDim / Math.max(origW, origH);
            sourceW = Math.round(origW * ratio);
            sourceH = Math.round(origH * ratio);
          }

          // Mobile guard: prevent super-resolution memory blowups on camera images
          const maxAllowedUpscaledPixels = isMobile ? 2400 * 2400 : 4096 * 4096;
          if (sourceW * effectiveScale * (sourceH * effectiveScale) > maxAllowedUpscaledPixels) {
            effectiveScale = 1;
          }

          canvas.width = sourceW;
          canvas.height = sourceH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Could not create canvas context');
          ctx.drawImage(img, 0, 0, sourceW, sourceH);
        }

        const sourceImageData = canvas.getContext('2d')!.getImageData(0, 0, sourceW, sourceH);
        canvas.width = 0;
        canvas.height = 0;

        // When neural face is active, clamp deblur to max 25 so it doesn't over-deconvolve an already crisp AI face
        const sanitizedSettings = baseCanvas
          ? { ...targetSettings, deblur: Math.min(25, targetSettings.deblur) }
          : targetSettings;

        let finalImageData: ImageData;

        // If worker is available, run off-main-thread
        if (workerClientRef.current) {
          finalImageData = await workerClientRef.current.process(
            sourceImageData,
            sanitizedSettings,
            effectiveScale,
            (pct, stage) => {
              setProgressPercent(pct);
              setProgressStage(stage);
            }
          );
        } else {
          // Main-thread synchronous fallback
          setProgressStage('Processing on main thread...');
          const enhancedCanvas = FaceEnhancerEngine.processImage(canvas, sanitizedSettings);
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

        lastProcessedCanvasRef.current = outputCanvas;
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

  // Instant re-encode when changing format or quality without re-running heavy filters
  const reencodeExportBlob = useCallback(
    (targetFormat: OutputFormat, targetQuality: number) => {
      const canvas = lastProcessedCanvasRef.current;
      if (!canvas) return;
      canvas.toBlob(
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
        },
        targetFormat,
        targetQuality / 100
      );
    },
    []
  );

  // Studio-Grade Deep Neural Face Restoration
  const runNeuralRestoration = useCallback(async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStage('Initializing Studio-grade AI Engine...');

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let currentPct = 5;

    const stopProgressTimer = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    };

    try {
      const img = currentImage.imageElement;
      let lastReportedPct = -1;
      const reportProgress = (val: number) => {
        const rounded = Math.round(val);
        if (rounded !== lastReportedPct) {
          lastReportedPct = rounded;
          setProgressPercent(rounded);
        }
      };

      const restoredCanvas = await NeuralFaceEnhancer.restoreFacePatch(img, {
        modelKey: neuralModelKey,
        hasWebGPU: !!hasWebGPU,
        blendStrength: neuralBlendStrength / 100,
        onProgress: (pct, stage) => {
          setProgressStage(stage);
          if (pct >= 70) {
            stopProgressTimer();
            currentPct = Math.max(currentPct, 72);
            reportProgress(currentPct);
            // During heavy neural inference, continuously advance progress towards 94%
            // with 200ms interval to eliminate 14/sec component re-renders
            progressTimer = setInterval(() => {
              if (currentPct < 94) {
                currentPct += (94.5 - currentPct) * 0.05;
                reportProgress(currentPct);
              }
            }, 200);
          } else {
            currentPct = Math.max(currentPct, pct);
            reportProgress(currentPct);
          }
        },
      });

      stopProgressTimer();
      setProgressPercent(98);
      setProgressStage('Finishing Studio-Grade enhancement...');

      // Persist restored canvas as active working base so other tools/sliders build on it!
      neuralRestoredCanvasRef.current = restoredCanvas;
      lastProcessedCanvasRef.current = restoredCanvas;
      setHasNeuralRestoration(true);

      setEnhancedDimensions({ width: restoredCanvas.width, height: restoredCanvas.height });
      const origW = img.naturalWidth || img.width || 1;
      const detectedScale = Math.max(1, Math.min(4, Math.round(restoredCanvas.width / origW))) as 1 | 2 | 4;
      setUpscaleFactor(detectedScale);

      // Set clean, balanced retouch defaults so face stays natural and doesn't get harsh halos
      const neuralRetouchSettings: FaceEnhanceSettings = {
        deblur: 0,
        clarity: 15,
        smooth: 25,
        sharpness: 20,
        glow: 15,
        warmth: 0,
        brightness: 0,
        contrast: 5,
        eyeTeethClarity: 20,
        monochrome: false,
      };
      setSettings(neuralRetouchSettings);
      setActivePresetId('ai-restored');

      restoredCanvas.toBlob(
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
          onNotify('Face Restored!', 'Studio-grade Ultra Clear facial features generated and locked as working base', 'success');
        },
        exportFormat,
        exportQuality / 100
      );
    } catch (err: any) {
      stopProgressTimer();
      console.error('Neural restoration failed:', err);
      setIsProcessing(false);
      onNotify('AI Notice', 'Switched to high-performance local engine: ' + (err.message || ''), 'info');
      runEnhancement(settings, upscaleFactor);
    }
  }, [
    currentImage,
    neuralModelKey,
    hasWebGPU,
    neuralBlendStrength,
    exportFormat,
    exportQuality,
    onNotify,
    runEnhancement,
    settings,
    upscaleFactor,
  ]);

  // Debounced auto-run when sliders or upscale change
  const scheduleEnhancement = useCallback(
    (newSettings: FaceEnhanceSettings, newUpscale: 1 | 2 | 4) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const delay = isInitialLoadRef.current ? 240 : 150;
      debounceTimerRef.current = setTimeout(() => {
        isInitialLoadRef.current = false;
        runEnhancement(newSettings, newUpscale);
      }, delay);
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

  // Reset sliders to default
  const handleResetSettings = () => {
    if (neuralRestoredCanvasRef.current) {
      const resetSettings: FaceEnhanceSettings = {
        deblur: 0,
        clarity: 15,
        smooth: 25,
        sharpness: 20,
        glow: 15,
        warmth: 0,
        brightness: 0,
        contrast: 5,
        eyeTeethClarity: 20,
        monochrome: false,
      };
      setActivePresetId('ai-restored');
      setSettings(resetSettings);
      scheduleEnhancement(resetSettings, upscaleFactor);
    } else {
      setActivePresetId('smart-auto');
      setSettings(DEFAULT_ENHANCE_SETTINGS);
      scheduleEnhancement(DEFAULT_ENHANCE_SETTINGS, upscaleFactor);
    }
  };

  // Revert back to original raw image (removes AI face restoration)
  const handleRevertToOriginal = () => {
    neuralRestoredCanvasRef.current = null;
    setHasNeuralRestoration(false);
    setActivePresetId('samsung-ai');
    setSettings(DEFAULT_ENHANCE_SETTINGS);
    setUpscaleFactor(2);
    runEnhancement(DEFAULT_ENHANCE_SETTINGS, 2, null);
    onNotify('Reverted AI Face', 'Restored to Samsung AI ProVisual working base', 'info');
  };

  // Handle upscale factor change
  const handleUpscaleChange = (factor: 1 | 2 | 4) => {
    setUpscaleFactor(factor);
    runEnhancement(settings, factor);
  };

  // Download enhanced image
  const handleDownload = () => {
    if (!processedBlob || !currentImage) return;
    const rawName = currentImage.file?.name || currentImage.name || 'enhanced_portrait';
    const baseName = rawName.replace(/\.[^/.]+$/, '');
    const ext = exportFormat === 'image/jpeg' ? 'jpg' : exportFormat === 'image/png' ? 'png' : 'webp';
    const upscaleSuffix = upscaleFactor > 1 ? `_${upscaleFactor}x_HD` : '_enhanced';
    triggerFileDownload(processedBlob, `${baseName}${upscaleSuffix}.${ext}`);
    onNotify('Download Started', `Saved as high-res ${ext.toUpperCase()}`, 'success');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!processedBlob) return;
    const res = await copyImageToClipboard(processedBlob);
    if (res.success) {
      onNotify('Copied to Clipboard', 'Portrait ready to paste anywhere', 'success');
    } else {
      onNotify('Clipboard Error', res.error || 'Please use Direct Download instead', 'error');
    }
  };

  // Share
  const handleShare = async () => {
    if (!processedBlob || !currentImage) return;
    const ext = exportFormat === 'image/jpeg' ? 'jpg' : 'png';
    const res = await shareFileOrBlob({
      blob: processedBlob,
      filename: `enhanced_portrait.${ext}`,
      title: 'Enhanced Face Portrait',
      text: 'Enhanced with FileWala AI Face Enhancer',
    });
    if (res.shared) {
      onNotify('Shared Successfully', '', 'success');
    }
  };

  // Reset to original settings
  const handleReset = () => {
    applyPreset('samsung-ai');
    setUpscaleFactor(2);
    setZoomLevel(1);
    onNotify('Settings Reset', 'Restored to Samsung AI ProVisual defaults', 'info');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {!currentImage ? (
        <div className="space-y-3 sm:space-y-3.5">
          {/* Header Section */}
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Client-Side Engine · Zero Uploads</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              AI Face Enhancer &amp; Photo Retouch
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Instant in-browser portrait enhancement, skin smoothing &amp; eye clarity with zero server uploads.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto relative">
            {isImageLoading ? (
              <HumanLoadingOverlay
                title="Loading"
                stage="Reading portrait file..."
                percent={20}
                accentColor="rose"
              />
            ) : (
              <Dropzone
                onFilesSelected={(files) => {
                  if (files.length > 0) loadFile(files[0]);
                }}
                title="Upload Portrait, Selfie, or ID Photo"
                description="Drag & drop or click to enhance facial clarity, smooth skin, and unblur eyes"
                accept="image/*"
                className="h-[230px] sm:h-[260px] lg:h-[280px]"
              />
            )}
          </div>

          {/* Quick Features Highlight - Single compact row */}
          <div className="max-w-[700px] mx-auto grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg border text-center bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-center gap-1">
                <Wand2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Skin Soften</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">Smooth pores &amp; blemishes</p>
            </div>
            <div className="p-2 rounded-lg border text-center bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-center gap-1">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>Eye &amp; Smile</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">Sharp iris &amp; bright teeth</p>
            </div>
            <div className="p-2 rounded-lg border text-center bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>HD Upscale</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">2x / 4x super-resolution</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Top Inline Hero Row */}
          <div className="flex items-center justify-between gap-2 px-1 py-1 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">AI Photo &amp; Face Enhancer</span>
              </span>
              <span className="hidden md:inline-block text-[11px] font-mono text-zinc-400 truncate max-w-[130px]">
                {currentImage.file.name}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {enhancedDimensions ? `${enhancedDimensions.width}×${enhancedDimensions.height}` : `${currentImage.width}×${currentImage.height}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {/* Samsung Vivid Color Engine Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextVivid = !settings.samsungVivid;
                  updateSetting('samsungVivid', nextVivid);
                  onNotify(
                    nextVivid ? '⚡ Samsung Vivid AI Enabled' : 'Samsung Vivid Disabled',
                    nextVivid ? 'ProVisual vibrant color engine & dynamic contrast active' : 'Natural raw color profile',
                    'info'
                  );
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition select-none ${
                  settings.samsungVivid
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
                title="Toggle Samsung ProVisual Vivid Color & Dynamic Contrast"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Samsung Vivid {settings.samsungVivid ? 'ON' : 'OFF'}</span>
              </button>

              {/* Hold for Original Button */}
              <button
                type="button"
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition select-none ${
                  isHoldingOriginal
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
                title="Press and hold to see raw image"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hold Raw</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                    viewMode === 'split' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Split Comparison Slider"
                >
                  <Columns className="w-3 h-3" />
                  <span className="text-[11px]">Compare</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('enhanced-only')}
                  className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                    viewMode === 'enhanced-only' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Enhanced Only"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[11px]">Enhanced</span>
                </button>
              </div>

              {/* Reset to auto defaults */}
              <button
                type="button"
                onClick={handleReset}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Reset to Samsung AI Defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Change Image */}
              <button
                type="button"
                onClick={resetImage}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Photo</span>
              </button>
            </div>
          </div>

          {/* Full-Width Expansive Canvas Hero (Dominant Viewport matching Screenshot) */}
          <div
            className="relative w-full h-[440px] sm:h-[500px] lg:h-[560px] xl:h-[600px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 flex items-center justify-center transition-colors shadow-sm select-none"
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                : 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Vertical Zoom Controls (Floating on Left edge like Reference Image) */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 rounded-full py-2.5 px-1 shadow-lg select-none">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(3, +(prev + 0.25).toFixed(2)))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="py-8 relative flex items-center justify-center w-6">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="absolute w-16 h-1 accent-rose-500 cursor-pointer -rotate-90 origin-center"
                  title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
                />
              </div>

              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(1, +(prev - 0.25).toFixed(2)))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="mt-1 px-1.5 py-0.5 text-[9px] font-mono font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer rounded-full bg-rose-500/20"
                  title="Reset 1x Zoom"
                >
                  1x
                </button>
              )}
            </div>

            {isProcessing && (
              <HumanLoadingOverlay
                title="Loading"
                stage={progressStage}
                percent={progressPercent}
                accentColor="rose"
              />
            )}

            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              {isHoldingOriginal && originalSrc ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <img
                    src={originalSrc}
                    alt="Original Raw"
                    className="max-h-[420px] sm:max-h-[480px] lg:max-h-[530px] xl:max-h-[570px] w-auto max-w-full object-contain rounded-xl shadow-md"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/20">
                    RAW ORIGINAL
                  </div>
                </div>
              ) : viewMode === 'split' && originalSrc && previewSrc ? (
                <div className="w-full h-full p-2 flex items-center justify-center">
                  <ComparisonSlider
                    originalSrc={originalSrc}
                    processedSrc={previewSrc}
                    originalLabel="Original (Raw)"
                    processedLabel={
                      settings.samsungVivid
                        ? `Samsung AI (${upscaleFactor}x HD)`
                        : `Enhanced (${upscaleFactor}x HD)`
                    }
                    maxHeightClass="max-h-[420px] sm:max-h-[480px] lg:max-h-[530px] xl:max-h-[570px]"
                    className="max-h-[430px] sm:max-h-[490px] lg:max-h-[540px] xl:max-h-[580px] w-full rounded-xl overflow-hidden shadow-md"
                  />
                </div>
              ) : previewSrc ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <img
                    src={previewSrc}
                    alt="AI Enhanced Portrait"
                    className="max-h-[420px] sm:max-h-[480px] lg:max-h-[530px] xl:max-h-[570px] w-auto max-w-full object-contain rounded-xl shadow-md"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-bold rounded-full shadow-xs">
                    {settings.samsungVivid
                      ? `SAMSUNG AI (${upscaleFactor}x HD)`
                      : `ENHANCED (${upscaleFactor}x HD)`}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs">Initializing AI Engine...</span>
                </div>
              )}
            </div>
          </div>

          {/* Streamlined 1-Click AI Control Deck */}
          <div className="space-y-2.5">
            {/* Quick Strip: 1-Click AI Presets + Scale Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mr-1 hidden sm:inline">
                  AI Presets:
                </span>
                {FACE_ENHANCER_PRESETS.map((p) => {
                  const isActive = activePresetId === p.id;
                  const shortName =
                    p.id === 'samsung-ai' ? '⚡ Samsung ProVisual' :
                    p.id === 'unblur-focus' ? 'AI Unblur Focus' :
                    p.id === 'smart-auto' ? 'Smart Auto' :
                    p.id === 'studio-glamour' ? 'Studio Glamour' :
                    p.id === 'passport-id' ? 'Passport ID' :
                    p.id === 'golden-hour' ? 'Warm Glow' :
                    p.id === 'dramatic-bw' ? 'B&W Portrait' : p.name;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-rose-500 text-white font-semibold shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {shortName}
                    </button>
                  );
                })}
              </div>

              {/* Super-Resolution Scale (1x, 2x HD, 4x UHD) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 hidden md:inline">
                  Resolution:
                </span>
                {([1, 2, 4] as const).map((factor) => {
                  const label = factor === 1 ? '1x Standard' : factor === 2 ? '2x HD' : '4x Ultra HD';
                  const isSelected = upscaleFactor === factor;
                  return (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => handleUpscaleChange(factor)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Neural AI Face Restoration + Export & Download Action Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              {/* Studio Neural Face Restoration CTA (col-span-5) */}
              <div className="md:col-span-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={runNeuralRestoration}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running Neural Engine...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>{hasNeuralRestoration ? 'Re-run Studio Neural Face' : 'Deep Neural Face Restoration'}</span>
                    </>
                  )}
                </button>

                {/* Model Selector */}
                <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => setNeuralModelKey('gfpgan-v14')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition ${
                      neuralModelKey === 'gfpgan-v14'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title="GFPGAN v1.4: Natural face restoration"
                  >
                    GFPGAN
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeuralModelKey('codeformer')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition ${
                      neuralModelKey === 'codeformer'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title="CodeFormer: Heavy blur reconstruction"
                  >
                    CodeFormer
                  </button>
                </div>
              </div>

              {/* Export format + Primary Download Button (col-span-7) */}
              <div className="md:col-span-7 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Format Pills */}
                <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 p-1 bg-zinc-50 dark:bg-zinc-950">
                  {(['image/jpeg', 'image/png', 'image/webp'] as OutputFormat[]).map((fmt) => {
                    const label = fmt === 'image/jpeg' ? 'JPG' : fmt === 'image/png' ? 'PNG' : 'WebP';
                    const isSelected = exportFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => {
                          setExportFormat(fmt);
                          reencodeExportBlob(fmt, exportQuality);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Primary Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!processedBlob || isProcessing}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download HD ({upscaleFactor}x)</span>
                  {processedBlob && (
                    <span className="text-[11px] font-mono opacity-80 font-normal">
                      · {formatBytes(processedBlob.size)}
                    </span>
                  )}
                </button>

                {/* Copy / Share Quick Icons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!processedBlob || isProcessing}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!processedBlob || isProcessing}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Manual Sliders Toggle */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 transition-colors">
              <button
                type="button"
                onClick={() => setShowAdvancedSliders(!showAdvancedSliders)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold">
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Advanced Manual Sliders</span>
                </span>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  {showAdvancedSliders ? 'Hide Sliders' : 'Fine-Tune Sliders'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedSliders ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {showAdvancedSliders && (
                <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Fine-tune deblur, clarity, skin smooth &amp; exposure</span>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="text-[11px] text-zinc-500 hover:text-rose-500 cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Sliders</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Deblur</span>
                        <span className="font-mono text-zinc-400">{settings.deblur}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.deblur}
                        onChange={(e) => updateSetting('deblur', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>AI Clarity</span>
                        <span className="font-mono text-zinc-400">{settings.clarity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.clarity}
                        onChange={(e) => updateSetting('clarity', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Skin Smooth</span>
                        <span className="font-mono text-zinc-400">{settings.smooth}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.smooth}
                        onChange={(e) => updateSetting('smooth', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Eye &amp; Teeth</span>
                        <span className="font-mono text-zinc-400">{settings.eyeTeethClarity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.eyeTeethClarity}
                        onChange={(e) => updateSetting('eyeTeethClarity', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Sharpness</span>
                        <span className="font-mono text-zinc-400">{settings.sharpness}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.sharpness}
                        onChange={(e) => updateSetting('sharpness', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Studio Glow</span>
                        <span className="font-mono text-zinc-400">{settings.glow}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.glow}
                        onChange={(e) => updateSetting('glow', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Warmth</span>
                        <span className="font-mono text-zinc-400">{settings.warmth}</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={settings.warmth}
                        onChange={(e) => updateSetting('warmth', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Contrast</span>
                        <span className="font-mono text-zinc-400">{settings.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={settings.contrast}
                        onChange={(e) => updateSetting('contrast', Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEO & Educational Guide */}
      <div className="pt-2">
        <ImageToolGuideSection toolId="face-enhancer" />
      </div>
    </div>
  );
};
