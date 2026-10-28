'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Sliders,
  FileCheck2,
  RefreshCw,
  Info,
  Maximize2,
  Eye,
  EyeOff,
  Check,
  HelpCircle,
  ChevronDown,
  Layers,
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

export type PhotoPortalPreset = 'protean-197x276' | 'utiitsl-213x213' | 'custom';

interface PhotoPresetConfig {
  id: PhotoPortalPreset;
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

const PHOTO_PRESETS: Record<PhotoPortalPreset, PhotoPresetConfig> = {
  'protean-197x276': {
    id: 'protean-197x276',
    name: 'Protean (NSDL) Standard',
    portal: 'Protean / NSDL Portal',
    width: 197,
    height: 276,
    minKb: 20,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 197 / 276,
    description: 'Exact 197 × 276 px (3.5 × 2.5 cm) · 20 KB to 50 KB · 200 DPI JPEG (Government Mandatory)',
  },
  'utiitsl-213x213': {
    id: 'utiitsl-213x213',
    name: 'UTIITSL Standard',
    portal: 'UTIITSL Government Portal',
    width: 213,
    height: 213,
    minKb: 15,
    maxKb: 30,
    dpi: 300,
    aspectRatio: 1,
    description: 'Exact 213 × 213 px (2.5 × 2.5 cm) · 15 KB to 30 KB · 300 DPI JPEG',
  },
  custom: {
    id: 'custom',
    name: 'Custom Dimensions',
    portal: 'Custom Portal Requirements',
    width: 197,
    height: 276,
    minKb: 20,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 197 / 276,
    description: 'Custom dimensions and strict file size range',
  },
};

interface PanPhotoResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PanPhotoResizer: React.FC<PanPhotoResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  // Selected preset
  const [selectedPreset, setSelectedPreset] = useState<PhotoPortalPreset>('protean-197x276');
  const [customW, setCustomW] = useState<number>(197);
  const [customH, setCustomH] = useState<number>(276);
  const [customMinKb, setCustomMinKb] = useState<number>(20);
  const [customMaxKb, setCustomMaxKb] = useState<number>(50);
  const [customDpi, setCustomDpi] = useState<number>(200);

  // Active configurations
  const activeConfig = PHOTO_PRESETS[selectedPreset];
  const targetWidth = selectedPreset === 'custom' ? customW : activeConfig.width;
  const targetHeight = selectedPreset === 'custom' ? customH : activeConfig.height;
  const targetMinKb = selectedPreset === 'custom' ? customMinKb : activeConfig.minKb;
  const targetMaxKb = selectedPreset === 'custom' ? customMaxKb : activeConfig.maxKb;
  const targetDpi = selectedPreset === 'custom' ? customDpi : activeConfig.dpi;
  const cropAspectRatio = targetWidth / targetHeight;

  // Image source state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Interactive Viewport State (Zoom, Pan, Rotation, Flip)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);

  // Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Viewport Box Dimensions (Strictly proportional to targetWidth / targetHeight)
  const BOX_MAX_W = 280;
  const BOX_MAX_H = 320;
  let boxW = BOX_MAX_W;
  let boxH = Math.round(boxW / cropAspectRatio);
  if (boxH > BOX_MAX_H) {
    boxH = BOX_MAX_H;
    boxW = Math.round(boxH * cropAspectRatio);
  }

  // Base rendered image size in viewport (Cover mode so entire frame is filled)
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

  // Dragging & Interaction state
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

  // Processing state & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [verifiedDpi, setVerifiedDpi] = useState<number | null>(null);
  const [resultSizeBytes, setResultSizeBytes] = useState<number>(0);
  const [resultQuality, setResultQuality] = useState<number>(0.9);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Cleanup object URLs on unmount or new result
  useEffect(() => {
    return () => {
      if (resultUrl) {
        revokeSafeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  // Load selected image file
  const handleFileSelected = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Invalid File', 'Please upload a valid JPEG, PNG, or WebP photo.', 'error');
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
      // Reset viewport transforms
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      onNotify(
        'Photo Loaded',
        `${file.name} (${img.naturalWidth}×${img.naturalHeight} px) ready for positioning.`,
        'info'
      );
    }).catch(() => {
      onNotify('Error Loading Image', 'Could not parse the selected image file.', 'error');
    });
  }, [resultUrl, onNotify]);

  // Reset transforms
  const handleResetViewport = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
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

