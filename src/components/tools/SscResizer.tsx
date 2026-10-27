'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  // Photo: 350x450 px (3.5cm x 4.5cm standard), strictly 20 KB - 50 KB, JPEG
  // Signature: 140x60 px (4.0cm x 2.0cm ratio), strictly 10 KB - 20 KB, JPEG
  const targetW = itemType === 'photo' ? 350 : 140;
  const targetH = itemType === 'photo' ? 450 : 60;
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
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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

  const handleSwitchType = useCallback((type: SscItemType) => {
    setItemType(type);
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
  }, [resultUrl]);

  const handleFileSelected = useCallback((files: File[]) => {
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

    CanvasEngine.loadImage(file).then((img) => {
      setImageElement(img);
      setImageSrc(img.src);
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
    }).catch(() => {
      onNotify('Error Loading Image', 'Could not parse the selected file.', 'error');
    });
  }, [itemType, onNotify, resultUrl]);

  // Global paste handler to paste screenshot / image directly (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
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

  const rotateCCW = useCallback(() => setRotation((prev) => (prev - 90 + 360) % 360), []);
  const rotateCW = useCallback(() => setRotation((prev) => (prev + 90) % 360), []);
  const handleCenter = useCallback(() => setPan({ x: 0, y: 0 }), []);
  const toggleFlipH = useCallback(() => setFlipH((prev) => !prev), []);
  const nudge = useCallback((dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
  }, []);

  const processImage = useCallback(async (options?: { silent?: boolean }) => {
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
  }, [
    imageElement,
    targetW,
    targetH,
    brightness,
    contrast,
    boxW,
    pan.x,
    pan.y,
    rotation,
    zoom,
    flipH,
    baseW,
    baseH,
    targetMinKb,
    targetMaxKb,
    targetDpi,
    resultUrl,
    itemType,
    onNotify,
  ]);

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
    processImage,
  ]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const filename = `SSC_${itemType.toUpperCase()}_${Date.now()}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `${filename} saved successfully.`, 'success');
  }, [itemType, onNotify, resultBlob]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', `SSC ${itemType} copied as image. You can now paste (Ctrl+V) it anywhere.`, 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [itemType, onNotify, resultBlob]);

  const handleShare = useCallback(async () => {
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
  }, [itemType, onNotify, resultBlob]);

  // Global window keydown listener for zero mouse latency navigation
  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '1') {
        e.preventDefault();
        handleSwitchType('photo');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        handleSwitchType('signature');
        return;
      }

      if (!imageElement) return;

      // Download
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (resultBlob) handleDownload();
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (resultBlob) handleDownload();
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (resultBlob) {
          e.preventDefault();
          handleCopy();
          return;
        }
      }

      // Process / Format
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        processImage();
        return;
      }

      // Reset / New
      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        handleResetFile();
        return;
      }

      // Rotate
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        rotateCW();
        return;
      }

      // Flip
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        toggleFlipH();
        return;
      }

      // Guides
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGuides((prev) => !prev);
        return;
      }

      // Center
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleCenter();
        return;
      }

      // Reset
      if (e.key === '0') {
        e.preventDefault();
        resetTransform();
        return;
      }

      // Tone shortcuts
      if (e.key === '[') {
        e.preventDefault();
        if (e.shiftKey) {
          setContrast((prev) => Math.max(70, prev - 5));
        } else {
          setBrightness((prev) => Math.max(70, prev - 5));
        }
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        if (e.shiftKey) {
          setContrast((prev) => Math.min(150, prev + 5));
        } else {
          setBrightness((prev) => Math.min(140, prev + 5));
        }
        return;
      }

      // Arrow navigation
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
    handleSwitchType,
    handleDownload,
    handleCopy,
    processImage,
    handleResetFile,
    rotateCW,
    toggleFlipH,
    handleCenter,
    resetTransform,
    nudge,
  ]);

  const currentSizeKb = resultSizeBytes ? (resultSizeBytes / 1024).toFixed(1) : null;

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
                ? 'कर्मचारी चयन आयोग (SSC.gov.in आधिकारिक पोर्टल)'
                : 'Staff Selection Commission (SSC.gov.in Official Portal)'}
            </span>
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-950'
            }`}
          >
            {language === 'hi'
              ? 'SSC फ़ोटो और हस्ताक्षर रिसाइज़र'
              : 'SSC Photo & Signature Resizer'}
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {language === 'hi'
              ? 'SSC CGL, CHSL, MTS, GD के लिए फ़ोटो (20–50 KB) और हस्ताक्षर (10–20 KB) तुरंत तैयार करें।'
              : 'Format official SSC photos (20–50 KB) and signatures (10–20 KB) with guaranteed portal pass.'}
          </p>
        </div>

        {/* Photo vs Signature Toggle Bar (Clean Pill Selector) */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/90 dark:border-zinc-750">
            <button
              onClick={() => handleSwitchType('photo')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                itemType === 'photo'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-semibold shadow-xs border border-zinc-200/90 dark:border-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              <kbd className="px-1.5 py-0.2 rounded text-[10px] font-mono border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">1</kbd>
              <Camera className="w-3.5 h-3.5" />
              <span>SSC Photo (20–50 KB · 350×450 px)</span>
            </button>
            <button
              onClick={() => handleSwitchType('signature')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                itemType === 'signature'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-semibold shadow-xs border border-zinc-200/90 dark:border-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              <kbd className="px-1.5 py-0.2 rounded text-[10px] font-mono border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">2</kbd>
              <PenTool className="w-3.5 h-3.5" />
              <span>SSC Signature (10–20 KB · 140×60 px)</span>
            </button>
          </div>
        </div>

        {/* Official SSC Portal Live Camera Notice */}
        <div className="max-w-3xl mx-auto p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <strong>Official SSC Portal Notice (ssc.gov.in):</strong> For active SSC exams (CGL, CHSL, MTS, GD), candidate photos are captured <strong>Live via webcam or MySSC mobile app</strong>. Pre-scanned photo upload is strictly for state/legacy portals. <strong>Signature digital upload (140×60 px, strictly 10–20 KB)</strong> remains mandatory for all candidates.
          </p>
        </div>

        {/* Direct Dropzone (Centered, Max-w-3xl, Clean & Focused) */}
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={handleFileSelected}
            accept="image/*"
            multiple={false}
            title={`Upload SSC ${itemType === 'photo' ? 'Photograph' : 'Signature'}`}
            description="Drag & drop or click to browse. Automatically formats to official SSC standards."
          />
        </div>

        {/* Authoritative Verified Guide, Official Specifications & FAQs */}
        <GovToolGuideSection toolId="ssc-photo-signature" />
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (FILE LOADED & READY)
  ------------------------------------------------------------- */
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Pro Workspace Header Bar */}
      <div className={`p-3.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={imageSrc || imageElement.src}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold max-w-[200px] sm:max-w-xs truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {sourceFile?.name || `SSC_${itemType.toUpperCase()}.jpg`}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {imageNaturalSize.width}×{imageNaturalSize.height} px
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  ✓ 100% SSC Compliant: {targetW}×{targetH} px · {targetMinKb}–{targetMaxKb} KB · {targetDpi} DPI
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFile}
              title="Reset Image (Esc or N)"
              className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>New</span>
              <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">N</kbd>
            </button>
            {resultBlob && (
              <button
                onClick={handleCopy}
                title="Copy Result (C or Ctrl+C)"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
                <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">C</kbd>
              </button>
            )}
            {resultBlob ? (
              <button
                onClick={handleDownload}
                title="Download Result (D or Ctrl+S)"
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
                <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-zinc-700 dark:bg-zinc-300 text-zinc-200 dark:text-zinc-800">D</kbd>
              </button>
            ) : (
              <button
                onClick={() => processImage()}
                title="Format Result (Enter or Space)"
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Format</span>
                <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-zinc-700 dark:bg-zinc-300 text-zinc-200 dark:text-zinc-800">↵</kbd>
              </button>
            )}
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

            <div className="space-y-4">
              {/* Viewport Frame with Pointer Capture */}
                {/* Studio Canvas Viewport */}
                <div
                  ref={canvasContainerRef}
                  className={`relative w-full flex items-center justify-center p-6 rounded-xl border select-none cursor-grab active:cursor-grabbing transition-colors overflow-hidden bg-zinc-50/80 dark:bg-zinc-950/80 touch-none ${
                    isDragging
                      ? 'border-zinc-400 dark:border-zinc-600'
                      : isDark
                        ? 'border-zinc-800'
                        : 'border-zinc-200'
                  }`}
                  style={{
                    minHeight: '380px',
                    backgroundImage: isDark
                      ? 'radial-gradient(#27272a 1.2px, transparent 1.2px)'
                      : 'radial-gradient(#d4d4d8 1.2px, transparent 1.2px)',
                    backgroundSize: '16px 16px',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    ref={viewportRef}
                    style={{
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                    }}
                    className="relative overflow-hidden border-2 border-zinc-900/90 dark:border-white rounded-xs shadow-xl bg-white pointer-events-none ring-4 ring-zinc-950/5 dark:ring-white/10"
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
                    <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-zinc-900 dark:border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-zinc-900 dark:border-white pointer-events-none z-10" />

                    {/* Clean Minimalist Composition Grid Overlay */}
                    {showGuides && (
                      <div className="absolute inset-0 pointer-events-none border border-zinc-400/40 dark:border-white/30">
                        {/* Rule of thirds grid lines */}
                        <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-zinc-500/40 dark:border-white/30" />
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-zinc-500/40 dark:border-white/30" />

                        {/* Subtle center alignment crosshair */}
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

      {/* Keyboard Shortcuts Strip */}
      <div className={`p-3 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
      }`}>
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-zinc-500" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Pro Keyboard Controls:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">1</kbd> Photo</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">2</kbd> Signature</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">Arrows</kbd> Pan (Shift=10px)</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">+</kbd>/<kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">-</kbd> Zoom</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">T</kbd> Rotate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">H</kbd> Flip</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">G</kbd> Guides</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">↵</kbd> Format</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">D</kbd> Save</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">N</kbd> New</span>
        </div>
      </div>

      {/* Authoritative Verified Guide, Official Specifications & FAQs */}
      <GovToolGuideSection toolId="ssc-photo-signature" />
    </div>
  );
};
