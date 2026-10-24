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
    name: 'UTIITSL Portal Standard',
    portal: 'UTIITSL Government Portal',
    width: 400,
    height: 200,
    minKb: 8,
    maxKb: 30,
    dpi: 200,
    aspectRatio: 400 / 200, // 2:1
    description: '400 × 200 px · Strictly < 30 KB · 200 DPI JPEG',
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
  const BOX_MAX_W = 380;
  const BOX_MAX_H = 180;
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
  const handleFileSelected = (files: File[]) => {
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
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setPaperWhitening(120);
        setInkDarkness(150);
        onNotify('Signature Loaded', `${file.name} ready for isolation.`, 'info');
      };
      img.onerror = () => {
        onNotify('Error Loading Image', 'Could not parse the signature image file.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      onNotify('Error Reading File', 'Could not read signature file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleResetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setPaperWhitening(120);
    setInkDarkness(150);
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

  // Keyboard micro-nudge for pixel-level alignment
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    }
  };

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(4, Math.max(0.6, parseFloat((prev + zoomDelta).toFixed(2)))));
  };

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

  const handleDownload = () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-signature';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}-${targetDpi}dpi.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  };

  const handleCopySignature = async () => {
    if (!resultBlob) return;
    const res = await copyImageToClipboard(resultBlob, { width: targetWidth, height: targetHeight });
    if (res.success) {
      onNotify('Copied to Clipboard', 'Compliant signature copied as PNG!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser', 'error');
    }
  };

  const handleShareSignature = async () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : 'pan-signature';
    const filename = `${cleanName}-${targetWidth}x${targetHeight}.jpg`;
    await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'PAN Signature',
      text: `PAN Signature (${targetWidth}×${targetHeight}px, ${formatBytes(resultSizeBytes)}) via FileWala`,
    });
  };

  const isCompliant =
    resultBlob &&
    resultSizeBytes <= targetMaxKb * 1024 &&
    resultSizeBytes >= targetMinKb * 1024;

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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div
          className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded border text-[11px] font-mono font-medium ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
              : 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }`}
        >
          <PenTool className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            {language === 'hi'
              ? 'प्रोटियन (NSDL) और UTIITSL हस्ताक्षर विनिर्देश'
              : 'Protean (NSDL) & UTIITSL Signature Specifications'}
          </span>
        </div>

        <h1
          className={`text-2xl sm:text-3xl font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        >
          {language === 'hi'
            ? 'PAN कार्ड हस्ताक्षर रिसाइज़र & DPI फॉर्मेटर'
            : 'PAN Signature Resizer & DPI Formatter'}
        </h1>

        <p
          className={`text-xs sm:text-sm leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          {language === 'hi' ? (
            <>
              हस्ताक्षर को अलग करें, बैकग्राउंड सफेद करें और पैन व ज़ूम के साथ क्रॉप करें। सख्त{' '}
              <strong className={isDark ? 'text-white' : 'text-zinc-900'}>
                354 × 157 px
              </strong>
              , <strong className={isDark ? 'text-white' : 'text-zinc-900'}>50 KB से कम</strong>, और{' '}
              <strong className={isDark ? 'text-white' : 'text-zinc-900'}>200 DPI</strong> हेडर तुरंत बनाएं।
            </>
          ) : (
            <>
              Isolate, whiten, and crop your physical signature with smooth pan &amp; zoom. Generates strict{' '}
              <strong className={isDark ? 'text-white' : 'text-zinc-900'}>
                354 × 157 px
              </strong>
              , <strong className={isDark ? 'text-white' : 'text-zinc-900'}>Under 50 KB</strong>, and embeds{' '}
              <strong className={isDark ? 'text-white' : 'text-zinc-900'}>200 DPI</strong> headers for guaranteed portal acceptance.
            </>
          )}
        </p>
      </div>

      {/* 3-Step Compliance Progress Bar */}
      <ComplianceProgressBar
        currentStep={currentStep}
        toolName="PAN Signature Compliance (354×157)"
        step1Label="Upload Signature"
        step2Label="Isolate & Whiten Background"
        step3Label="Download 200 DPI"
        step1Desc="Select signature photo"
        step2Desc="Remove shadow & fit box"
        step3Desc="Strictly < 50 KB & 200 DPI"
        onReset={handleResetFile}
        onReAdjust={handleReAdjust}
      />

      {/* Preset Selector Bar */}
      <div className="flex justify-center">
        <div
          className={`inline-flex flex-wrap p-1 rounded-md text-xs gap-1 border max-w-full ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-zinc-100 border-zinc-200'
          }`}
        >
          {(Object.keys(SIGNATURE_PRESETS) as SignaturePortalPreset[]).map((key) => {
            const preset = SIGNATURE_PRESETS[key];
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
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-zinc-800 text-white'
                      : 'bg-white text-zinc-950 border border-zinc-200 shadow-xs'
                    : isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
                }`}
              >
                <span>{preset.name}</span>
                <span
                  className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                    isSelected
                      ? isDark
                        ? 'bg-zinc-900 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      : isDark
                        ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        : 'bg-white text-zinc-500 border-zinc-200'
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
      <div
        className={`p-5 sm:p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900/50 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        {!imageElement ? (
          <div className="space-y-6">
            <Dropzone
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onFilesSelected={handleFileSelected}
              title="Drag & drop signature photo or scan here"
              description="Converts to compliant 354×157 px (4.5×2.0 cm), strictly under 50 KB, 200 DPI JPEG."
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
                <p className="text-xs text-slate-400">Strict landscape ratio</p>
              </div>

              <div className="space-y-1 sm:border-x border-slate-800/40">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  File Size Cap
                </span>
                <p className="text-base font-bold text-indigo-400">
                  Strictly &lt; {targetMaxKb} KB
                </p>
                <p className="text-xs text-slate-400">Protean &amp; UTI standard</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  DPI Header
                </span>
                <p className="text-base font-bold text-blue-400">
                  {targetDpi} DPI Embedded
                </p>
                <p className="text-xs text-slate-400">High-resolution print clarity</p>
              </div>
            </div>

            {/* Portal Ink Rule Notice */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                isDark
                  ? 'bg-blue-500/5 border-blue-500/20 text-blue-300'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 text-blue-400" />
              <span>
                <strong>Portal Recommendation:</strong> Sign with a black or dark-blue ballpoint pen on plain white paper. Ensure no shadows or lined paper grids appear inside the crop frame.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Toolbar */}
            <div
              className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-4 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-semibold truncate max-w-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {sourceFile?.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
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
                  onClick={() => handleProcessSignature()}
                  disabled={isProcessing}
                  leftIcon={
                    isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )
                  }
                >
                  {isProcessing ? 'Processing...' : 'Crop & Format (200 DPI)'}
                </Button>
              </div>
            </div>

            {/* Viewport & Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Crop Viewport */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-zinc-500" />
                    <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Interactive Signature Viewport
                    </span>
                    <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                      {targetWidth} × {targetHeight} px
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowGuides((prev) => !prev)}
                      title={showGuides ? 'Hide alignment guides' : 'Show alignment guides'}
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
                      onClick={handleResetViewport}
                      title="Reset all"
                      className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                        isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                          : 'bg-white text-zinc-600 hover:text-zinc-950 border-zinc-200'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Crop Frame Viewport */}
                <div
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  className={`relative overflow-hidden rounded-md border flex items-center justify-center select-none bg-zinc-100 dark:bg-zinc-950 cursor-grab active:cursor-grabbing focus:outline-hidden focus:ring-1 focus:ring-zinc-400 transition-colors ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200'
                  }`}
                  style={{ height: '380px' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Fixed Aspect Ratio Frame with Clean Matte Scrim */}
                  <div
                    ref={viewportRef}
                    className="relative overflow-hidden shadow-[0_0_0_9999px_rgba(24,24,27,0.60)] border-2 border-white rounded-xs pointer-events-none transition-all"
                    style={{
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                    }}
                  >
                    {/* Viewport Image Rendering */}
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

                    {/* Corner L-Brackets */}
                    <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-white pointer-events-none z-10" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-white pointer-events-none z-10" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-white pointer-events-none z-10" />

                    {/* Signature Alignment Guides */}
                    {showGuides && (
                      <div className="absolute inset-0 pointer-events-none border border-white/40">
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white/40" />
                        <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-white/40" />
                        <div className="absolute bottom-1 inset-x-0 text-center">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-zinc-300">
                            Center Signature Inside Frame
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top-Left Live Metadata Pill Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-xs">
                      <Maximize2 className="w-3 h-3 text-zinc-500" />
                      {targetWidth} × {targetHeight} px
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

                  {/* Top-Right Floating Quick HUD Controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-20 bg-white dark:bg-zinc-900 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <button
                      onClick={() => setZoom((prev) => Math.max(0.6, parseFloat((prev - 0.1).toFixed(2))))}
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
                      title="Center Signature"
                      className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleResetViewport}
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

                  {/* Bottom Navigation Hint & Offset Bar */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none z-10 text-[10px] font-mono text-zinc-400">
                    <span className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 shadow-xs">
                      Offset: X {pan.x >= 0 ? `+${pan.x}` : pan.x}px · Y {pan.y >= 0 ? `+${pan.y}` : pan.y}px
                    </span>
                    <span className="hidden sm:inline px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-500 shadow-xs">
                      Drag to pan · Scroll/pinch to zoom
                    </span>
                  </div>
                </div>

                {/* Transform Sliders & Paper Whitening Controls */}
                <div
                  className={`p-4 rounded-lg border space-y-4 ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'
                  }`}
                >
                  {/* Zoom Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <ZoomIn className="w-3.5 h-3.5 text-zinc-500" />
                        Scale / Zoom (Crop out shadows)
                      </span>
                      <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ZoomOut
                        className="w-4 h-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.1))}
                      />
                      <input
                        type="range"
                        min="0.6"
                        max="4"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <ZoomIn
                        className="w-4 h-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        onClick={() => setZoom((prev) => Math.min(4, prev + 0.1))}
                      />
                    </div>
                  </div>

                  {/* Paper Whitening & Contrast Boost Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          <Sun className="w-3.5 h-3.5 text-zinc-500" />
                          Paper Whitening
                        </span>
                        <span className="font-mono text-zinc-500 text-[11px]">{paperWhitening}%</span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="160"
                        step="2"
                        value={paperWhitening}
                        onChange={(e) => setPaperWhitening(parseInt(e.target.value))}
                        className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          <Contrast className="w-3.5 h-3.5 text-zinc-500" />
                          Ink Contrast
                        </span>
                        <span className="font-mono text-zinc-500 text-[11px]">{inkDarkness}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="220"
                        step="5"
                        value={inkDarkness}
                        onChange={(e) => setInkDarkness(parseInt(e.target.value))}
                        className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Rotation & Auto-wash Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                        leftIcon={<RotateCcw className="w-3 h-3" />}
                      >
                        -90°
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        leftIcon={<RotateCw className="w-3 h-3" />}
                      >
                        +90°
                      </Button>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoCleanPaper}
                        onChange={(e) => setAutoCleanPaper(e.target.checked)}
                        className="rounded accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                        Pure White Background Threshold Wash
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Result & Compliance Checklist */}
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
                      <FileCheck2 className="w-4 h-4 text-zinc-500" />
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
                  <div className={`flex flex-col items-center justify-center p-4 rounded-md border border-dashed min-h-[200px] ${
                    isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'
                  }`}>
                    {resultUrl ? (
                      <div className="text-center space-y-3 w-full">
                        <div className="inline-block p-2 bg-white rounded border border-zinc-200 dark:border-zinc-800 max-w-full">
                          <img
                            src={resultUrl}
                            alt="Government Compliant Signature"
                            className="block mx-auto rounded-xs"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '140px',
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                              {targetWidth} × {targetHeight} px
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium">
                              {verifiedDpi || targetDpi} DPI
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
                          <PenTool className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Live Validation Ready
                          </p>
                          <p className={`text-[11px] max-w-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            Adjust signature position in viewport; validated output updates in real-time.
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
                          <CheckCircle2 className={`w-3.5 h-3.5 ${resultBlob && isCompliant ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />
                          File Size: Under {targetMaxKb} KB
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
                        ? `Download Compliant Signature (${formatBytes(resultSizeBytes)})`
                        : 'Generate to Download'}
                    </Button>

                    {resultBlob && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCopySignature}
                          className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Copy Signature</span>
                        </button>
                        {isShareSupported() && (
                          <button
                            type="button"
                            onClick={handleShareSignature}
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
            <span>Govt Signature Guidance</span>
          </div>
          <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            How to Format Your PAN Card Signature
          </h2>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Ensure your signature upload is approved on Protean (NSDL) and UTIITSL without manual rejection.
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
              Sign on Blank White Paper
            </h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Use a black or dark-blue pen on unruled white paper. Avoid textured surfaces, shadows, or notebook margins.
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
              Isolate &amp; Whiten Background
            </h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Zoom and drag to frame the signature tightly. Use Paper Whitening and Contrast sliders to clear any shadows.
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
              Export Under 50 KB (200 DPI)
            </h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Click &ldquo;Crop &amp; Format&rdquo;. FileWala embeds 200 DPI metadata and compresses the JPEG strictly below 50 KB.
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
            Protean (NSDL) vs UTIITSL Signature Specifications
          </h4>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                <th className="py-2 px-3 font-medium">Portal Name</th>
                <th className="py-2 px-3 font-medium">Exact Dimensions</th>
                <th className="py-2 px-3 font-medium">Max File Size</th>
                <th className="py-2 px-3 font-medium">DPI Requirement</th>
                <th className="py-2 px-3 font-medium">Format</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800 text-zinc-300' : 'divide-zinc-100 text-zinc-700'}`}>
              <tr>
                <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">Protean (NSDL)</td>
                <td className="py-2.5 px-3 font-mono">354 × 157 pixels (4.5×2.0cm)</td>
                <td className="py-2.5 px-3 font-mono">&lt; 50 KB (10–50 KB)</td>
                <td className="py-2.5 px-3 font-mono">200 DPI</td>
                <td className="py-2.5 px-3">JPEG / JPG</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">UTIITSL Portal</td>
                <td className="py-2.5 px-3 font-mono">400 × 200 pixels (or 2:1)</td>
                <td className="py-2.5 px-3 font-mono">&lt; 30 KB</td>
                <td className="py-2.5 px-3 font-mono">200 DPI</td>
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
              q: 'Can I use a signature cropped from a mobile camera photo?',
              a: 'Absolutely. Use the zoom slider to enlarge your signature, position it inside the crop box, and increase the Paper Whitening slider to eliminate background grayness or table shadows.',
            },
            {
              q: 'What pen color is accepted by government portals?',
              a: 'Protean (NSDL) and UTIITSL accept black or dark-blue ink signatures. Red, green, or pencil markings will be rejected by verification officers.',
            },
            {
              q: 'Why does government portal upload error on "Signature DPI"?',
              a: 'Government scanners look for a 200 DPI JFIF APP0 header inside the JPEG binary. FileWala embeds this exact header so the portal verification script validates it automatically.',
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
              <strong>Zero-Knowledge Privacy:</strong> Signatures are personal biometric records. All processing happens 100% in your local browser memory; no files are ever sent to any remote server.
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
