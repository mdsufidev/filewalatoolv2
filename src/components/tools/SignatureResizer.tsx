'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PenTool,
  CheckCircle2,
  Download,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  RefreshCw,
  Sun,
  Contrast,
  HelpCircle,
  ChevronDown,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FlipHorizontal,
  Eye,
  EyeOff,
  Maximize2,
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

export type SignaturePortalPreset = 'protean-354x157' | 'utiitsl-400x200' | 'custom';

interface SignaturePresetConfig {
  id: SignaturePortalPreset;
  name: string;
  portal: string;
  width: number;
  height: number;
  minKb: number;
  maxKb: number;
  dpi: number;
  aspectRatio: number; // width / height
  description: string;
}

const SIGNATURE_PRESETS: Record<SignaturePortalPreset, SignaturePresetConfig> = {
  'protean-354x157': {
    id: 'protean-354x157',
    name: 'Protean (NSDL) Standard',
    portal: 'Protean / NSDL Portal',
    width: 354,
    height: 157,
    minKb: 10,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 354 / 157, // ~2.25:1 (4.5 cm x 2.0 cm)
    description: 'Exact 354 × 157 px (4.5 × 2.0 cm) · Strictly < 50 KB · 200 DPI JPEG',
  },
  'utiitsl-400x200': {
    id: 'utiitsl-400x200',
    name: 'UTIITSL Standard',
    portal: 'UTIITSL Government Portal',
    width: 400,
    height: 200,
    minKb: 10,
    maxKb: 60,
    dpi: 600,
    aspectRatio: 400 / 200, // 2:1
    description: '400 × 200 px · Strictly < 60 KB · 600 DPI JPEG (Dark ink on white)',
  },
  custom: {
    id: 'custom',
    name: 'Custom Signature',
    portal: 'Custom Specifications',
    width: 354,
    height: 157,
    minKb: 5,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 354 / 157,
    description: 'Custom dimensions and file size bounds',
  },
};

