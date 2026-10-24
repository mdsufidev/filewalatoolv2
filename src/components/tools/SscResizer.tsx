'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
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
  Check,
  Camera,
  PenTool,
  FlipHorizontal,
  Move,
  RefreshCw,
  Maximize2,
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

export type SscItemType = 'photo' | 'signature';

interface SscResizerProps {
  initialType?: SscItemType;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SscResizer: React.FC<SscResizerProps> = ({
  initialType = 'photo',
  onNotify,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  const [itemType, setItemType] = useState<SscItemType>(initialType);

  // SSC Portal Specs:
  // Photo: 100x120 px (or 3.5cm x 4.5cm equivalent ~ 140x175), strictly 20 KB - 50 KB, JPEG
  // Signature: 140x60 px (4.0cm x 2.0cm ratio), strictly 10 KB - 20 KB, JPEG
  const targetW = itemType === 'photo' ? 100 : 140;
  const targetH = itemType === 'photo' ? 120 : 60;
  const targetMinKb = itemType === 'photo' ? 20 : 10;
  const targetMaxKb = itemType === 'photo' ? 50 : 20;
  const targetDpi = 200;

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
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);

  // Viewport Box Dimensions (Strictly proportional to targetW / targetH)
  const cropAspectRatio = targetW / targetH;
  const BOX_MAX_W = itemType === 'photo' ? 240 : 350;
  const BOX_MAX_H = itemType === 'photo' ? 300 : 160;
  let boxW = BOX_MAX_W;
  let boxH = Math.round(boxW / cropAspectRatio);
  if (boxH > BOX_MAX_H) {
    boxH = BOX_MAX_H;
    boxW = Math.round(boxH * cropAspectRatio);
  }

  // Base rendered image size in viewport:
  // Photo -> cover mode (fill frame)
  // Signature -> contain mode (fit frame)
  let baseW = boxW;
  let baseH = boxH;
  if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
    const imgAspect = imageNaturalSize.width / imageNaturalSize.height;
    if (itemType === 'photo') {
      if (imgAspect > cropAspectRatio) {
        baseH = boxH;
        baseW = Math.round(boxH * imgAspect);
      } else {
        baseW = boxW;
        baseH = Math.round(boxW / imgAspect);
      }
    } else {
      if (imgAspect > cropAspectRatio) {
        baseW = Math.round(boxW * 0.95);
        baseH = Math.round(baseW / imgAspect);
      } else {
        baseH = Math.round(boxH * 0.95);
        baseW = Math.round(baseH * imgAspect);
      }
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

  const handleSwitchType = (type: SscItemType) => {
    setItemType(type);
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
  };

  const handleFileSelected = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Invalid File', 'Please select a valid JPEG, PNG, or WebP image.', 'error');
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
        onNotify(
          'Image Loaded',
          `${file.name} ready for SSC ${itemType === 'photo' ? 'Photo' : 'Signature'} formatting.`,
          'info'
        );
      };
      img.onerror = () => {
        onNotify('Error Loading Image', 'Could not parse the selected file.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      onNotify('Error Reading File', 'Could not read image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageElement) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageElement) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageElement || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !imageElement) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageElement) return;
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(4, Math.max(0.5, prev + delta)));
  };

  const rotateCCW = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const rotateCW = () => setRotation((prev) => (prev + 90) % 360);
  const handleCenter = () => setPan({ x: 0, y: 0 });
  const toggleFlipH = () => setFlipH((prev) => !prev);
  const nudge = (dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        setContrast((prev) => Math.min(150, prev + 5));
      } else {
        setBrightness((prev) => Math.min(140, prev + 5));
      }
    }
  };

  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
  };

  const processImage = async (options?: { silent?: boolean }) => {
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

      // Base white fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

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
          `SSC ${itemType === 'photo' ? 'Photo' : 'Signature'} Ready`,
          `Formatted to ${targetW}×${targetH} px · ${formatBytes(compressionResult.sizeBytes)}.`,
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
  };

  // Real-time synchronization of interactive viewport crop with Live Portal Validation
  useEffect(() => {
    if (!imageElement) return;
    const timer = setTimeout(() => {
      processImage({ silent: true });
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
    itemType,
    targetW,
    targetH,
    targetMinKb,
    targetMaxKb,
  ]);

  const handleDownload = () => {
    if (!resultBlob) return;
    const filename = `SSC_${itemType.toUpperCase()}_${Date.now()}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `${filename} saved successfully.`, 'success');
  };

  const handleCopy = async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', `SSC ${itemType} copied as image. You can now paste (Ctrl+V) it anywhere.`, 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    if (!resultBlob) return;
    const filename = `SSC_${itemType.toUpperCase()}_${Date.now()}.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: `SSC ${itemType.toUpperCase()}`,
      text: `SSC ${itemType} formatted with FileWala Govt Resizer.`,
    });
    if (shared) {
      onNotify('Shared', `${itemType === 'photo' ? 'Photo' : 'Signature'} shared successfully.`, 'success');
    }
  };

  const currentSizeKb = resultSizeBytes ? (resultSizeBytes / 1024).toFixed(1) : null;

  const faqs = [
    {
      q: 'What are the official SSC photo requirements?',
      a: 'The Staff Selection Commission (SSC CGL, CHSL, MTS, GD) requires a recent photograph (between 20 KB to 50 KB, JPEG), dimensions approx 100×120 px, taken without spectacles or caps, with both ears clearly visible on a white/light background.',
    },
    {
      q: 'What are the official SSC signature requirements?',
      a: 'SSC signature must be strictly between 10 KB to 20 KB in JPEG format, dimensions approx 140×60 px (4.0 cm × 2.0 cm), signed with black or dark blue ink on clear white paper.',
    },
    {
      q: 'Why does the SSC portal give a "File size out of range" error?',
      a: 'The SSC server strictly checks byte bounds. Photos under 20 KB or above 50 KB, and signatures under 10 KB or above 20 KB are instantly rejected. This tool uses iterative binary search to guarantee file sizes stay strictly inside the allowed boundaries.',
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
        toolName={`SSC ${itemType === 'photo' ? 'Photo' : 'Signature'} (${targetW}×${targetH})`}
        step1Label={`Upload ${itemType === 'photo' ? 'Photo' : 'Signature'}`}
        step2Label="Position & Crop Frame"
        step3Label="Download Strict Byte File"
        step1Desc={itemType === 'photo' ? 'Select candidate photo' : 'Select signature scan'}
        step2Desc={`Fit ${targetW}×${targetH} px ratio`}
        step3Desc={`Strictly ${targetMinKb}–${targetMaxKb} KB JPEG`}
        onReset={handleResetFile}
        onReAdjust={handleReAdjust}
      />

      {/* Header Banner */}
      <div
        className={`p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-white'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>
                {language === 'hi'
                  ? 'कर्मचारी चयन आयोग (SSC.gov.in आधिकारिक पोर्टल)'
                  : 'Staff Selection Commission (SSC.gov.in Official Portal)'}
              </span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2.5 ${isDark ? 'text-zinc-100' : 'text-zinc-950'}`}>
              {language === 'hi'
                ? 'SSC फ़ोटो और हस्ताक्षर रिसाइज़र'
                : 'SSC Photo & Signature Resizer'}
            </h1>
            <p className={`text-sm mt-1 max-w-2xl ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {language === 'hi'
                ? 'SSC CGL, CHSL, MTS, GD, और CPO फॉर्म के लिए सख्त रिसाइज़र। फ़ोटो 20-50 KB और हस्ताक्षर 10-20 KB सीमा का शत-प्रतिशत पालन करता है।'
                : 'Strictly compliant resizer for SSC CGL, CHSL, MTS, GD, and CPO applications. Precision byte-bounds compressor: Photos strictly 20–50 KB, Signatures strictly 10–20 KB.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
              {itemType === 'photo' ? 'Photo: 20–50 KB' : 'Sig: 10–20 KB'}
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-medium border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              SSC Strict Bounds
            </span>
          </div>
        </div>

        {/* Photo vs Signature Toggle Bar */}
        <div className={`mt-5 pt-4 border-t flex items-center gap-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={() => handleSwitchType('photo')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
              itemType === 'photo'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : isDark
                  ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>SSC Photograph (20–50 KB · 100×120 px)</span>
          </button>
          <button
            onClick={() => handleSwitchType('signature')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
              itemType === 'signature'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : isDark
                  ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>SSC Signature (10–20 KB · 140×60 px)</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport Workspace (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`p-6 rounded-lg border ${
              isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                {itemType === 'photo' ? (
                  <Camera className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <PenTool className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                )}
                Interactive SSC {itemType === 'photo' ? 'Photo' : 'Signature'} Viewport
              </span>
              {imageElement && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={rotateCCW}
                    title="Rotate 90° CCW"
                    className="p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={rotateCW}
                    title="Rotate 90° CW"
                    className="p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetTransform}
                    title="Reset Alignment"
                    className="px-2 py-1 text-xs font-medium rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {!imageElement ? (
              <Dropzone
                onFilesSelected={handleFileSelected}
                accept="image/*"
                multiple={false}
                title={`Upload SSC ${itemType === 'photo' ? 'Photograph' : 'Signature'}`}
                description={`Select ${itemType === 'photo' ? 'portrait photo' : 'scanned signature'} (JPEG, PNG)`}
              />
            ) : (
              <div className="space-y-4">
                {/* Viewport Frame with Pointer Capture & Keyboard Shortcut Focus */}
                <div
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  className={`relative w-full flex items-center justify-center p-6 rounded-md bg-zinc-100 dark:bg-zinc-950 border select-none cursor-grab active:cursor-grabbing focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors ${
                    isDragging
                      ? 'border-zinc-400 dark:border-zinc-600'
                      : isDark
                        ? 'border-zinc-800'
                        : 'border-zinc-300'
                  }`}
                  style={{ minHeight: '380px' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  <div
                    ref={viewportRef}
                    style={{
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                    }}
                    className="relative overflow-hidden border-2 border-white rounded-xs shadow-[0_0_0_9999px_rgba(24,24,27,0.60)] bg-white pointer-events-none"
                  >
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
                        alt="SSC Preview"
                        className="max-w-none pointer-events-none select-none"
                        style={{
                          width: `${baseW}px`,
                          height: `${baseH}px`,
                        }}
                        draggable={false}
                      />
                    </div>

                    {/* Studio Viewfinder Corner L-Brackets */}
                    <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-white pointer-events-none z-10" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-white pointer-events-none z-10" />

                    {/* Clean Minimalist Composition Grid Overlay */}
                    {showGuides && (
                      <div className="absolute inset-0 pointer-events-none border border-white/20">
                        {/* Rule of thirds grid lines */}
                        <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-white/30" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-white/30" />
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-white/30" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-white/30" />

                        {/* Subtle center alignment crosshair */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top-Left Live Metadata Pill Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-900/90 text-zinc-200 flex items-center gap-1.5">
                      <Maximize2 className="w-3 h-3 text-zinc-400" />
                      {targetW} × {targetH} px
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-900/90 text-zinc-300">
                      {Math.round(zoom * 100)}%
                    </span>
                    {rotation !== 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-900/90 text-zinc-300">
                        {rotation}°
                      </span>
                    )}
                    {flipH && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-900/90 text-zinc-300">
                        Flipped
                      </span>
                    )}
                  </div>

                  {/* Top-Right Floating Quick Controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-md shadow-xs">
                    <button
                      onClick={() => setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
                      title="Zoom Out"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 px-1">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))))}
                      title="Zoom In"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                    <button
                      onClick={rotateCCW}
                      title="Rotate 90° Left"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={rotateCW}
                      title="Rotate 90° Right"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={toggleFlipH}
                      title={flipH ? 'Unflip' : 'Flip Horizontally'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        flipH
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                    <button
                      onClick={handleCenter}
                      title="Center Image"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={resetTransform}
                      title="Reset Viewport"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom-Right Micro-Nudge D-Pad */}
                  <div className="absolute bottom-3 right-3 flex flex-col items-center z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-md shadow-xs">
                    <button
                      onClick={() => nudge(0, -3)}
                      title="Nudge Up (3px)"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs leading-none"
                    >
                      ▲
                    </button>
                    <div className="flex items-center gap-1 my-0.5">
                      <button
                        onClick={() => nudge(-3, 0)}
                        title="Nudge Left (3px)"
                        className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs leading-none"
                      >
                        ◀
                      </button>
                      <button
                        onClick={handleCenter}
                        title="Re-Center"
                        className="p-1 rounded text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-[9px] font-bold leading-none"
                      >
                        ●
                      </button>
                      <button
                        onClick={() => nudge(3, 0)}
                        title="Nudge Right (3px)"
                        className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs leading-none"
                      >
                        ▶
                      </button>
                    </div>
                    <button
                      onClick={() => nudge(0, 3)}
                      title="Nudge Down (3px)"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Bottom Navigation Hint & Shortcut Keys Reference Bar */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none z-10 text-[10px] font-mono text-zinc-400">
                    <span className="px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-900/90 text-zinc-300">
                      Offset: X {pan.x >= 0 ? `+${pan.x}` : pan.x}px · Y {pan.y >= 0 ? `+${pan.y}` : pan.y}px
                    </span>
                    <span className="hidden sm:inline px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-900/90 text-zinc-400">
                      Keys: Arrows nudge · +/- zoom · R rot · H flip · C center · 0 reset · [ ] tone
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
                    <Slider
                      value={zoom}
                      min={0.5}
                      max={3}
                      step={0.05}
                      onChange={setZoom}
                      label="Zoom Scale"
                    />
                    <ZoomIn className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <Slider
                      value={brightness}
                      min={70}
                      max={130}
                      step={1}
                      onChange={setBrightness}
                      label="Brightness"
                      unit="%"
                    />
                    <Slider
                      value={contrast}
                      min={70}
                      max={150}
                      step={1}
                      onChange={setContrast}
                      label="Contrast"
                      unit="%"
                    />
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
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                  >
                    Change Image
                  </button>
                  <Button
                    onClick={() => processImage()}
                    isLoading={isProcessing}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 px-4 py-2 font-medium rounded-md text-xs"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Format SSC {itemType === 'photo' ? 'Photo' : 'Signature'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Verification & Download Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-6 rounded-lg border ${
              isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                SSC Official Validation
              </span>
              <div className="flex items-center gap-1.5">
                {isLiveSyncing ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Syncing...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live Mirror
                  </span>
                )}
              </div>
            </div>

            <div className={`space-y-2.5 p-3.5 rounded-lg border mb-5 text-xs ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Target Dimensions
                </span>
                <span className={`font-mono font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {targetW} × {targetH} px
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Strict Byte Bound
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                  {targetMinKb} KB to {targetMaxKb} KB
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  DPI Target
                </span>
                <span className={`font-mono font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>200 DPI Header</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Format
                </span>
                <span className={`font-mono font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>JPEG / JPG</span>
              </div>
            </div>

            {resultUrl ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border text-center flex flex-col items-center ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div
                    style={{
                      width: itemType === 'photo' ? '140px' : '220px',
                      height: itemType === 'photo' ? '168px' : '95px',
                    }}
                    className="rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white flex items-center justify-center p-1"
                  >
                    <img
                      src={resultUrl}
                      alt="Formatted SSC"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {currentSizeKb} KB
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                      {verifiedDpi} DPI
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SSC Ready
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleDownload}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs rounded-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download SSC {itemType === 'photo' ? 'Photo' : 'Signature'}
                </Button>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`p-8 text-center rounded-lg border border-dashed text-xs ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-600'}`}>
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                Upload file to produce SSC portal-ready {itemType}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div
        className={`p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <h3 className={`text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-900'}`}>
          <HelpCircle className="w-4 h-4 text-zinc-500" />
          Staff Selection Commission Notice Rules
        </h3>
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`rounded-md border overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/80'}`}
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
                      isOpen ? 'rotate-180 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className={`p-3.5 pt-0 text-xs border-t ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-600 border-zinc-200'}`}>
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
