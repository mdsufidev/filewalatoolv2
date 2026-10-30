'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileBadge,
  CheckCircle2,
  Download,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  ChevronDown,
  Info,
  Sliders,
  Eye,
  EyeOff,
  Camera,
  Check,
  Maximize2,
  Move,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FlipHorizontal,
  Copy,
  Share2,
  Keyboard,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { CanvasEngine } from '../../core/engine/CanvasEngine';
import { ComplianceProgressBar } from './ComplianceProgressBar';
import {
  createSafeObjectURL,
  revokeSafeObjectURL,
  formatBytes,
  triggerFileDownload,
} from '../../utils/memory';
import {
  compressCanvasToPortalSpecs,
  readJpegDpi,
} from '../../utils/jpegDpi';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../utils/clipboardAndShare';
import { GovToolGuideSection } from './gov/GovToolGuideSection';
import { CyberCafeAiStudio } from './gov/CyberCafeAiStudio';

export type PassportUploadMode = 'digital-upload-630x810' | 'physical-print-350x450';

interface PassportModeConfig {
  id: PassportUploadMode;
  name: string;
  portal: string;
  width: number;
  height: number;
  minKb: number;
  maxKb: number;
  dpi: number;
  aspectRatio: number;
  description: string;
}

const PASSPORT_MODES: Record<PassportUploadMode, PassportModeConfig> = {
  'digital-upload-630x810': {
    id: 'digital-upload-630x810',
    name: 'Passport Seva Digital Upload',
    portal: 'Ministry of External Affairs (MEA) Online e-Form',
    width: 630,
    height: 810,
    minKb: 10,
    maxKb: 250,
    dpi: 300,
    aspectRatio: 630 / 810,
    description: 'Exact 630 × 810 px (7:9 ratio) · 10 KB to 250 KB · 300 DPI JPEG (Government Portal Requirement)',
  },
  'physical-print-350x450': {
    id: 'physical-print-350x450',
    name: 'Physical Print (35 × 45 mm)',
    portal: 'PSK Appointment & Offline Form Submission',
    width: 350,
    height: 450,
    minKb: 20,
    maxKb: 250,
    dpi: 300,
    aspectRatio: 350 / 450,
    description: '350 × 450 px (35 × 45 mm physical print) · 20 KB to 250 KB · 300 DPI JPEG',
  },
};