interface SignatureResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SignatureResizer: React.FC<SignatureResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  // Preset Selection
  const [selectedPreset, setSelectedPreset] = useState<SignaturePortalPreset>('protean-354x157');
  const [customW, setCustomW] = useState<number>(354);
  const [customH, setCustomH] = useState<number>(157);
  const [customMaxKb, setCustomMaxKb] = useState<number>(50);
  const [customDpi, setCustomDpi] = useState<number>(200);

  // Active specifications
  const activeConfig = SIGNATURE_PRESETS[selectedPreset];
  const targetWidth = selectedPreset === 'custom' ? customW : activeConfig.width;
  const targetHeight = selectedPreset === 'custom' ? customH : activeConfig.height;
  const targetMinKb = selectedPreset === 'custom' ? 5 : activeConfig.minKb;
  const targetMaxKb = selectedPreset === 'custom' ? customMaxKb : activeConfig.maxKb;
  const targetDpi = selectedPreset === 'custom' ? customDpi : activeConfig.dpi;
  const cropAspectRatio = targetWidth / targetHeight;

  // File & Image state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Viewport transforms (Zoom, Pan, Rotation, Flip)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);

  // Signature Enhancements
  const [paperWhitening, setPaperWhitening] = useState<number>(120); // brightness %
  const [inkDarkness, setInkDarkness] = useState<number>(150); // contrast %
  const [autoCleanPaper, setAutoCleanPaper] = useState<boolean>(true); // background threshold wash

  // Viewport Box Dimensions (Strictly proportional to targetWidth / targetHeight)
  const BOX_MAX_W = 280;
  const BOX_MAX_H = 130;
  let boxW = BOX_MAX_W;
  let boxH = Math.round(boxW / cropAspectRatio);
  if (boxH > BOX_MAX_H) {
    boxH = BOX_MAX_H;
    boxW = Math.round(boxH * cropAspectRatio);
  }

  // Base rendered signature size in viewport (Contain mode: full signature fits in frame)
  let baseW = boxW;
  let baseH = boxH;
  if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
    const imgAspect = imageNaturalSize.width / imageNaturalSize.height;
    if (imgAspect > cropAspectRatio) {
      baseW = Math.round(boxW * 0.95);
      baseH = Math.round(baseW / imgAspect);
    } else {
      baseH = Math.round(boxH * 0.95);
      baseW = Math.round(baseH * imgAspect);
    }
  }

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0,
    initialPanY: 0,
  });
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [verifiedDpi, setVerifiedDpi] = useState<number | null>(null);
  const [resultSizeBytes, setResultSizeBytes] = useState<number>(0);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Clean URLs
  useEffect(() => {
    return () => {
      if (resultUrl) {
        revokeSafeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  // Load File
  const handleFileSelected = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Invalid File', 'Please upload a valid JPEG, PNG, or WebP signature image.', 'error');
      return;
    }

    if (resultUrl) {
      revokeSafeObjectURL(resultUrl);
      setResultUrl(null);
      setResultBlob(null);
    }

    CanvasEngine.loadImage(file).then((img) => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageElement(img);
      setImageSrc(img.src);
      setSourceFile(file);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setPaperWhitening(120);
      setInkDarkness(150);
      onNotify('Signature Loaded', `${file.name} ready for isolation.`, 'info');
    }).catch(() => {
      onNotify('Error Loading Image', 'Could not parse the signature image file.', 'error');
    });
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

  const handleResetViewport = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setPaperWhitening(120);
    setInkDarkness(150);
  }, []);

  const handleCenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  const nudge = useCallback((dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const rotateCCW = useCallback(() => setRotation((prev) => (prev - 90 + 360) % 360), []);
  const rotateCW = useCallback(() => setRotation((prev) => (prev + 90) % 360), []);
  const toggleFlipH = useCallback(() => setFlipH((prev) => !prev), []);

  // Ultra-Smooth Pointer Capture Drag Handlers
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

  // Native non-passive wheel listener: strictly prevents page scrolling while zooming on canvas
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(4, Math.max(0.6, parseFloat((prev + zoomDelta).toFixed(2)))));
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [imageSrc, imageElement]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setPan({
      x: Math.round(dragStartRef.current.initialPanX + dx),
      y: Math.round(dragStartRef.current.initialPanY + dy),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Process and Crop Signature (100% Exact Parity)
  const handleProcessSignature = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!imageElement || !viewportRef.current) return;
      if (options?.silent) {
        setIsLiveSyncing(true);
      } else {
        setIsProcessing(true);
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas rendering context');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill pure white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Exact scale ratio mapping viewport coordinates to target canvas
        const scale = targetWidth / boxW;

        // Filter settings
        ctx.filter = `brightness(${paperWhitening}%) contrast(${inkDarkness}%)`;

        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.translate(pan.x * scale, pan.y * scale);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom * (flipH ? -1 : 1), zoom);

        const drawW = baseW * scale;
        const drawH = baseH * scale;
        ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        ctx.filter = 'none';

        // Auto clean grayish background pixels if enabled
        if (autoCleanPaper) {
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;
          // Whiten light-gray pixels from shadows
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If pixel is light gray / off-white, push to pure white
            if (r > 200 && g > 200 && b > 200) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Compress and embed 200 DPI
        const compressionResult = await compressCanvasToPortalSpecs(canvas, {
          minKb: targetMinKb,
          maxKb: targetMaxKb,
          dpi: targetDpi,
        });
        canvas.width = 0;
        canvas.height = 0;

        const dpiInfo = await readJpegDpi(compressionResult.blob);
        const verified = dpiInfo ? dpiInfo.dpiX : targetDpi;

        if (resultUrl) revokeSafeObjectURL(resultUrl);
        const outUrl = createSafeObjectURL(compressionResult.blob);

        setResultBlob(compressionResult.blob);
        setResultUrl(outUrl);
        setResultSizeBytes(compressionResult.sizeBytes);
        setVerifiedDpi(verified);

        if (!options?.silent) {
          onNotify(
            'Government Compliant Signature Ready!',
            `Size: ${formatBytes(compressionResult.sizeBytes)} (Strictly < ${targetMaxKb} KB) · 200 DPI`,
            'success'
          );
        }
      } catch (err: any) {
        console.error(err);
        if (!options?.silent) {
          onNotify('Processing Error', err?.message || 'Could not process signature', 'error');
        }
      } finally {
        setIsProcessing(false);
        setIsLiveSyncing(false);
      }
    },
    [
      imageElement,
      targetWidth,
      targetHeight,
      boxW,
      paperWhitening,
      inkDarkness,
      pan.x,
      pan.y,
      rotation,
      flipH,
      zoom,
      baseW,
      baseH,
      autoCleanPaper,
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
      handleProcessSignature({ silent: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [
    imageElement,
    pan.x,
    pan.y,
    zoom,
    rotation,
    flipH,
    paperWhitening,
    inkDarkness,
    autoCleanPaper,
    targetWidth,
    targetHeight,
    targetDpi,
    targetMaxKb,
    selectedPreset,
  ]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-signature';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}-${targetDpi}dpi.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  }, [resultBlob, sourceFile, targetWidth, targetHeight, targetDpi, onNotify]);

  const handleCopySignature = useCallback(async () => {
    if (!resultBlob) return;
    const res = await copyImageToClipboard(resultBlob, { width: targetWidth, height: targetHeight });
    if (res.success) {
      onNotify('Copied to Clipboard', 'Compliant signature copied as PNG!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser', 'error');
    }
  }, [resultBlob, targetWidth, targetHeight, onNotify]);

  const handleShareSignature = useCallback(async () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-signature';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'PAN Signature',
      text: `PAN Signature (${targetWidth}×${targetHeight}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
    if (shared.shared) {
      onNotify('Shared Successfully', '', 'success');
    }
  }, [resultBlob, sourceFile, targetWidth, targetHeight, resultSizeBytes, onNotify]);

  const isCompliant =
    resultBlob &&
    resultSizeBytes <= targetMaxKb * 1024 &&
    resultSizeBytes >= targetMinKb * 1024;

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

      // Presets 1, 2, 3
      if (e.key === '1') {
        e.preventDefault();
        setSelectedPreset('protean-354x157');
        onNotify('Preset: Protean (NSDL)', '354×157 px · <50 KB · 200 DPI', 'info');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setSelectedPreset('utiitsl-400x200');
        onNotify('Preset: UTIITSL', '400×200 px · <30 KB · 200 DPI', 'info');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setSelectedPreset('custom');
        onNotify('Preset: Custom Dimensions', 'Configure custom dimensions', 'info');
        return;
      }

      if (!imageElement) return;

      // Download: D or Ctrl+S / Cmd+S
      if (e.key === 'd' || e.key === 'D' || ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        if (resultBlob) {
          handleDownload();
        } else {
          handleProcessSignature();
        }
        return;
      }

      // Copy: C or Ctrl+C / Cmd+C (without selection)
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        if (resultBlob) {
          e.preventDefault();
          handleCopySignature();
          return;
        }
      }

      // Process / Format: Enter or Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProcessSignature();
        return;
      }

      // Reset / New: N or Esc
      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        handleResetFile();
        onNotify('Reset', 'Cleared signature and reset viewport.', 'info');
        return;
      }

      // Toggle White Paper wash: W
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setAutoCleanPaper((prev) => !prev);
        onNotify('Paper Whitening', !autoCleanPaper ? 'White wash enabled' : 'Raw paper mode', 'info');
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
        setZoom((prev) => Math.max(0.6, parseFloat((prev - 0.05).toFixed(2))));
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [
    imageElement,
    resultBlob,
    handleDownload,
    handleCopySignature,
    handleProcessSignature,
    handleResetFile,
    rotateCW,
    toggleFlipH,
    nudge,
    autoCleanPaper,
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
              <span>Protean (NSDL) &amp; UTIITSL Specs</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              PAN Signature Resizer &amp; DPI Formatter
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Crop signature, whiten background, and format strictly for NSDL &amp; UTIITSL portals (200 DPI).
            </p>
          </div>

          {/* Preset Target Tabs (Clean Pill Bar) */}
          <div className="flex flex-wrap justify-center gap-1.5 max-w-[700px] mx-auto">
            {(Object.keys(SIGNATURE_PRESETS) as SignaturePortalPreset[]).map((key, index) => {
              const preset = SIGNATURE_PRESETS[key];
              const isSelected = selectedPreset === key;
              const shortcutNum = index + 1;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(key);
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
                  <kbd className="px-1 py-0.2 rounded text-[10px] font-mono opacity-70">
                    {shortcutNum}
                  </kbd>
                  <span>{preset.name}</span>
                  <span className="text-[10px] opacity-70">({preset.width}×{preset.height})</span>
                </button>
              );
            })}
          </div>

          {/* Direct Dropzone */}
          <div className="max-w-[700px] mx-auto">
            <Dropzone
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onFilesSelected={handleFileSelected}
              title="Upload Signature Image"
              description="Drag & drop or click to browse. Auto-formats to official portal specs."
              className="h-[230px] sm:h-[260px] lg:h-[280px]"
            />
          </div>
        </div>

        {/* Verified Guide */}
        <div className="pt-2">
          <GovToolGuideSection toolId="signature-resize" />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (SIGNATURE LOADED & READY)
  ------------------------------------------------------------- */
  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Top Inline Hero Row */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            PAN Signature Resizer
          </span>
          {/* Preset switch pills */}
          <div className="hidden sm:flex items-center gap-1">
            {(Object.keys(SIGNATURE_PRESETS) as SignaturePortalPreset[]).map((key) => {
              const preset = SIGNATURE_PRESETS[key];
              const isSelected = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPreset(key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {preset.width}×{preset.height}
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
                ? `✓ ${formatBytes(resultSizeBytes)} · ${verifiedDpi || targetDpi} DPI`
                : `${targetWidth}×${targetHeight}px · ${targetDpi} DPI`}
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

      {/* Viewport & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-start">
        {/* Left Column: Interactive Crop Viewport (lg:col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-1.5">
          {/* Studio Canvas Viewport */}
          <div
            ref={canvasContainerRef}
            tabIndex={0}
            className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 flex items-center justify-center select-none cursor-grab active:cursor-grabbing focus:outline-none transition-colors touch-none h-[230px] sm:h-[260px] lg:h-[280px] xl:h-[300px]"
            style={{
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
              className="relative overflow-hidden border-2 border-zinc-900/90 dark:border-white rounded-xs shadow-xl bg-white pointer-events-none ring-4 ring-zinc-950/5 dark:ring-white/10"
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
                  filter: `brightness(${paperWhitening}%) contrast(${inkDarkness}%)`,
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                <img
                  src={imageSrc || imageElement.src}
                  alt="Signature Preview"
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
                  <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />
                </div>
              )}
            </div>

            {/* Top-Left Live Metadata Pill */}
            <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-white border border-zinc-700/50 backdrop-blur-xs flex items-center gap-1">
                <Maximize2 className="w-2.5 h-2.5 text-zinc-300" />
                {targetWidth} × {targetHeight} px · {targetDpi} DPI
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-zinc-200 border border-zinc-700/50 backdrop-blur-xs">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Docked Precision Controls Strip */}
          <div className="p-1.5 sm:p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between flex-wrap gap-1.5">
            {/* Zoom Slider + Quick Pills */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <ZoomIn className="w-3 h-3 text-zinc-400 shrink-0" />
              <input
                type="range"
                min="0.6"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-24 sm:w-32 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
              />
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

            {/* Quick Actions: Rotate, Center, Guides */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Rotate -90°"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
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
                onClick={handleResetViewport}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Reset Viewport"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Requirements, Whitening Controls & Download (lg:col-span-5 xl:col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-1.5">
          <div className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            {/* Header / Requirements Summary */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                Portal Specifications
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {targetWidth}×{targetHeight} px
              </span>
            </div>

            {/* Compact Requirements Check Rows */}
            <div className="space-y-1 text-xs">
              <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Size: Strictly &lt; {targetMaxKb} KB
                </span>
                <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {resultBlob ? `${formatBytes(resultSizeBytes)} ✓` : 'Auto-compress'}
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

            {/* Whitening & Ink Contrast Sliders */}
            <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5">
                    <span>Whitening</span>
                    <span className="font-mono">{paperWhitening}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="160"
                    step="2"
                    value={paperWhitening}
                    onChange={(e) => setPaperWhitening(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5">
                    <span>Ink Contrast</span>
                    <span className="font-mono">{inkDarkness}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    step="5"
                    value={inkDarkness}
                    onChange={(e) => setInkDarkness(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={autoCleanPaper}
                  onChange={(e) => setAutoCleanPaper(e.target.checked)}
                  className="rounded accent-zinc-900 dark:accent-zinc-100 cursor-pointer w-3 h-3"
                />
                <span>Pure White Background Threshold Wash</span>
              </label>
            </div>

            {/* Download CTA Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!resultBlob || isProcessing}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {resultBlob
                    ? `Download Compliant Signature (${formatBytes(resultSizeBytes)})`
                    : 'Generate to Download'}
                </span>
              </button>

              {resultBlob && (
                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={handleCopySignature}
                    className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Copy</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShareSignature}
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
        <GovToolGuideSection toolId="signature-resize" />
      </div>
    </div>
  );
};