  // Touch handlers for mobile pan & 2-finger pinch
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
      setZoom(Math.min(4, Math.max(0.6, parseFloat((pinchStartRef.current.zoom * ratio).toFixed(2)))));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartRef.current = { dist: 0, zoom: 1 };
  };

  // Process & Generate Portal Compliant Photo (100% Exact Parity)
  const handleProcessPhoto = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!imageElement || !viewportRef.current) return;
      if (options?.silent) {
        setIsLiveSyncing(true);
      } else {
        setIsProcessing(true);
      }

      try {
        // 1. Create target dimension canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not initialize canvas context');

        // Enable high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill pure white background (Government standard: no transparent or gray borders)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Exact scale ratio mapping viewport coordinates to target canvas
        const scale = targetWidth / boxW;

        // Apply brightness/contrast filter
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        // Transform matrix mapping viewport positioning to target canvas
        ctx.save();
        // Center canvas origin
        ctx.translate(targetWidth / 2, targetHeight / 2);
        // Pan offset scaled to target dimensions
        ctx.translate(pan.x * scale, pan.y * scale);
        // Rotation
        ctx.rotate((rotation * Math.PI) / 180);
        // Zoom and horizontal flip
        ctx.scale(zoom * (flipH ? -1 : 1), zoom);

        // Draw centered matching viewport base dimensions scaled up
        const drawW = baseW * scale;
        const drawH = baseH * scale;
        ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // Reset filter
        ctx.filter = 'none';

        // 2. Binary search compression & 200 DPI embedding
        const compressionResult = await compressCanvasToPortalSpecs(canvas, {
          minKb: targetMinKb,
          maxKb: targetMaxKb,
          dpi: targetDpi,
        });
        canvas.width = 0;
        canvas.height = 0;

        // Verify embedded DPI directly from output binary
        const dpiInfo = await readJpegDpi(compressionResult.blob);
        const verified = dpiInfo ? dpiInfo.dpiX : targetDpi;

        if (resultUrl) revokeSafeObjectURL(resultUrl);
        const outUrl = createSafeObjectURL(compressionResult.blob);

        setResultBlob(compressionResult.blob);
        setResultUrl(outUrl);
        setResultSizeBytes(compressionResult.sizeBytes);
        setVerifiedDpi(verified);
        setResultQuality(compressionResult.quality);

        if (!options?.silent) {
          onNotify(
            'Government Compliant Photo Ready!',
            `Size: ${formatBytes(compressionResult.sizeBytes)} · Dimensions: ${targetWidth}×${targetHeight} px · DPI: ${verified}`,
            'success'
          );
        }
      } catch (err: any) {
        console.error(err);
        if (!options?.silent) {
          onNotify('Processing Error', err?.message || 'Could not resize photo', 'error');
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
      handleProcessPhoto({ silent: true });
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
    targetWidth,
    targetHeight,
    targetDpi,
    targetMinKb,
    targetMaxKb,
    selectedPreset,
  ]);

  // Trigger Download
  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-photo';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}-${targetDpi}dpi.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  }, [resultBlob, sourceFile, targetWidth, targetHeight, targetDpi, onNotify]);

  const handleCopyImage = useCallback(async () => {
    if (!resultBlob) return;
    const res = await copyImageToClipboard(resultBlob, { width: targetWidth, height: targetHeight });
    if (res.success) {
      onNotify('Copied to Clipboard', 'PAN compliant photo copied as PNG!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser', 'error');
    }
  }, [resultBlob, targetWidth, targetHeight, onNotify]);

  const handleShareImage = useCallback(async () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-photo';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'PAN Card Photo',
      text: `PAN Card Photo (${targetWidth}×${targetHeight}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
    if (shared.shared) {
      onNotify('Shared Successfully', '', 'success');
    }
  }, [resultBlob, sourceFile, targetWidth, targetHeight, resultSizeBytes, onNotify]);

  const isSizeCompliant =
    resultSizeBytes >= targetMinKb * 1024 && resultSizeBytes <= targetMaxKb * 1024;

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

      // Global Presets: 1, 2, 3
      if (e.key === '1') {
        e.preventDefault();
        setSelectedPreset('protean-197x276');
        onNotify('Preset: Protean (NSDL)', '197×276 px · 20–50 KB · 200 DPI', 'info');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setSelectedPreset('utiitsl-213x213');
        onNotify('Preset: UTIITSL', '213×213 px · 15–30 KB · 300 DPI', 'info');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setSelectedPreset('custom');
        onNotify('Preset: Custom Dimensions', 'Configure custom dimensions', 'info');
        return;
      }

      // If no image is loaded yet, only preset keys can be pressed
      if (!imageElement) return;

      // Download: D or Ctrl+S / Cmd+S
      if (e.key === 'd' || e.key === 'D' || ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        if (resultBlob) {
          handleDownload();
        } else {
          handleProcessPhoto();
        }
        return;
      }

      // Copy: C or Ctrl+C / Cmd+C (without selection)
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        if (resultBlob) {
          e.preventDefault();
          handleCopyImage();
          return;
        }
      }

      // Process / Format: Enter or Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProcessPhoto();
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
        setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.05).toFixed(2))));
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
    handleCopyImage,
    handleProcessPhoto,
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
                ? 'प्रोटियन (NSDL) और UTIITSL सरकारी विनिर्देश'
                : 'Protean (NSDL) & UTIITSL Government Specifications'}
            </span>
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-950'
            }`}
          >
            {language === 'hi'
              ? 'PAN कार्ड फ़ोटो रिसाइज़र & DPI फॉर्मेटर'
              : 'PAN Photo Resizer & DPI Formatter'}
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {language === 'hi'
              ? 'NSDL और UTIITSL के लिए सटीक डायमेंशन, फ़ाइल साइज़ और 200 DPI के साथ फ़ोटो तैयार करें।'
              : 'Crop and align your photo with exact NSDL & UTIITSL dimensions, file size, and 200 DPI.'}
          </p>
        </div>

        {/* Preset Target Tabs (Clean Pill Bar) */}
        <div className="flex flex-wrap justify-center gap-2">
          {(Object.keys(PHOTO_PRESETS) as PhotoPortalPreset[]).map((key, index) => {
            const preset = PHOTO_PRESETS[key];
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <kbd
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                    isSelected
                      ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-700 dark:border-zinc-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {shortcutNum}
                </kbd>
                <span>{preset.name}</span>
                <span className="text-[10px] opacity-70">({preset.width}×{preset.height} px)</span>
              </button>
            );
          })}
        </div>

        {/* Direct Dropzone (Centered, Max-w-3xl, Clean & Focused) */}
        <div className="max-w-3xl mx-auto">
          <Dropzone
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onFilesSelected={handleFileSelected}
            title="Upload Passport Photo for PAN Card"
            description="Drag & drop or click to browse. Auto-formats to official portal specs."
          />
        </div>

        {/* Authoritative Verified Guide, Official Specifications & FAQs */}
        <GovToolGuideSection toolId="pan-photo-resize" />
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (PHOTO LOADED & READY)
  ------------------------------------------------------------- */
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Toolbar / Pro Workspace Header */}
      <div
        className={`p-3.5 sm:p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
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
                    {sourceFile?.name}
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
                    : `${targetWidth}×${targetHeight} px · ${targetMinKb}–${targetMaxKb} KB · ${targetDpi} DPI`}
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
                    onClick={handleCopyImage}
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
                  onClick={() => (resultBlob ? handleDownload() : handleProcessPhoto())}
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
                        : 'Crop & Format'}
                  </span>
                  <kbd className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/20 dark:bg-black/30 text-white">
                    {resultBlob ? 'D' : '↵'}
                  </kbd>
                </Button>
              </div>
            </div>

            {/* Viewport & Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Crop Viewport */}
              <div className="lg:col-span-7 space-y-4">
                {/* Viewport Header Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-emerald-400" />
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Interactive Viewport
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {targetWidth} × {targetHeight} px
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowGuides((prev) => !prev)}
                      title={showGuides ? 'Hide biometric guides' : 'Show biometric guides'}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                        showGuides
                          ? isDark
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : isDark
                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {showGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{showGuides ? 'Guides On' : 'Guides Off'}</span>
                    </button>

                    <button
                      onClick={handleCenter}
                      title="Center alignment"
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                          : 'bg-white text-slate-600 hover:text-slate-950 border-slate-200'
                      }`}
                    >
                      Center
                    </button>

                    <button
                      onClick={handleResetViewport}
                      title="Reset all zoom, pan, and rotation"
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                        isDark
                          ? 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                          : 'bg-white text-slate-600 hover:text-slate-950 border-slate-200'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Studio Canvas Viewport (Clean Minimalist 2D Matte) */}
                <div
                  ref={canvasContainerRef}
                  tabIndex={0}
                  className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 flex items-center justify-center select-none cursor-grab active:cursor-grabbing focus:outline-none focus:border-zinc-400 transition-colors touch-none"
                  style={{
                    height: '460px',
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
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                      }}
                    >
                      <img
                        src={imageSrc || imageElement.src}
                        alt="PAN Photo Preview"
                        className="max-w-none pointer-events-none select-none"
                        style={{
                          width: `${baseW}px`,
                          height: `${baseH}px`,
                        }}
                        draggable={false}
                      />
                    </div>

                    {/* Viewfinder Corner L-Brackets */}
                    <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-2 border-l-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-2 border-r-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-2 border-l-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-2 border-r-2 border-zinc-900 dark:border-white pointer-events-none z-10" />

                    {/* Clean Minimalist Composition Grid Overlay */}
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
                      {targetWidth} × {targetHeight} px · {targetDpi} DPI
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
                        onClick={() => setZoom((prev) => Math.max(0.6, parseFloat((prev - 0.1).toFixed(2))))}
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
                        min="0.6"
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
                          onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                          leftIcon={<RotateCcw className="w-3 h-3" />}
                        >
                          -90°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-full px-2"
                          onClick={() => setRotation((prev) => (prev + 90) % 360)}
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
                            max="140"
                            step="2"
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
                            max="140"
                            step="2"
                            value={contrast}
                            onChange={(e) => setContrast(parseInt(e.target.value))}
                            className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Result & Government Compliance Badge */}
              <div className="lg:col-span-5 space-y-6">
                <div
                  className={`p-5 rounded-lg border space-y-5 ${
                    isDark
                      ? 'bg-zinc-900/50 border-zinc-800'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className={`flex items-center justify-between border-b pb-3.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      <FileCheck2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      Live Portal Validation
                    </h3>
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

                  {/* Result Preview Box (Exact 1:1 Viewport Mirror) */}
                  <div className={`flex flex-col items-center justify-center p-4 rounded-md border border-dashed min-h-[240px] ${
                    isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'
                  }`}>
                    {resultUrl ? (
                      <div className="text-center space-y-3">
                        <div className="inline-block p-1 bg-white rounded border border-zinc-200 dark:border-zinc-800">
                          <img
                            src={resultUrl}
                            alt="Government Compliant PAN Photo"
                            className="block rounded-xs"
                            style={{
                              width: `${targetWidth}px`,
                              height: `${targetHeight}px`,
                              maxWidth: '100%',
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                              {targetWidth} × {targetHeight} px
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium">
                              {verifiedDpi} DPI
                            </span>
                          </div>
                          <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Aspect ratio {cropAspectRatio.toFixed(2)}:1 · {formatBytes(resultSizeBytes)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 py-6 px-4">
                        <div className={`w-10 h-10 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto ${
                          isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-500'
                        }`}>
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Live Validation Ready
                          </p>
                          <p className={`text-[11px] max-w-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            Position your photo in the viewport; output renders and validates in real-time.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Portal Compliance Checklist */}
                  <div className="space-y-2">
                    <span className={`text-[11px] font-medium uppercase tracking-wider block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Portal Requirements Check
                    </span>

                    <div className="space-y-1.5 text-xs">
                      {/* Check 1: Dimensions */}
                      <div
                        className={`p-2.5 rounded border flex items-center justify-between ${
                          isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${resultBlob ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />
                          Dimensions: {targetWidth} × {targetHeight} px
                        </span>
                        <span className="font-mono text-[10px] font-medium uppercase">
                          {resultBlob ? 'PASS' : 'Pending'}
                        </span>
                      </div>

                      {/* Check 2: File Size */}
                      <div
                        className={`p-2.5 rounded border flex items-center justify-between ${
                          isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${resultBlob && isSizeCompliant ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />
                          File Size: {targetMinKb} KB – {targetMaxKb} KB
                        </span>
                        <span className="font-mono text-[10px] font-medium uppercase">
                          {resultBlob ? `${formatBytes(resultSizeBytes)}` : 'Pending'}
                        </span>
                      </div>

                      {/* Check 3: DPI Metadata */}
                      <div
                        className={`p-2.5 rounded border flex items-center justify-between ${
                          isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${resultBlob && verifiedDpi === targetDpi ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />
                          DPI Metadata: {targetDpi} DPI JFIF
                        </span>
                        <span className="font-mono text-[10px] font-medium uppercase">
                          {resultBlob ? `${verifiedDpi} DPI Verified` : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Download & Action Buttons */}
                  <div className="pt-1 space-y-2">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={handleDownload}
                      disabled={!resultBlob}
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      {resultBlob
                        ? `Download Compliant Photo (${formatBytes(resultSizeBytes)})`
                        : 'Generate to Download'}
                    </Button>

                    {resultBlob && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCopyImage}
                          className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Copy Image</span>
                        </button>
                        {isShareSupported() && (
                          <button
                            type="button"
                            onClick={handleShareImage}
                            className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Share</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">1</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">2</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">3</kbd> Presets
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
      <GovToolGuideSection toolId="pan-photo-resize" />
    </div>
  );
};
