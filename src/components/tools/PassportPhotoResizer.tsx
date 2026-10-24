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

interface PassportPhotoResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PassportPhotoResizer: React.FC<PassportPhotoResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  // Target specifications: 350x450 px (3.5 cm x 4.5 cm ratio), 20 KB - 300 KB, 300 DPI
  const targetW = 350;
  const targetH = 450;
  const targetMinKb = 20;
  const targetMaxKb = 300;
  const targetDpi = 300;

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

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [verifiedDpi, setVerifiedDpi] = useState<number | null>(null);
  const [resultSizeBytes, setResultSizeBytes] = useState<number>(0);

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (resultUrl) revokeSafeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleFileSelected = (files: File[]) => {
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
  };

  // Mouse & Touch Pan Handling
  const handleCenter = () => setPan({ x: 0, y: 0 });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPan((p) => ({ ...p, x: p.x - step }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPan((p) => ({ ...p, x: p.x + step }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPan((p) => ({ ...p, y: p.y - step }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPan((p) => ({ ...p, y: p.y + step }));
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoom((prev) => Math.min(4, parseFloat((prev + 0.05).toFixed(2))));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.05).toFixed(2))));
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
      resetTransform();
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

  const nudge = (dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const toggleFlipH = () => setFlipH((prev) => !prev);

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

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageElement) return;
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(4, Math.max(0.5, prev + delta)));
  };

  const rotateCCW = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const rotateCW = () => setRotation((prev) => (prev + 90) % 360);
  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
  };

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

  const handleDownload = () => {
    if (!resultBlob) return;
    const filename = `Passport_Seva_Photo_35x45mm_${Date.now()}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `${filename} saved successfully.`, 'success');
  };

  const handleCopyPhoto = async () => {
    if (!resultBlob) return;
    const res = await copyImageToClipboard(resultBlob, { width: targetW, height: targetH });
    if (res.success) {
      onNotify('Copied to Clipboard', 'Passport photo copied as PNG!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser', 'error');
    }
  };

  const handleSharePhoto = async () => {
    if (!resultBlob) return;
    const filename = `Passport_Seva_Photo_35x45mm_${Date.now()}.jpg`;
    await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Passport Seva Photo',
      text: `Passport Photo (35x45mm / ${targetW}×${targetH}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
  };

  const currentSizeKb = resultSizeBytes ? (resultSizeBytes / 1024).toFixed(1) : null;
  const isSizeCompliant =
    resultSizeBytes > 0 &&
    resultSizeBytes >= targetMinKb * 1024 &&
    resultSizeBytes <= targetMaxKb * 1024;

  const faqs = [
    {
      q: 'What are the official Passport Seva photo specifications?',
      a: 'Ministry of External Affairs (MEA) Passport Seva requires a 35 mm × 45 mm color photograph (350×450 px), white/off-white background, frontal view with 70%–80% head coverage, between 20 KB and 300 KB in JPEG format at 300 DPI.',
    },
    {
      q: 'Why does the Passport portal reject my uploaded photo?',
      a: 'Rejections usually happen due to dark/colored backgrounds, incorrect aspect ratio, red-eye, or file sizes exceeding 300 KB. This tool guarantees exact 350×450 px dimensions, white background padding, and 300 DPI JFIF metadata headers.',
    },
    {
      q: 'Are spectacles allowed in Indian passport photos?',
      a: 'Plain tinted lenses or glare-reflecting spectacles are strictly not allowed. Clear prescription glasses are acceptable only if eyes are visible with zero glare.',
    },
  ];

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
    <div className="space-y-6">
      {/* 3-Step Compliance Progress Bar */}
      <ComplianceProgressBar
        currentStep={currentStep}
        toolName="Passport Seva Photo (35×45 mm)"
        step1Label="Upload Photo"
        step2Label="Biometric Framing & Alignment"
        step3Label="Download 300 DPI"
        step1Desc="Select passport portrait"
        step2Desc="Fit 350×450 px frame"
        step3Desc="20–300 KB & 300 DPI JPEG"
        onReset={handleResetFile}
        onReAdjust={handleReAdjust}
      />

      {/* Header Banner */}
      <div
        className={`p-5 rounded-lg border ${
          isDark
            ? 'bg-zinc-900/50 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border text-[11px] font-mono font-medium border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 mb-2">
              <FileBadge className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {language === 'hi'
                  ? 'विदेश मंत्रालय (MEA) पासपोर्ट सेवा पोर्टल मानक'
                  : 'Ministry of External Affairs (MEA) Passport Seva Portal'}
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {language === 'hi'
                ? 'पासपोर्ट सेवा फ़ोटो रिसाइज़र (35×45 mm)'
                : 'Passport Seva Photo Resizer'}
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {language === 'hi'
                ? 'सटीक 35 mm × 45 mm (350×450 px) पासपोर्ट फ़ोटो रिसाइज़र। 300 DPI हेडर और 20 KB से 300 KB साइज़ 100% क्लाइंट-साइड सुरक्षा के साथ तैयार करता है।'
                : 'Precision 35 mm × 45 mm (350×450 px) passport photo resizer. Automatically embeds 300 DPI headers and compresses between 20 KB to 300 KB with 100% client-side privacy.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
              350 × 450 px
            </span>
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
              20–300 KB
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border border-zinc-900 dark:border-white">
              300 DPI
            </span>
          </div>
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
                  {targetW} × {targetH} px · 35×45 mm
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

            {!imageElement ? (
              <Dropzone
                onFilesSelected={handleFileSelected}
                accept="image/*"
                multiple={false}
                title="Upload Passport Photo"
                description="Select or drag & drop portrait photo (JPEG, PNG, WebP)"
              />
            ) : (
              <div className="space-y-4">
                {/* Studio Canvas Viewport */}
                <div
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  className={`relative overflow-hidden rounded-md border flex items-center justify-center select-none bg-zinc-100 dark:bg-zinc-950 cursor-grab active:cursor-grabbing focus:outline-hidden focus:ring-1 focus:ring-zinc-400 transition-colors ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200'
                  }`}
                  style={{ height: '440px' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Fixed Aspect Ratio Crop Box with Clean Scrim */}
                  <div
                    ref={viewportRef}
                    className="relative overflow-hidden shadow-[0_0_0_9999px_rgba(24,24,27,0.60)] border-2 border-white rounded-xs pointer-events-none transition-all"
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
                    <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-white pointer-events-none z-10" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-white pointer-events-none z-10" />

                    {/* Minimalist Composition Grid Overlay */}
                    {showGuides && (
                      <div className="absolute inset-0 pointer-events-none border border-white/40">
                        {/* Rule of thirds grid lines */}
                        <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-white/40" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-white/40" />
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-white/40" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-white/40" />

                        {/* Subtle center crosshair */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top-Left Live Metadata Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-xs">
                      <Maximize2 className="w-3 h-3 text-zinc-500" />
                      {targetW} × {targetH} px
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 shadow-xs">
                      {Math.round(zoom * 100)}%
                    </span>
                    {rotation !== 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 shadow-xs">
                        {rotation}°
                      </span>
                    )}
                    {flipH && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 shadow-xs">
                        Flipped
                      </span>
                    )}
                  </div>

                  {/* Top-Right Floating Quick Controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-20 bg-white dark:bg-zinc-900 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <button
                      onClick={() => setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
                      title="Zoom Out"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 px-1">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))))}
                      title="Zoom In"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                    <button
                      onClick={rotateCCW}
                      title="Rotate 90° Left"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={rotateCW}
                      title="Rotate 90° Right"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={toggleFlipH}
                      title={flipH ? 'Unflip' : 'Flip Horizontally'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        flipH
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                    <button
                      onClick={handleCenter}
                      title="Center Photo"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={resetTransform}
                      title="Reset Viewport"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom-Right Precision D-Pad Nudge Controls */}
                  <div className="absolute bottom-3 right-3 flex flex-col items-center z-20 bg-white dark:bg-zinc-900 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <button
                      onClick={() => nudge(0, -3)}
                      title="Nudge Up (3px)"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-1 my-0.5">
                      <button
                        onClick={() => nudge(-3, 0)}
                        title="Nudge Left (3px)"
                        className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCenter}
                        title="Re-Center"
                        className="p-1 rounded text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-[9px] font-bold"
                      >
                        ●
                      </button>
                      <button
                        onClick={() => nudge(3, 0)}
                        title="Nudge Right (3px)"
                        className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => nudge(0, 3)}
                      title="Nudge Down (3px)"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bottom Navigation Hint Bar */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none z-10 text-[10px] font-mono text-zinc-400">
                    <span className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 shadow-xs">
                      Offset: {pan.x}px, {pan.y}px
                    </span>
                    <span className="hidden sm:inline px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-500 shadow-xs">
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
            )}
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

      {/* Step-by-Step Guidance */}
      <div
        className={`p-5 sm:p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900/40 border-zinc-800'
            : 'bg-zinc-50/60 border-zinc-200'
        }`}
      >
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-900'}`}>
          <FileCheck2 className="w-4 h-4 text-zinc-500" />
          Passport Seva Photo Upload Instructions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center text-xs font-mono font-semibold mb-2">
              1
            </div>
            <h4 className={`text-xs font-semibold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Clear White Background</h4>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Ensure photo has an unbroken white or off-white background with no patterns or shadows.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center text-xs font-mono font-semibold mb-2">
              2
            </div>
            <h4 className={`text-xs font-semibold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Align Biometric Frame</h4>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Align head within the frame so facial features cover 70% to 80% of the photograph.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center text-xs font-mono font-semibold mb-2">
              3
            </div>
            <h4 className={`text-xs font-semibold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>300 DPI Guaranteed</h4>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              The tool automatically injects strict 300 DPI JFIF headers required by Passport Seva Kendra (PSK).
            </p>
          </div>
        </div>
      </div>

      {/* Accordion FAQ Section */}
      <div
        className={`p-5 sm:p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900/40 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-900'}`}>
          <HelpCircle className="w-4 h-4 text-zinc-500" />
          Frequently Asked Questions (Passport Photo)
        </h3>
        <div className="space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`rounded-lg border transition-colors ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className={`w-full p-3.5 text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                    isDark ? 'text-zinc-200 hover:text-white' : 'text-zinc-800 hover:text-zinc-950'
                  }`}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isOpen ? 'rotate-180 text-zinc-900 dark:text-white' : 'text-zinc-400'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className={`p-3.5 pt-0 text-xs leading-relaxed border-t ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-600 border-zinc-100'}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
