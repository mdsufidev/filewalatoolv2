'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Award,
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
  Calendar,
  Check,
  Camera,
  FlipHorizontal,
  Move,
  RefreshCw,
  Maximize2,
  Copy,
  Share2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
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

interface UpscPhotoMakerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const UpscPhotoMaker: React.FC<UpscPhotoMakerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  // UPSC Standard: 350x350 px, 20 KB to 300 KB, 200 DPI
  const targetW = 350;
  const targetH = 350;
  const targetMinKb = 20;
  const targetMaxKb = 300;
  const targetDpi = 200;

  // Name & Date of Photo (DOP) Stamp State
  const [candidateName, setCandidateName] = useState<string>('CANDIDATE NAME');
  const [photoDate, setPhotoDate] = useState<string>(
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  const [includeDateStamp, setIncludeDateStamp] = useState<boolean>(true);
  const [bannerStyle, setBannerStyle] = useState<'white-bg' | 'dark-bg'>('white-bg');

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
  const BOX_MAX_W = 280;
  const BOX_MAX_H = 280;
  let boxW = BOX_MAX_W;
  let boxH = Math.round(boxW / cropAspectRatio);
  if (boxH > BOX_MAX_H) {
    boxH = BOX_MAX_H;
    boxW = Math.round(boxH * cropAspectRatio);
  }

  // Base rendered photo size in viewport (Cover mode so square frame is filled)
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
        onNotify('Photo Loaded', `${file.name} ready for UPSC Name & Date stamp.`, 'info');
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

  // Render UPSC Photo with Canvas Name & Date Stamp
  const processPhoto = async (options?: { silent?: boolean }) => {
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

      // Base pure white background
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

      // Reset filter for crisp text overlay
      ctx.filter = 'none';

      // Dynamic Name & Date Banner Overlay
      if (includeDateStamp) {
        const bannerH = 58; // Bottom banner height in px
        const bannerY = targetH - bannerH;

        if (bannerStyle === 'white-bg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, bannerY, targetW, bannerH);
          ctx.fillStyle = '#0F172A';
        } else {
          ctx.fillStyle = '#090D16';
          ctx.fillRect(0, bannerY, targetW, bannerH);
          ctx.fillStyle = '#FFFFFF';
        }

        // Top border line for banner
        ctx.fillStyle = bannerStyle === 'white-bg' ? '#CBD5E1' : '#334155';
        ctx.fillRect(0, bannerY, targetW, 1);

        // Candidate Name with dynamic auto-scaling to prevent border clipping on long names
        const nameText = (candidateName || 'CANDIDATE NAME').toUpperCase();
        let nameFontSize = 15;
        ctx.font = `bold ${nameFontSize}px sans-serif`;
        while (ctx.measureText(nameText).width > targetW - 20 && nameFontSize > 9) {
          nameFontSize -= 1;
          ctx.font = `bold ${nameFontSize}px sans-serif`;
        }
        ctx.fillStyle = bannerStyle === 'white-bg' ? '#0F172A' : '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nameText, targetW / 2, bannerY + 18, targetW - 16);

        // Date of Photograph (DOP)
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = bannerStyle === 'white-bg' ? '#334155' : '#E2E8F0';
        ctx.fillText(`DOP: ${photoDate}`, targetW / 2, bannerY + 39, targetW - 16);
      }

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
          'UPSC Photo Generated',
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
  };

  // Real-time synchronization of interactive viewport crop with Live Portal Validation
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
    candidateName,
    photoDate,
    includeDateStamp,
    bannerStyle,
  ]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const sanitizedName = (candidateName || 'UPSC_Photo')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase();
    const filename = `${sanitizedName}_DOP_${Date.now()}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `${filename} saved successfully.`, 'success');
  }, [resultBlob, candidateName, onNotify]);

  const handleCopyPhoto = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'UPSC photo copied as image. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [resultBlob, onNotify]);

  const handleSharePhoto = useCallback(async () => {
    if (!resultBlob) return;
    const sanitizedName = (candidateName || 'UPSC_Photo')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase();
    const filename = `${sanitizedName}_DOP_${Date.now()}.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'UPSC Photo',
      text: 'UPSC photo created with FileWala Govt Resizer.',
    });
    if (shared) {
      onNotify('Shared', 'Photo shared successfully.', 'success');
    }
  }, [resultBlob, candidateName, onNotify]);

  const currentSizeKb = resultSizeBytes ? (resultSizeBytes / 1024).toFixed(1) : null;

  const faqs = [
    {
      q: 'Is the Name and Date of Photograph (DOP) mandatory for UPSC?',
      a: 'Yes. Per the latest UPSC Civil Services (CSE, CDS, NDA, CDS) guidelines, the photograph uploaded during One Time Registration (OTR) and form submission must clearly display the candidate’s name and the date on which the photograph was taken.',
    },
    {
      q: 'How recent should the UPSC photograph date be?',
      a: 'The photograph should not be more than 10 days old from the date of online application submission, with candidate name in block capital letters and date clearly visible on a clean bottom bar.',
    },
    {
      q: 'What are the required pixel dimensions and file size bounds?',
      a: 'UPSC requires the photograph to be 350×350 px (or between 350 to 1000 px square), file size between 20 KB to 300 KB in JPEG format with a clear 200–300 DPI resolution header.',
    },
  ];

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
      // Don't intercept when user is typing in form inputs (Candidate Name, Date, etc.)
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
                ? 'संघ लोक सेवा आयोग (UPSC OTR एवं सिविल सेवा पोर्टल)'
                : 'Union Public Service Commission (OTR & CSE Portal)'}
            </span>
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-950'
            }`}
          >
            {language === 'hi'
              ? 'UPSC फ़ोटो मेकर (नाम और तारीख़ स्टैम्प)'
              : 'UPSC Photo Maker with Name & Date Stamp'}
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {language === 'hi'
              ? 'उम्मीदवार का नाम और फ़ोटो की तारीख़ (DOP) प्रिंट करके 350×350 px व 20–300 KB UPSC फ़ोटो बनाएं।'
              : 'Add candidate Name & Date of Photo (DOP) on official 350×350 px, 20–300 KB UPSC OTR photos.'}
          </p>
        </div>

        {/* Official UPSC 10-Day Rule Notice */}
        <div className="max-w-3xl mx-auto p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <strong>Official UPSC 10-Day Rule (upsconline.nic.in):</strong> The photograph must not be older than <strong>10 days</strong> from the commencement date of the online application process. Candidate’s full name and exact Date of Photograph (DOP) are automatically formatted on the bottom banner.
          </p>
        </div>

        {/* Direct Dropzone (Centered, Max-w-3xl, Clean & Focused) */}
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={handleFileSelected}
            accept="image/*"
            multiple={false}
            title="Upload Photo for UPSC OTR"
            description="Drag & drop or click to browse. Automatically formats to UPSC OTR standards."
          />
        </div>

        {/* Authoritative Verified Guide, Official Specifications & FAQs */}
        <GovToolGuideSection toolId="upsc-photo-maker" />
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
        className={`p-3.5 sm:p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
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
                {candidateName ? `${candidateName}.jpg` : sourceFile?.name}
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
                ? `✓ 100% UPSC Compliant: ${currentSizeKb} KB · 200 DPI · Name + DOP`
                : `${targetW}×${targetH} px · ${targetMinKb}–${targetMaxKb} KB · 200 DPI`}
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
                  ? 'Generating...'
                  : resultBlob
                    ? `Download (${currentSizeKb} KB)`
                    : 'Generate UPSC Photo'}
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
            {/* Stamp Configuration Inputs */}
            <div className="mb-4 p-3.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Candidate Name & Date Stamp Controls
                </span>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDateStamp}
                    onChange={(e) => setIncludeDateStamp(e.target.checked)}
                    className="rounded accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                  />
                  <span>Enable Banner Stamp</span>
                </label>
              </div>

              {includeDateStamp && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Candidate Full Name (in CAPS)
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value.toUpperCase())}
                      placeholder="e.g. RAHUL KUMAR"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Date of Photograph (DOP)
                    </label>
                    <input
                      type="text"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <Camera className="w-3.5 h-3.5 text-zinc-500" />
                Interactive Portrait Alignment
              </span>
              {imageElement && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={rotateCCW}
                    title="Rotate 90° CCW"
                    className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={rotateCW}
                    title="Rotate 90° CW"
                    className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={resetTransform}
                    title="Reset Alignment"
                    className="px-2 py-1 text-xs font-medium rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Viewport Frame */}
                <div
                  ref={canvasContainerRef}
                  tabIndex={0}
                  className={`relative w-full flex items-center justify-center p-4 rounded-xl border select-none cursor-grab active:cursor-grabbing focus:outline-none transition-colors overflow-hidden bg-zinc-50/80 dark:bg-zinc-950/80 ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200'
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
                        alt="UPSC Preview"
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

                    {/* Live Bottom Banner Visual Indicator in Viewport */}
                    {includeDateStamp && (
                      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-zinc-200 py-1 px-2 text-center pointer-events-none z-10">
                        <div className="text-[10px] font-bold text-zinc-900 truncate">
                          {(candidateName || 'CANDIDATE NAME').toUpperCase()}
                        </div>
                        <div className="text-[9px] font-medium text-zinc-600 font-mono">
                          DOP: {photoDate}
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

                {/* Viewport Sliders */}
                <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
                    <Slider
                      value={zoom}
                      min={0.5}
                      max={3}
                      step={0.05}
                      onChange={setZoom}
                      label="Zoom Level"
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
                      max={130}
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
                    Generate UPSC Photo
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
                UPSC OTR Compliance
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

            <div className={`space-y-2 p-3 rounded border text-xs ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Dimensions
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>350 × 350 px (1:1 Ratio)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  File Size Range
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>20 KB to 300 KB</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Banner Stamp
                </span>
                <span className="font-mono font-medium text-zinc-900 dark:text-white">Name + DOP Embedded</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Resolution
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>200 DPI JFIF Header</span>
              </div>
            </div>

            {resultUrl ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-md border text-center flex flex-col items-center ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50/60 border-zinc-200'}`}>
                  <div className="w-[180px] h-[180px] rounded border border-zinc-200 dark:border-zinc-800 bg-white overflow-hidden">
                    <img
                      src={resultUrl}
                      alt="Formatted UPSC"
                      className="w-full h-full object-cover"
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-white" /> Ready for OTR
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleDownload}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download UPSC Photo
                </Button>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCopyPhoto}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleSharePhoto}
                      className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`p-8 text-center rounded-md border border-dashed text-xs ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
                <Award className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                Input Candidate Name &amp; Photo Date, then click Generate to produce your UPSC verified photo.
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
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">↵ Enter</kbd> Generate
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
      <GovToolGuideSection toolId="upsc-photo-maker" />
    </div>
  );
};