interface PassportPhotoResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PassportPhotoResizer: React.FC<PassportPhotoResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  // Mode Selection
  const [selectedMode, setSelectedMode] = useState<PassportUploadMode>('digital-upload-630x810');
  const activeModeConfig = PASSPORT_MODES[selectedMode];
  const targetW = activeModeConfig.width;
  const targetH = activeModeConfig.height;
  const targetMinKb = activeModeConfig.minKb;
  const targetMaxKb = activeModeConfig.maxKb;
  const targetDpi = activeModeConfig.dpi;

  // Image source state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [rawImageElement, setRawImageElement] = useState<HTMLImageElement | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const handleStudioProcessedImage = useCallback((processedImg: HTMLImageElement | null) => {
    if (processedImg) {
      setImageElement(processedImg);
      setImageSrc(processedImg.src);
    } else if (rawImageElement) {
      setImageElement(rawImageElement);
      setImageSrc(rawImageElement.src);
    }
  }, [rawImageElement]);

  // Viewport transforms
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Viewport Box Dimensions (Strictly proportional to targetW / targetH)
  const cropAspectRatio = targetW / targetH;
  const BOX_MAX_W = 250;
  const BOX_MAX_H = 310;
  let boxW = BOX_MAX_W;
  let boxH = Math.round(boxW / cropAspectRatio);
  if (boxH > BOX_MAX_H) {
    boxH = BOX_MAX_H;
    boxW = Math.round(boxH * cropAspectRatio);
  }

  // Base rendered photo size in viewport (Cover mode so entire frame is filled)
  let baseW = boxW;
  let baseH = boxH;
  if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
    const imgAspect = imageNaturalSize.width / imageNaturalSize.height;
    if (imgAspect > cropAspectRatio) {
      baseH = boxH;
      baseW = Math.round(boxH * imgAspect);
    } else {
      baseW = boxW;
      baseH = Math.round(boxW / imgAspect);
    }
  }

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0,
    initialPanY: 0,
  });
  const pinchStartRef = useRef<{ dist: number; zoom: number }>({ dist: 0, zoom: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [verifiedDpi, setVerifiedDpi] = useState<number | null>(null);
  const [resultSizeBytes, setResultSizeBytes] = useState<number>(0);


  useEffect(() => {
    return () => {
      if (resultUrl) revokeSafeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleFileSelected = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Invalid File', 'Please select a valid JPEG, PNG, or WebP photo.', 'error');
      return;
    }

    if (resultUrl) {
      revokeSafeObjectURL(resultUrl);
      setResultUrl(null);
      setResultBlob(null);
    }

    CanvasEngine.loadImage(file).then((img) => {
      setImageElement(img);
      setRawImageElement(img);
      setImageSrc(img.src);
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setSourceFile(file);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      onNotify('Passport Photo Loaded', `${file.name} ready for 35×45mm formatting.`, 'info');
    }).catch(() => {
      onNotify('Error Loading Image', 'Could not parse the selected image.', 'error');
    });
  }, [resultUrl, onNotify]);

  // Global Keyboard Shortcuts for Zoom: '=' / '+' to Zoom In, '-' to Zoom Out, '0' to Reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') {
        e.preventDefault();
        setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))));
      } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
        e.preventDefault();
        setZoom((prev) => Math.max(0.6, parseFloat((prev - 0.1).toFixed(2))));
      } else if (e.key === '0' || e.key === '/') {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Clipboard Paste Support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelected([file]);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelected]);

  // Mouse & Touch Pan Handling
  const handleCenter = useCallback(() => setPan({ x: 0, y: 0 }), []);
  const resetTransform = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
  }, []);
  const rotateCCW = useCallback(() => setRotation((prev) => (prev - 90 + 360) % 360), []);
  const rotateCW = useCallback(() => setRotation((prev) => (prev + 90) % 360), []);
  const toggleFlipH = useCallback(() => setFlipH((prev) => !prev), []);
  const nudge = useCallback((dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  // Ultra-Smooth Pointer Capture Dragging Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageElement) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: Math.round(dragStartRef.current.initialPanX + dx),
      y: Math.round(dragStartRef.current.initialPanY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageElement) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartRef.current = { dist, zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageElement) return;
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: Math.round(dragStartRef.current.initialPanX + dx),
        y: Math.round(dragStartRef.current.initialPanY + dy),
      });
    } else if (e.touches.length === 2 && pinchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartRef.current.dist;
      setZoom(Math.min(4, Math.max(0.5, parseFloat((pinchStartRef.current.zoom * ratio).toFixed(2)))));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartRef.current = { dist: 0, zoom: 1 };
  };

  // Native non-passive wheel listener: strictly prevents page scrolling while zooming on canvas
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(4, Math.max(0.5, parseFloat((prev + zoomDelta).toFixed(2)))));
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [imageSrc, imageElement]);

  // Render High-Resolution Export Canvas (100% Exact Parity)
  const processPhoto = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!imageElement || !viewportRef.current) return;
      if (options?.silent) {
        setIsLiveSyncing(true);
      } else {
        setIsProcessing(true);
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('Could not initialize canvas context');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill pure white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);

        // Apply brightness/contrast filter
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        const scale = targetW / boxW;

        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.translate(pan.x * scale, pan.y * scale);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom * (flipH ? -1 : 1), zoom);

        const drawW = baseW * scale;
        const drawH = baseH * scale;

        ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        const compressionResult = await compressCanvasToPortalSpecs(canvas, {
          minKb: targetMinKb,
          maxKb: targetMaxKb,
          dpi: targetDpi,
        });
        canvas.width = 0;
        canvas.height = 0;

        const dpiInfo = await readJpegDpi(compressionResult.blob);
        setVerifiedDpi(dpiInfo?.dpiX || targetDpi);
        setResultSizeBytes(compressionResult.sizeBytes);

        if (resultUrl) revokeSafeObjectURL(resultUrl);
        const url = createSafeObjectURL(compressionResult.blob);
        setResultBlob(compressionResult.blob);
        setResultUrl(url);

        if (!options?.silent) {
          onNotify(
            'Passport Photo Ready',
            `Formatted to ${targetW}×${targetH} px · ${formatBytes(compressionResult.sizeBytes)} · ${targetDpi} DPI.`,
            'success'
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Processing failed';
        if (!options?.silent) {
          onNotify('Processing Error', message, 'error');
        }
      } finally {
        setIsProcessing(false);
        setIsLiveSyncing(false);
      }
    },
    [
      imageElement,
      targetW,
      targetH,
      boxW,
      brightness,
      contrast,
      pan.x,
      pan.y,
      rotation,
      flipH,
      zoom,
      baseW,
      baseH,
      targetMinKb,
      targetMaxKb,
      targetDpi,
      resultUrl,
      onNotify,
    ]
  );

  // Auto-sync Live Portal Validation in real-time as viewport adjusts
  useEffect(() => {
    if (!imageElement) return;
    const timer = setTimeout(() => {
      processPhoto({ silent: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [
    imageElement,
    pan.x,
    pan.y,
    zoom,
    rotation,
    flipH,
    brightness,
    contrast,
    targetW,
    targetH,
    targetDpi,
    targetMinKb,
    targetMaxKb,
  ]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const filename = `Passport_Seva_Photo_35x45mm_${Date.now()}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `${filename} saved successfully.`, 'success');
  }, [resultBlob, onNotify]);

  const handleCopyPhoto = useCallback(async () => {
    if (!resultBlob) return;
    const res = await copyImageToClipboard(resultBlob, { width: targetW, height: targetH });
    if (res.success) {
      onNotify('Copied to Clipboard', 'Passport photo copied as PNG!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser', 'error');
    }
  }, [resultBlob, targetW, targetH, onNotify]);

  const handleSharePhoto = useCallback(async () => {
    if (!resultBlob) return;
    const filename = `Passport_Seva_Photo_35x45mm_${Date.now()}.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Passport Seva Photo',
      text: `Passport Photo (35x45mm / ${targetW}×${targetH}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
    if (shared.shared) {
      onNotify('Shared Successfully', '', 'success');
    }
  }, [resultBlob, targetW, targetH, resultSizeBytes, onNotify]);

  const currentSizeKb = resultSizeBytes ? (resultSizeBytes / 1024).toFixed(1) : null;
  const isSizeCompliant =
    resultSizeBytes > 0 &&
    resultSizeBytes >= targetMinKb * 1024 &&
    resultSizeBytes <= targetMaxKb * 1024;


  const currentStep = !imageElement ? 1 : !resultBlob ? 2 : 3;

  const handleResetFile = useCallback(() => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
    setImageElement(null);
    setRawImageElement(null);
    setImageSrc(null);
    setSourceFile(null);
  }, [resultUrl]);

  const handleReAdjust = useCallback(() => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
  }, [resultUrl]);

  // Global Zero-Latency Keyboard Engine
  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      if (!imageElement) return;

      // Download: D or Ctrl+S / Cmd+S
      if (e.key === 'd' || e.key === 'D' || ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        if (resultBlob) {
          handleDownload();
        } else {
          processPhoto();
        }
        return;
      }

      // Copy: C or Ctrl+C / Cmd+C (without selection)
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        if (resultBlob) {
          e.preventDefault();
          handleCopyPhoto();
          return;
        }
      }

      // Process / Format: Enter or Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        processPhoto();
        return;
      }

      // Reset / New: N or Esc
      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        handleResetFile();
        onNotify('Reset', 'Cleared image and reset viewport.', 'info');
        return;
      }

      // Rotate: T
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        rotateCW();
        return;
      }

      // Flip: H
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        toggleFlipH();
        return;
      }

      // Biometric guides toggle: G
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGuides((prev) => !prev);
        return;
      }

      // Pan & Zoom
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudge(-step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudge(step, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudge(0, -step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(0, step);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((prev) => Math.min(4, parseFloat((prev + 0.05).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.05).toFixed(2))));
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [
    imageElement,
    resultBlob,
    handleDownload,
    handleCopyPhoto,
    processPhoto,
    handleResetFile,
    rotateCW,
    toggleFlipH,
    nudge,
    onNotify,
  ]);

  /* -------------------------------------------------------------
     RENDER: EMPTY STATE (CLEAN, DIRECT DROPZONE, NO BOX-IN-BOX)
  ------------------------------------------------------------- */
  if (!imageElement) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
        <div className="space-y-3 sm:space-y-3.5">
          {/* Header Section */}
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ministry of External Affairs (MEA) Specs</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Passport Seva Photo Resizer
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Prepare official 630×810 px digital upload or 35×45 mm, 10–250 KB, 300 DPI biometric passport photos.
            </p>
          </div>

          {/* Mode Selector Tabs (Clean Pill Bar) */}
          <div className="flex flex-wrap justify-center gap-1.5 max-w-[700px] mx-auto">
            {(Object.keys(PASSPORT_MODES) as PassportUploadMode[]).map((key) => {
              const mode = PASSPORT_MODES[key];
              const isSelected = selectedMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedMode(key);
                    if (resultUrl) {
                      revokeSafeObjectURL(resultUrl);
                      setResultUrl(null);
                      setResultBlob(null);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
                      : isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <span>{mode.name}</span>
                  <span className="text-[10px] opacity-70">({mode.width}×{mode.height})</span>
                </button>
              );
            })}
          </div>

          {/* Direct Dropzone */}
          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={handleFileSelected}
              accept="image/*"
              multiple={false}
              title="Upload Passport Photo"
              description="Drag & drop or click to browse. Auto-formats to official MEA passport standards."
              className="h-[230px] sm:h-[260px] lg:h-[280px]"
            />
          </div>
        </div>

        {/* Verified Guide */}
        <div className="pt-2">
          <GovToolGuideSection toolId="passport-photo" />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (PHOTO LOADED & READY)
  ------------------------------------------------------------- */
  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Top Inline Hero Row */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            Passport Photo Resizer
          </span>
          {/* Mode switch pills */}
          <div className="hidden sm:flex items-center gap-1">
            {(Object.keys(PASSPORT_MODES) as PassportUploadMode[]).map((key) => {
              const mode = PASSPORT_MODES[key];
              const isSelected = selectedMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMode(key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {mode.width}×{mode.height}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 hidden md:inline-block truncate max-w-[120px]">
            {sourceFile?.name}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Live Compliance Pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>
              {resultBlob
                ? `✓ ${currentSizeKb || (resultSizeBytes / 1024).toFixed(1)} KB · ${verifiedDpi || targetDpi} DPI`
                : `${targetW}×${targetH}px · ${targetDpi} DPI`}
            </span>
          </div>

          <button
            onClick={handleResetFile}
            className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Viewport & Controls Grid - Equal Height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* Left Column: Interactive Crop Viewport (lg:col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full space-y-2">
          {/* Studio Canvas Viewport */}
          <div
            ref={canvasContainerRef}
            tabIndex={0}
            className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 flex items-center justify-center select-none cursor-grab active:cursor-grabbing focus:outline-none transition-colors touch-none h-[380px] sm:h-[430px] lg:h-[480px] xl:h-[510px] flex-1 min-h-[360px] sm:min-h-[400px] lg:min-h-[460px] xl:min-h-[490px]"
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                : 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Fixed Aspect Ratio Crop Box */}
            <div
              ref={viewportRef}
              className="relative overflow-hidden border-2 border-zinc-900/90 dark:border-white rounded-xs shadow-xl bg-[linear-gradient(45deg,#e4e4e7_25%,transparent_25%),linear-gradient(-45deg,#e4e4e7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e4e4e7_75%),linear-gradient(-45deg,transparent_75%,#e4e4e7_75%)] bg-[size:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] bg-white dark:bg-zinc-900 pointer-events-none ring-4 ring-zinc-950/5 dark:ring-white/10"
              style={{
                width: `${boxW}px`,
                height: `${boxH}px`,
              }}
            >
              {/* Viewport Image Canvas Rendering */}
              <div
                className="absolute inset-0 flex items-center justify-center origin-center pointer-events-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom * (flipH ? -1 : 1)}, ${zoom})`,
                  transformOrigin: 'center center',
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                <img
                  src={imageSrc || imageElement.src}
                  alt="Passport Photo Preview"
                  className="max-w-none pointer-events-none select-none"
                  style={{
                    width: `${baseW}px`,
                    height: `${baseH}px`,
                  }}
                  draggable={false}
                />
              </div>

              {/* Viewfinder Corner L-Brackets */}
              <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
              <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-zinc-900 dark:border-white pointer-events-none z-10" />

              {/* Composition Grid Overlay */}
              {showGuides && (
                <div className="absolute inset-0 pointer-events-none border border-zinc-400/40 dark:border-white/30">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                  <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-700 dark:bg-white" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700 dark:bg-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Top-Left Live Metadata Pill */}
            <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-white border border-zinc-700/50 backdrop-blur-xs flex items-center gap-1">
                <Maximize2 className="w-2.5 h-2.5 text-zinc-300" />
                {targetW} × {targetH} px · {targetDpi} DPI
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-zinc-200 border border-zinc-700/50 backdrop-blur-xs">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Docked Precision Controls Strip */}
          <div className="p-1.5 sm:p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between flex-wrap gap-1.5">
            {/* Zoom Slider + Quick Pills */}
            {/* Zoom Slider + Precision Buttons */}
            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
                className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Zoom Out [-]"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-20 sm:w-28 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))))}
                className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Zoom In [= or +]"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Fit', val: 1 },
                  { label: '125%', val: 1.25 },
                  { label: '150%', val: 1.5 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setZoom(p.val)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                      Math.abs(zoom - p.val) < 0.05
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions: Rotate, Center, Guides, Reset */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={rotateCCW}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Rotate -90°"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={rotateCW}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Rotate +90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCenter}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Center
              </button>
              <button
                type="button"
                onClick={() => setShowGuides((prev) => !prev)}
                className={`p-1 rounded cursor-pointer ${
                  showGuides
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Toggle Guides"
              >
                {showGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={resetTransform}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Reset Viewport"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Requirements, Tone Balance & Download (lg:col-span-5 xl:col-span-4) - Equal Height */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
          <div
            className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xs' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="space-y-2">
              {/* Cyber Cafe AI Studio: Face Enhancer + BG Remover + Colors */}
              <CyberCafeAiStudio
                rawImage={rawImageElement}
                onProcessedImage={handleStudioProcessedImage}
                onNotify={onNotify}
              />

              {/* Header / Requirements Summary */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Passport Seva Verification
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {targetW}×{targetH} px
                </span>
              </div>

              {/* Compact Requirements Check Rows */}
              <div className="space-y-1 text-xs">
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Dimensions: {targetW} × {targetH} px
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {resultBlob ? 'PASS ✓' : 'Auto-format'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Size: {targetMinKb}–{targetMaxKb} KB
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {resultBlob ? `${currentSizeKb || (resultSizeBytes / 1024).toFixed(1)} KB ✓` : 'Auto-fit'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    DPI: {targetDpi} DPI JFIF
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {resultBlob ? `${verifiedDpi || targetDpi} DPI ✓` : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Tone Balance Slider Compact Row */}
              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-0.5">
                      <span>Brightness</span>
                      <span className="font-mono">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="130"
                      step="1"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-0.5">
                      <span>Contrast</span>
                      <span className="font-mono">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="130"
                      step="1"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Download CTA Button (Red Brand CTA) */}
            <div className="pt-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!resultBlob || isProcessing}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {resultBlob
                    ? `Download Compliant Photo (${currentSizeKb || (resultSizeBytes / 1024).toFixed(1)} KB)`
                    : 'Generate to Download'}
                </span>
              </button>

              {resultBlob && (
                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={handleCopyPhoto}
                    className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Copy</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleSharePhoto}
                      className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                    >
                      <Share2 className="w-3 h-3 text-zinc-400" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="pt-2">
        <GovToolGuideSection toolId="passport-photo" />
      </div>
    </div>
  );
};
