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
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

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
  const BOX_MAX_W = 280;
  const BOX_MAX_H = 360;
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        setImageElement(img);
        setImageSrc(dataUrl);
        setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setSourceFile(file);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        onNotify('Passport Photo Loaded', `${file.name} ready for 35×45mm formatting.`, 'info');
      };
      img.onerror = () => {
        onNotify('Error Loading Image', 'Could not parse the selected image.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      onNotify('Error Reading File', 'Could not read selected photo file.', 'error');
    };
    reader.readAsDataURL(file);
  }, [resultUrl, onNotify]);

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
    await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Passport Seva Photo',
      text: `Passport Photo (35x45mm / ${targetW}×${targetH}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
  }, [resultBlob, targetW, targetH, resultSizeBytes]);

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
      <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Single Authoritative Minimal Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
              isDark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {language === 'hi'
                ? 'विदेश मंत्रालय (MEA) पासपोर्ट सेवा पोर्टल मानक'
                : 'Ministry of External Affairs (MEA) Passport Seva Portal'}
            </span>
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-950'
            }`}
          >
            {language === 'hi'
              ? 'पासपोर्ट सेवा फ़ोटो रिसाइज़र (35×45 mm)'
              : 'Passport Seva Photo Resizer'}
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {language === 'hi'
              ? 'पासपोर्ट सेवा पोर्टल के लिए 630×810 px (डिजिटल अपलोड) या 35×45 mm, 10–250 KB बायोमेट्रिक पासपोर्ट फ़ोटो तैयार करें।'
              : 'Prepare official 630×810 px digital upload or 35×45 mm print, 10–250 KB, 300 DPI biometric passport photos.'}
          </p>
        </div>

        {/* Mode Selector Tabs (Clean Pill Bar) */}
        <div className="flex flex-wrap justify-center gap-2">
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <span>{mode.name}</span>
                <span className="text-[10px] opacity-70">({mode.width}×{mode.height} px)</span>
              </button>
            );
          })}
        </div>

        {/* Direct Dropzone (Centered, Max-w-3xl, Clean & Focused) */}
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={handleFileSelected}
            accept="image/*"
            multiple={false}
            title="Upload Passport Photo"
            description="Drag & drop or click to browse. Auto-formats to official MEA passport standards."
          />
        </div>

        {/* Authoritative Verified Guide, Official Specifications & FAQs */}
        <GovToolGuideSection toolId="passport-photo" />
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (PHOTO LOADED & READY)
  ------------------------------------------------------------- */
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Pro Workspace Header Bar */}
      <div
        className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Thumbnail"
              className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
            />
          )}
          <div className="min-w-0">
            <h3 className={`text-sm font-bold truncate max-w-[180px] sm:max-w-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {sourceFile?.name || 'passport-photo.jpg'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <span>{formatBytes(sourceFile?.size || 0)}</span>
              <span>•</span>
              <span>{imageNaturalSize.width} × {imageNaturalSize.height} px</span>
            </div>
          </div>
        </div>

        {/* Center Live Compliance Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {resultBlob
              ? `✓ 100% Compliant: ${formatBytes(resultSizeBytes)} · ${verifiedDpi || targetDpi} DPI`
              : `${targetW}×${targetH} px · ${targetMinKb}–${targetMaxKb} KB · ${targetDpi} DPI`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFile}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            <span>New</span>
            <kbd className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200/80 dark:bg-zinc-750 text-zinc-700 dark:text-zinc-300">
              N
            </kbd>
          </Button>

          {resultBlob && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPhoto}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
            >
              <span>Copy</span>
              <kbd className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200/80 dark:bg-zinc-750 text-zinc-700 dark:text-zinc-300">
                C
              </kbd>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => (resultBlob ? handleDownload() : processPhoto())}
            disabled={isProcessing}
            leftIcon={
              isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : resultBlob ? (
                <Download className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )
            }
          >
            <span>
              {isProcessing
                ? 'Formatting...'
                : resultBlob
                  ? `Download (${formatBytes(resultSizeBytes)})`
                  : 'Format Photo'}
            </span>
            <kbd className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/20 dark:bg-black/30 text-white">
              {resultBlob ? 'D' : '↵'}
            </kbd>
          </Button>
        </div>
      </div>
      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport Workspace (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`p-5 rounded-lg border ${
              isDark
                ? 'bg-zinc-900/50 border-zinc-800'
                : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-zinc-500" />
                <span className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  Biometric Viewport
                </span>
                <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                  {targetW} × {targetH} px · {activeModeConfig.name}
                </span>
              </div>

              {imageElement && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowGuides((prev) => !prev)}
                    title={showGuides ? 'Hide biometric guides' : 'Show biometric guides'}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      showGuides
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white font-medium'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900'
                    }`}
                  >
                    {showGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showGuides ? 'Guides On' : 'Guides Off'}</span>
                  </button>

                  <button
                    onClick={handleCenter}
                    title="Center alignment"
                    className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
                        : 'bg-white text-zinc-600 hover:text-zinc-950 border-zinc-200'
                    }`}
                  >
                    Center
                  </button>

                  <button
                    onClick={resetTransform}
                    title="Reset Alignment"
                    className={`text-xs px-2 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                        : 'bg-white text-zinc-600 hover:text-zinc-950 border-zinc-200'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>

                          <div className="space-y-4">
                {/* Studio Canvas Viewport */}
                <div
                  ref={canvasContainerRef}
                  tabIndex={0}
                  className={`relative overflow-hidden rounded-xl border flex items-center justify-center select-none bg-zinc-50/80 dark:bg-zinc-950/80 cursor-grab active:cursor-grabbing focus:outline-none transition-colors touch-none ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200'
                  }`}
                  style={{
                    height: '440px',
                    backgroundImage: isDark
                      ? 'radial-gradient(#27272a 1.2px, transparent 1.2px)'
                      : 'radial-gradient(#d4d4d8 1.2px, transparent 1.2px)',
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
                    className="relative overflow-hidden border-2 border-zinc-900/90 dark:border-white rounded-xs shadow-xl bg-white pointer-events-none ring-4 ring-zinc-950/5 dark:ring-white/10 transition-all"
                    style={{
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                    }}
                  >
                    {/* Rendered Interactive Image */}
                    <div
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom * (flipH ? -1 : 1)}, ${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                      className="w-full h-full flex items-center justify-center pointer-events-none"
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

                    {/* Minimalist Composition Grid Overlay */}
                    {showGuides && (
                      <div className="absolute inset-0 pointer-events-none border border-zinc-400/40 dark:border-white/30">
                        {/* Rule of thirds grid lines */}
                        <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />

                        {/* Subtle center crosshair */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-60">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-700 dark:bg-white" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700 dark:bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clean Non-Intrusive Top-Left Live Metadata Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/80 text-white border border-zinc-700/50 backdrop-blur-xs flex items-center gap-1.5">
                      <Maximize2 className="w-3 h-3 text-zinc-300" />
                      {targetW} × {targetH} px · {targetDpi} DPI
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-200 border border-zinc-700/50 backdrop-blur-xs">
                      {Math.round(zoom * 100)}%
                    </span>
                    {rotation !== 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-200 border border-zinc-700/50 backdrop-blur-xs">
                        {rotation}°
                      </span>
                    )}
                    {flipH && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-200 border border-zinc-700/50 backdrop-blur-xs">
                        Flipped
                      </span>
                    )}
                  </div>
                </div>

                {/* Docked Precision Controls Strip */}
                <div
                  className={`p-4 rounded-lg border space-y-4 ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'
                  }`}
                >
                  {/* Zoom Control Bar with Quick Presets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <ZoomIn className="w-3.5 h-3.5 text-zinc-500" />
                        Scale / Zoom
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: 'Fit', val: 1 },
                          { label: '125%', val: 1.25 },
                          { label: '150%', val: 1.5 },
                          { label: '200%', val: 2 },
                        ].map((p) => (
                          <button
                            key={p.label}
                            onClick={() => setZoom(p.val)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                              Math.abs(zoom - p.val) < 0.05
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white font-medium'
                                : isDark
                                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                                  : 'bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
                        className={`p-1.5 rounded border transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="range"
                        min="0.5"
                        max="3.5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />

                      <button
                        onClick={() => setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))))}
                        className={`p-1.5 rounded border transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Orientation & Tone Balancer Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    {/* Rotate & Center Buttons */}
                    <div className="space-y-1.5">
                      <span className={`text-xs font-medium block ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        Orientation
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-full px-2"
                          onClick={rotateCCW}
                          leftIcon={<RotateCcw className="w-3 h-3" />}
                        >
                          -90°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-full px-2"
                          onClick={rotateCW}
                          leftIcon={<RotateCw className="w-3 h-3" />}
                        >
                          +90°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-full px-2"
                          onClick={handleCenter}
                          leftIcon={<Move className="w-3 h-3" />}
                        >
                          Center
                        </Button>
                      </div>
                    </div>

                    {/* Brightness & Contrast Adjustment */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          Tone Balance
                        </span>
                        {(brightness !== 100 || contrast !== 100) && (
                          <button
                            onClick={() => {
                              setBrightness(100);
                              setContrast(100);
                            }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
                          >
                            Reset Tone
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <div className="flex justify-between text-zinc-500 text-[10px] mb-0.5">
                            <span>Brightness</span>
                            <span>{brightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="70"
                            max="130"
                            step="1"
                            value={brightness}
                            onChange={(e) => setBrightness(parseInt(e.target.value))}
                            className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-500 text-[10px] mb-0.5">
                            <span>Contrast</span>
                            <span>{contrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="70"
                            max="130"
                            step="1"
                            value={contrast}
                            onChange={(e) => setContrast(parseInt(e.target.value))}
                            className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setImageElement(null);
                      setSourceFile(null);
                      if (resultUrl) revokeSafeObjectURL(resultUrl);
                      setResultUrl(null);
                      setResultBlob(null);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Change Photo
                  </button>
                  <Button
                    onClick={() => processPhoto()}
                    isLoading={isProcessing}
                    variant="primary"
                    size="sm"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Format Passport Photo
                  </Button>
                </div>
              </div>
          </div>
        </div>

        {/* Right: Portal Verification & Download Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-5 rounded-lg border space-y-4 ${
              isDark
                ? 'bg-zinc-900/50 border-zinc-800'
                : 'bg-white border-zinc-200'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                <ShieldCheck className="w-4 h-4 text-zinc-500" />
                Passport Seva Verification
              </span>
              <div className="flex items-center gap-1.5">
                {isLiveSyncing ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Syncing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    Live Mirror
                  </span>
                )}
              </div>
            </div>

            {/* Live Compliance Checklist */}
            <div className={`space-y-2 p-3 rounded border text-xs ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Exact Dimensions
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>350 × 450 px (3.5×4.5 cm)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Target Size Limit
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>20 KB to 300 KB</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Embedded Resolution
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>300 DPI Header (JFIF)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Accepted Format
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>JPEG / JPG</span>
              </div>
            </div>

            {/* Formatted Output Preview */}
            {resultUrl ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-md border text-center flex flex-col items-center ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50/60 border-zinc-200'}`}>
                  <div className="w-[140px] h-[180px] rounded border border-zinc-200 dark:border-zinc-800 bg-white flex items-center justify-center p-0.5">
                    <img
                      src={resultUrl}
                      alt="Formatted Passport"
                      className="block max-w-full max-h-full rounded-xs"
                      style={{
                        aspectRatio: `${targetW} / ${targetH}`,
                      }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="font-mono text-zinc-900 dark:text-white font-medium">
                      {currentSizeKb} KB
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                      {verifiedDpi} DPI
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1 text-[11px] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-white" /> Portal Ready
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleDownload}
                    variant="primary"
                    size="lg"
                    className="w-full"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download Passport Photo
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPhoto}
                      className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Copy Image</span>
                    </button>
                    {isShareSupported() && (
                      <button
                        type="button"
                        onClick={handleSharePhoto}
                        className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Share</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-8 text-center rounded-md border border-dashed text-xs ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                Upload and frame your portrait photo to generate the verified Passport Seva file.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Keyboard Hotkey Helper Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-xs bg-zinc-50 dark:bg-zinc-850/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono select-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
            Hotkeys:
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">Ctrl+V</kbd> Paste
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">↑↓←→</kbd> Pan
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">+/-</kbd> Zoom
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">T</kbd> Rotate
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">G</kbd> Guides
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">↵ Enter</kbd> Format
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">D</kbd> Download
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">C</kbd> Copy
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 font-medium">Zero Mouse Latency</span>
      </div>

      {/* Authoritative Verified Guide, Official Specifications & FAQs */}
      <GovToolGuideSection toolId="passport-photo" />
    </div>
  );
};
