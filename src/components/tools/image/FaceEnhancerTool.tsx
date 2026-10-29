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
      return;
    }

    const img = currentImage.imageElement;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // Use instant blob preview URL (zero memory churn, zero main-thread block)
    setOriginalSrc(currentImage.previewUrl);

    // Apply default preset
    applyPreset('smart-auto');
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
          canvas.width = sourceW;
          canvas.height = sourceH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Could not create canvas context');
          ctx.drawImage(img, 0, 0);
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
      const restoredCanvas = await NeuralFaceEnhancer.restoreFacePatch(img, {
        modelKey: neuralModelKey,
        hasWebGPU: !!hasWebGPU,
        blendStrength: neuralBlendStrength / 100,
        onProgress: (pct, stage) => {
          setProgressStage(stage);
          if (pct >= 70) {
            stopProgressTimer();
            currentPct = Math.max(currentPct, 72);
            setProgressPercent(Math.round(currentPct));
            // During heavy neural inference, continuously advance progress towards 94%
            // so the user never experiences a frozen progress bar
            progressTimer = setInterval(() => {
              if (currentPct < 94) {
                currentPct += (94.5 - currentPct) * 0.05;
                setProgressPercent(Math.round(currentPct));
              }
            }, 70);
          } else {
            currentPct = Math.max(currentPct, pct);
            setProgressPercent(Math.round(currentPct));
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
      runEnhancement(settings, 4);
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
  ]);

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
    setActivePresetId('smart-auto');
    setSettings(DEFAULT_ENHANCE_SETTINGS);
    setUpscaleFactor(1);
    runEnhancement(DEFAULT_ENHANCE_SETTINGS, 1, null);
    onNotify('Reverted to Raw', 'Restored original photo without AI modifications', 'info');
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
    applyPreset('smart-auto');
    setUpscaleFactor(1);
    onNotify('Settings Reset', 'Restored to Smart Auto AI defaults', 'info');
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
        <div className="space-y-2 sm:space-y-2.5">
          {/* Top Inline Hero Row */}
          <div className="flex items-center justify-between gap-2 px-1 py-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                AI Face Enhancer &amp; Retouch
              </span>
              <span className="hidden md:inline-block text-[11px] font-mono text-zinc-400 truncate max-w-[120px]">
                {currentImage.file.name}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400">
                ({enhancedDimensions ? `${enhancedDimensions.width}×${enhancedDimensions.height}` : `${currentImage.width}×${currentImage.height}`})
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* AI Model switcher */}
              <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100/60 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setNeuralModelKey('gfpgan-v14')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 ${
                    neuralModelKey === 'gfpgan-v14'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="GFPGAN v1.4: Photorealistic clean face prior"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>GFPGAN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNeuralModelKey('codeformer')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 ${
                    neuralModelKey === 'codeformer'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="CodeFormer: Discrete codebook transformer for heavy blur"
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>CodeFormer</span>
                </button>
              </div>

              {/* Hold for Original Button */}
              <button
                type="button"
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition select-none ${
                  isHoldingOriginal
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
                title="Press and hold to see raw image"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">Hold</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition ${
                    viewMode === 'split' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Split Comparison"
                >
                  <Columns className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('enhanced-only')}
                  className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition ${
                    viewMode === 'enhanced-only' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Enhanced Only"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>

              {/* Reset to auto defaults */}
              <button
                type="button"
                onClick={handleReset}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Reset to Smart Auto Defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Change Image */}
              <button
                type="button"
                onClick={resetImage}
                className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span className="hidden sm:inline">Change</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-start">
            {/* Left Column (Canvas & 1-line presets): lg:col-span-7 xl:col-span-8 */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-1.5">
              {/* Viewport Clamped Canvas */}
              <div
                className={`relative w-full h-[230px] sm:h-[260px] lg:h-[280px] xl:h-[300px] rounded-xl overflow-hidden border flex items-center justify-center transition-colors shadow-xs ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-950/80 shadow-black/20'
                    : 'border-zinc-200 bg-zinc-50 shadow-zinc-200/30'
                }`}
              >
                {isProcessing && (
                  <HumanLoadingOverlay
                    title="Loading"
                    stage={progressStage}
                    percent={progressPercent}
                    accentColor="rose"
                  />
                )}

                {isHoldingOriginal && originalSrc ? (
                  <div className="relative w-full h-full flex items-center justify-center p-2">
                    <img
                      src={originalSrc}
                      alt="Original Raw"
                      className="max-h-[220px] sm:max-h-[250px] lg:max-h-[270px] xl:max-h-[290px] w-auto max-w-full object-contain rounded-lg shadow-md"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold rounded-full border border-white/20">
                      RAW ORIGINAL
                    </div>
                  </div>
                ) : viewMode === 'split' && originalSrc && previewSrc ? (
                  <div className="w-full h-full p-1.5 flex items-center justify-center">
                    <ComparisonSlider
                      originalSrc={originalSrc}
                      processedSrc={previewSrc}
                      originalLabel="Original"
                      processedLabel={upscaleFactor > 1 ? `Enhanced (${upscaleFactor}x HD)` : 'AI Enhanced'}
                      className="max-h-[220px] sm:max-h-[250px] lg:max-h-[270px] xl:max-h-[290px] rounded-lg overflow-hidden shadow-md"
                    />
                  </div>
                ) : previewSrc ? (
                  <div className="relative w-full h-full flex items-center justify-center p-2">
                    <img
                      src={previewSrc}
                      alt="AI Enhanced Portrait"
                      className="max-h-[220px] sm:max-h-[250px] lg:max-h-[270px] xl:max-h-[290px] w-auto max-w-full object-contain rounded-lg shadow-md"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-semibold rounded-full shadow-xs">
                      {upscaleFactor > 1 ? `ENHANCED (${upscaleFactor}x HD)` : 'AI ENHANCED'}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Initializing Face Engine...</span>
                  </div>
                )}
              </div>

              {/* Compact Under-Canvas Strip: Presets & Upscale in single compact row */}
              <div className="flex items-center justify-between flex-wrap gap-1.5 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {/* 1-Click AI Presets Pills */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
                  {FACE_ENHANCER_PRESETS.map((p) => {
                    const isActive = activePresetId === p.id;
                    const shortName =
                      p.id === 'unblur-focus' ? 'Unblur' :
                      p.id === 'smart-auto' ? 'Smart Auto' :
                      p.id === 'studio-glamour' ? 'Glamour' :
                      p.id === 'passport-id' ? 'Passport' :
                      p.id === 'golden-hour' ? 'Glow' :
                      p.id === 'dramatic-bw' ? 'B&W' : p.name;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
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

                {/* Upscale Pills */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">Scale:</span>
                  {([1, 2, 4] as const).map((factor) => {
                    const label = factor === 1 ? '1x' : factor === 2 ? '2x HD' : '4x UHD';
                    const isSelected = upscaleFactor === factor;
                    return (
                      <button
                        key={factor}
                        type="button"
                        onClick={() => handleUpscaleChange(factor)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
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
            </div>

            {/* Right Column: Controls & Export (lg:col-span-5 xl:col-span-4) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-1.5 sm:space-y-2">
              {/* Retouch Controls Card */}
              <div className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-emerald-500" />
                    <span>Facial Retouch</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasNeuralRestoration && (
                      <button
                        type="button"
                        onClick={handleRevertToOriginal}
                        className="text-[10px] text-zinc-400 hover:text-rose-500 cursor-pointer"
                        title="Revert neural face"
                      >
                        Revert AI
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Compact Sliders Grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                      <span>Skin Smooth</span>
                      <span className="font-mono text-zinc-400">{settings.smooth}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.smooth}
                      onChange={(e) => updateSetting('smooth', Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                      <span>AI Clarity</span>
                      <span className="font-mono text-zinc-400">{settings.clarity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.clarity}
                      onChange={(e) => updateSetting('clarity', Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                      <span>AI Deblur</span>
                      <span className="font-mono text-zinc-400">{settings.deblur}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.deblur}
                      onChange={(e) => updateSetting('deblur', Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                      <span>Eye &amp; Smile</span>
                      <span className="font-mono text-zinc-400">{settings.eyeTeethClarity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.eyeTeethClarity}
                      onChange={(e) => updateSetting('eyeTeethClarity', Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                </div>

                {/* AI Generative Restore Button */}
                <button
                  type="button"
                  onClick={runNeuralRestoration}
                  disabled={isProcessing}
                  className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing AI Model...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{hasNeuralRestoration ? 'Re-run Neural AI Face' : 'Restore Face with Studio AI'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Export & Download Card */}
              <div className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Export Settings
                  </span>
                  {processedBlob && (
                    <span className="text-[10px] font-mono font-semibold text-emerald-500">
                      {formatBytes(processedBlob.size)}
                    </span>
                  )}
                </div>

                {/* Format Pills + Quality slider in one line */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
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
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {exportFormat !== 'image/png' && (
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-zinc-400 shrink-0">Q: {exportQuality}%</span>
                      <input
                        type="range"
                        min={70}
                        max={100}
                        value={exportQuality}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setExportQuality(val);
                          reencodeExportBlob(exportFormat, val);
                        }}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                      />
                    </div>
                  )}
                </div>

                {/* Primary Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!processedBlob || isProcessing}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download Enhanced Portrait</span>
                </button>

                {/* Secondary Copy / Share */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!processedBlob || isProcessing}
                    className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!processedBlob || isProcessing}
                    className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                  >
                    <Share2 className="w-3 h-3 text-zinc-400" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
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
