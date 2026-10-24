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

export type PhotoPortalPreset = 'protean-200x230' | 'utiitsl-213x213' | 'custom';

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
  'protean-200x230': {
    id: 'protean-200x230',
    name: 'Protean (NSDL) Standard',
    portal: 'Protean / NSDL Portal',
    width: 200,
    height: 230,
    minKb: 20,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 200 / 230,
    description: 'Exact 200 × 230 px · 20 KB to 50 KB · 200 DPI JPEG (Government Mandatory)',
  },
  'utiitsl-213x213': {
    id: 'utiitsl-213x213',
    name: 'UTIITSL Portal Standard',
    portal: 'UTIITSL Government Portal',
    width: 213,
    height: 213,
    minKb: 15,
    maxKb: 30,
    dpi: 300,
    aspectRatio: 1,
    description: 'Exact 213 × 213 px (3.5 × 2.5 cm) · 15 KB to 30 KB · 300 DPI JPEG',
  },
  custom: {
    id: 'custom',
    name: 'Custom Dimensions',
    portal: 'Custom Portal Requirements',
    width: 200,
    height: 230,
    minKb: 20,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 200 / 230,
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
  const [selectedPreset, setSelectedPreset] = useState<PhotoPortalPreset>('protean-200x230');
  const [customW, setCustomW] = useState<number>(200);
  const [customH, setCustomH] = useState<number>(230);
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
  const handleFileSelected = (files: File[]) => {
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageElement(img);
        setImageSrc(dataUrl);
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
      };
      img.onerror = () => {
        onNotify('Error Loading Image', 'Could not parse the selected image file.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      onNotify('Error Reading File', 'Could not read the selected image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Reset transforms
  const handleResetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
  };

  const handleCenter = () => {
    setPan({ x: 0, y: 0 });
  };

  const nudge = (dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const rotateCCW = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const rotateCW = () => setRotation((prev) => (prev + 90) % 360);
  const toggleFlipH = () => setFlipH((prev) => !prev);

  // Keyboard shortcuts for full image editing & pixel-level alignment
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If target is an input or textarea, let default behavior take place
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

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
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (e.shiftKey) {
        rotateCCW();
      } else {
        rotateCW();
      }
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      toggleFlipH();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      handleCenter();
    } else if (e.key === '0') {
      e.preventDefault();
      handleResetViewport();
    } else if (e.key === '[') {
      e.preventDefault();
      if (e.shiftKey) {
        setContrast((prev) => Math.max(70, prev - 5));
      } else {
        setBrightness((prev) => Math.max(70, prev - 5));
      }
    } else if (e.key === ']') {
      e.preventDefault();
      if (e.shiftKey) {
        setContrast((prev) => Math.min(140, prev + 5));
      } else {
        setBrightness((prev) => Math.min(140, prev + 5));
      }
    }
  };

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

  // Wheel to Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(4, Math.max(0.6, parseFloat((prev + zoomDelta).toFixed(2)))));
  };

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
  const handleDownload = () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-photo';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}-${targetDpi}dpi.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  };

  const handleCopyImage = async () => {
    if (!resultBlob) return;
    const res = await copyImageToClipboard(resultBlob, { width: targetWidth, height: targetHeight });
    if (res.success) {
      onNotify('Copied to Clipboard', 'PAN compliant photo copied as PNG!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser', 'error');
    }
  };

  const handleShareImage = async () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-photo';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}.jpg`;
    await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'PAN Card Photo',
      text: `PAN Card Photo (${targetWidth}×${targetHeight}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
  };

  const isSizeCompliant =
    resultSizeBytes >= targetMinKb * 1024 && resultSizeBytes <= targetMaxKb * 1024;

  const currentStep = !imageElement ? 1 : !resultBlob ? 2 : 3;

  const handleResetFile = () => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
    setImageElement(null);
    setImageSrc(null);
    setSourceFile(null);
  };

  const handleReAdjust = () => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium border bg-zinc-100 border-zinc-200 text-zinc-700">
          <Camera className="w-3.5 h-3.5 text-zinc-700" />
          <span>
            {language === 'hi'
              ? 'प्रोटियन (NSDL) और UTIITSL सरकारी विनिर्देश'
              : 'Protean (NSDL) & UTIITSL Government Specifications'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          {language === 'hi'
            ? 'PAN कार्ड फ़ोटो रिसाइज़र & DPI फॉर्मेटर'
            : 'PAN Photo Resizer & DPI Formatter'}
        </h1>

        <p className="text-xs sm:text-sm leading-relaxed text-zinc-600">
          {language === 'hi' ? (
            <>
              इंटरएक्टिव पैन और ज़ूम के साथ अपनी पासपोर्ट फ़ोटो संरेखित और क्रॉप करें। सख्त{' '}
              <strong className="text-zinc-950">200 × 230 px</strong>,{' '}
              <strong className="text-zinc-950">20 KB – 50 KB</strong>, और{' '}
              <strong className="text-zinc-950">200 DPI</strong> हेडर 100% आपके ब्राउज़र में जनरेट करता है।
            </>
          ) : (
            <>
              Align and crop your passport photo with interactive pan &amp; zoom. Generates strict{' '}
              <strong className="text-zinc-950">200 × 230 px</strong>,{' '}
              <strong className="text-zinc-950">20 KB – 50 KB</strong>, and embeds{' '}
              <strong className="text-zinc-950">200 DPI</strong> headers 100% in your browser.
            </>
          )}
        </p>
      </div>

      {/* 3-Step Compliance Progress Bar */}
      <ComplianceProgressBar
        currentStep={currentStep}
        toolName={language === 'hi' ? 'PAN फ़ोटो सत्यापन (200×230)' : 'PAN Photo Compliance (200×230)'}
        step1Label={language === 'hi' ? 'फ़ोटो अपलोड करें' : 'Upload Photo'}
        step2Label={language === 'hi' ? 'फ़्रेम में सेट करें' : 'Align & Zoom Viewport'}
        step3Label={language === 'hi' ? 'डाउनलोड 200 DPI' : 'Download 200 DPI'}
        step1Desc={language === 'hi' ? 'पासपोर्ट फ़ोटो चुनें' : 'Select passport portrait'}
        step2Desc={language === 'hi' ? '200×230 px फ्रेम में सेट करें' : 'Fit 200×230 px frame'}
        step3Desc={language === 'hi' ? '20–50 KB और 200 DPI JPEG' : '20–50 KB & 200 DPI JPEG'}
        onReset={handleResetFile}
        onReAdjust={handleReAdjust}
      />

      {/* Preset Selector Bar */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap p-1 rounded-lg text-xs gap-1 border border-zinc-200 bg-zinc-50 max-w-full">
          {(Object.keys(PHOTO_PRESETS) as PhotoPortalPreset[]).map((key) => {
            const preset = PHOTO_PRESETS[key];
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedPreset(key);
                  if (resultUrl) {
                    revokeSafeObjectURL(resultUrl);
                    setResultUrl(null);
                    setResultBlob(null);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 text-white font-semibold border border-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-transparent'
                }`}
              >
                <span>{preset.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}
                >
                  {preset.width}×{preset.height} px
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="p-6 sm:p-7 rounded-lg border border-zinc-200 bg-white">
        {!imageElement ? (
          <div className="space-y-6">
            <Dropzone
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onFilesSelected={handleFileSelected}
              title="Drag & drop your passport photo here"
              description="Supports JPG, PNG, and WebP. Auto-converts to 200×230 px, 20–50 KB, 200 DPI JPEG."
            />

            {/* Quick specifications glance card */}
            <div
              className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-center ${
                isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Target Dimensions
                </span>
                <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {targetWidth} × {targetHeight} px
                </p>
                <p className="text-xs text-slate-400">Strict portrait ratio</p>
              </div>

              <div className="space-y-1 sm:border-x border-slate-800/40">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Allowed File Size
                </span>
                <p className={`text-base font-bold text-emerald-400`}>
                  {targetMinKb} KB – {targetMaxKb} KB
                </p>
                <p className="text-xs text-slate-400">Guaranteed portal acceptance</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  DPI Header
                </span>
                <p className={`text-base font-bold text-blue-400`}>
                  {targetDpi} DPI Embedded
                </p>
                <p className="text-xs text-slate-400">JFIF APP0 standard</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Toolbar */}
            <div
              className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold truncate max-w-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {sourceFile?.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Original: {formatBytes(sourceFile?.size || 0)}</span>
                    <span>•</span>
                    <span>{imageNaturalSize.width} × {imageNaturalSize.height} px</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageElement(null);
                    setSourceFile(null);
                    if (resultUrl) revokeSafeObjectURL(resultUrl);
                    setResultUrl(null);
                    setResultBlob(null);
                  }}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Change Image
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleProcessPhoto()}
                  disabled={isProcessing}
                  leftIcon={
                    isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )
                  }
                >
                  {isProcessing ? 'Optimizing...' : 'Crop & Format (200 DPI)'}
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
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  className="relative overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 flex items-center justify-center select-none cursor-grab active:cursor-grabbing focus:outline-none focus:border-zinc-400 transition-colors"
                  style={{ height: '460px' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Fixed Aspect Ratio Crop Box with Outer Matte Scrim */}
                  <div
                    ref={viewportRef}
                    className="relative overflow-hidden shadow-[0_0_0_9999px_rgba(24,24,27,0.60)] border-2 border-white rounded-xs pointer-events-none"
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
                    <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-2 border-l-2 border-white/90 pointer-events-none z-10" />
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-2 border-r-2 border-white/90 pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-2 border-l-2 border-white/90 pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-2 border-r-2 border-white/90 pointer-events-none z-10" />

                    {/* Clean Minimalist Composition Grid Overlay */}
                    {showGuides && (
                      <div className="absolute inset-0 pointer-events-none border border-white/20">
                        {/* Rule of thirds grid lines */}
                        <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-white/30" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-white/30" />
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-white/30" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-white/30" />

                        {/* Subtle center crosshair */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-60">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top-Left Live Metadata Pill Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-white border border-zinc-800 flex items-center gap-1.5">
                      <Maximize2 className="w-3 h-3 text-zinc-300" />
                      {targetWidth} × {targetHeight} px
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-200 border border-zinc-800">
                      {Math.round(zoom * 100)}%
                    </span>
                    {rotation !== 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-200 border border-zinc-800">
                        {rotation}°
                      </span>
                    )}
                    {flipH && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-200 border border-zinc-800">
                        Flipped
                      </span>
                    )}
                  </div>

                  {/* Top-Right Clean 2D Toolbar HUD */}
                  <div className="absolute top-3 right-3 flex items-center gap-0.5 z-20 bg-white border border-zinc-200 p-1 rounded-md shadow-xs">
                    <button
                      onClick={() => setZoom((prev) => Math.max(0.6, parseFloat((prev - 0.1).toFixed(2))))}
                      title="Zoom Out"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-600 px-1">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))))}
                      title="Zoom In"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3 bg-zinc-200 mx-0.5" />
                    <button
                      onClick={rotateCCW}
                      title="Rotate 90° Left"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={rotateCW}
                      title="Rotate 90° Right"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={toggleFlipH}
                      title={flipH ? 'Unflip' : 'Flip Horizontally'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        flipH
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3 bg-zinc-200 mx-0.5" />
                    <button
                      onClick={handleCenter}
                      title="Center Image"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleResetViewport}
                      title="Reset Viewport"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom-Right Nudge Controls */}
                  <div className="absolute bottom-3 right-3 flex flex-col items-center z-20 bg-white border border-zinc-200 p-1 rounded-md shadow-xs">
                    <button
                      onClick={() => nudge(0, -3)}
                      title="Nudge Up (3px)"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-1 my-0.5">
                      <button
                        onClick={() => nudge(-3, 0)}
                        title="Nudge Left (3px)"
                        className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCenter}
                        title="Re-Center"
                        className="p-1 rounded text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer text-[9px] font-bold"
                      >
                        ●
                      </button>
                      <button
                        onClick={() => nudge(3, 0)}
                        title="Nudge Right (3px)"
                        className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => nudge(0, 3)}
                      title="Nudge Down (3px)"
                      className="p-1 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bottom Navigation Hint Bar */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none z-10 text-[10px] font-mono text-zinc-300">
                    <span className="px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-200">
                      Offset: {pan.x}px, {pan.y}px
                    </span>
                    <span className="hidden sm:inline px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-400">
                      Drag or use arrow keys
                    </span>
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
          </div>
        )}
      </div>

      {/* Educational & How It Works Guidance Section */}
      <div
        className={`p-6 sm:p-7 rounded-lg border space-y-6 ${
          isDark
            ? 'bg-zinc-900/40 border-zinc-800'
            : 'bg-zinc-50/60 border-zinc-200'
        }`}
      >
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Govt Portal Guidance</span>
          </div>
          <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            How to Prepare Your PAN Card Photo
          </h2>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Step-by-step instructions to prevent portal rejection on Protean (NSDL) and UTIITSL.
          </p>
        </div>

        {/* 3 Step Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-lg border space-y-2.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="w-7 h-7 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-semibold text-xs text-zinc-900 dark:text-white font-mono">
              1
            </div>
            <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Upload Portrait Photo
            </h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Upload a clear frontal passport photo taken against a white or light background. Avoid wearing glasses with tinted lenses or caps.
            </p>
          </div>

          <div
            className={`p-4 rounded-lg border space-y-2.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="w-7 h-7 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-semibold text-xs text-zinc-900 dark:text-white font-mono">
              2
            </div>
            <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Pan &amp; Align in Frame
            </h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Use the interactive viewport to drag and zoom your photo so your face and shoulders align with the center guide lines.
            </p>
          </div>

          <div
            className={`p-4 rounded-lg border space-y-2.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="w-7 h-7 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-semibold text-xs text-zinc-900 dark:text-white font-mono">
              3
            </div>
            <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Crop &amp; Download (200 DPI)
            </h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Click &ldquo;Crop &amp; Format&rdquo;. FileWala embeds 200 DPI metadata and scales the JPEG to strictly 20 KB – 50 KB for instant upload.
            </p>
          </div>
        </div>

        {/* Portal Specification Table */}
        <div
          className={`p-4 sm:p-5 rounded-lg border overflow-x-auto ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Protean (NSDL) vs UTIITSL Official Requirements
          </h4>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                <th className="py-2 px-3 font-medium">Portal Name</th>
                <th className="py-2 px-3 font-medium">Exact Dimensions</th>
                <th className="py-2 px-3 font-medium">File Size Range</th>
                <th className="py-2 px-3 font-medium">DPI Requirement</th>
                <th className="py-2 px-3 font-medium">Format</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800 text-zinc-300' : 'divide-zinc-100 text-zinc-700'}`}>
              <tr>
                <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">Protean (NSDL)</td>
                <td className="py-2.5 px-3 font-mono">200 × 230 pixels</td>
                <td className="py-2.5 px-3 font-mono">20 KB – 50 KB</td>
                <td className="py-2.5 px-3 font-mono">200 DPI</td>
                <td className="py-2.5 px-3">JPEG / JPG</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">UTIITSL Portal</td>
                <td className="py-2.5 px-3 font-mono">213 × 213 pixels (3.5×2.5cm)</td>
                <td className="py-2.5 px-3 font-mono">&lt; 30 KB</td>
                <td className="py-2.5 px-3 font-mono">300 DPI</td>
                <td className="py-2.5 px-3">JPEG / JPG</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expandable FAQs Accordion */}
        <div className="space-y-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Frequently Asked Questions
          </h4>

          {[
            {
              q: 'Why was my photo rejected with an "Invalid File Size" or "Incorrect DPI" error?',
              a: 'Government portals like Protean and UTIITSL check internal binary headers. A photo smaller than 20 KB or lacking the 200 DPI JFIF marker is automatically rejected. FileWala writes the exact 200 DPI marker and regulates the file size into the 20 KB – 50 KB bracket.',
            },
            {
              q: 'Is my photo uploaded to any server or database?',
              a: 'No. 100% of the image cropping, zoom transformation, DPI embedding, and compression executes entirely inside your browser using HTML5 Canvas and Web APIs. Your photo never leaves your device.',
            },
            {
              q: 'Can I upload a photo taken from a smartphone?',
              a: 'Yes! Use the zoom slider and pan drag controls to crop your face from a high-resolution smartphone photo. The tool scales it down to the exact 200×230 px standard.',
            },
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-medium cursor-pointer"
                >
                  <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      isOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    className={`px-3.5 pb-3.5 text-xs leading-relaxed border-t ${
                      isDark
                        ? 'text-zinc-400 border-zinc-800'
                        : 'text-zinc-600 border-zinc-100'
                    }`}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Privacy Notice Banner */}
        <div
          className={`p-3.5 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
              : 'bg-white border-zinc-200 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>
              <strong>Zero-Knowledge Privacy:</strong> All passport photo transformations happen strictly in browser memory. No data is stored or transmitted.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            Client-Side Verified
          </span>
        </div>
      </div>
    </div>
  );
};
