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
  Sparkles,
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  ChevronDown,
  Info,
  Sliders,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FlipHorizontal,
  Eye,
  EyeOff,
  Maximize2,
  Move,
  RefreshCw,
  Copy,
  Share2,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useTheme } from '../../core/themeContext';
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

interface PassportSignatureResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PassportSignatureResizer: React.FC<PassportSignatureResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Passport Seva Signature specifications: 400x200 px (4cm x 2cm ratio), 10 KB - 100 KB, 300 DPI
  const targetW = 400;
  const targetH = 200;
  const targetMinKb = 10;
  const targetMaxKb = 100;
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
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(105);
  const [contrast, setContrast] = useState<number>(120);
  const [whitenBgThreshold, setWhitenBgThreshold] = useState<number>(210);

  // Viewport Box Dimensions (Strictly proportional to targetW / targetH)
  const cropAspectRatio = targetW / targetH;
  const BOX_MAX_W = 380;
  const BOX_MAX_H = 190;
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
      onNotify('Invalid File', 'Please select a valid image of your physical signature.', 'error');
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
        setBrightness(105);
        setContrast(120);
        onNotify('Signature Loaded', `${file.name} ready for Passport Seva formatting.`, 'info');
      };
      img.onerror = () => {
        onNotify('Error Loading Image', 'Could not load the signature file.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      onNotify('Error Reading File', 'Could not read signature file.', 'error');
    };
    reader.readAsDataURL(file);
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
      x: Math.round(dragStartRef.current.initialPanX + dx),
      y: Math.round(dragStartRef.current.initialPanY + dy),
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
  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setBrightness(105);
    setContrast(120);
    setWhitenBgThreshold(210);
  };

  // Render Clean Signature Canvas (100% Exact Parity)
  const processSignature = useCallback(
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

        // Base pure white fill
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

        // Clean background pixel whitening
        if (whitenBgThreshold < 255) {
          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If light grey / shadow paper background, snap to pure white
            if (r > whitenBgThreshold && g > whitenBgThreshold && b > whitenBgThreshold) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
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
            'Passport Signature Ready',
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
      whitenBgThreshold,
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
      processSignature({ silent: true });
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
    whitenBgThreshold,
    targetW,
    targetH,
    targetDpi,
    targetMinKb,
    targetMaxKb,
  ]);

  const handleDownload = () => {
    if (!resultBlob) return;
    const filename = `Passport_Seva_Signature_${Date.now()}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `${filename} saved successfully.`, 'success');
  };

  const handleCopySignature = async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Passport signature copied as image. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShareSignature = async () => {
    if (!resultBlob) return;
    const filename = `Passport_Seva_Signature_${Date.now()}.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Passport Seva Signature',
      text: 'Passport signature formatted with FileWala Govt Resizer.',
    });
    if (shared) {
      onNotify('Shared', 'Signature shared successfully.', 'success');
    }
  };

  const currentSizeKb = resultSizeBytes ? (resultSizeBytes / 1024).toFixed(1) : null;

  const faqs = [
    {
      q: 'What ink color is acceptable for Passport Seva signatures?',
      a: 'The Ministry of External Affairs mandates black or dark-blue ballpoint/gel ink on an unruled, pure white sheet of paper. Signatures with faint pencil, sketchy markers, or colored pens will be rejected.',
    },
    {
      q: 'How does the background whitening feature work?',
      a: 'Physical paper scans usually have grey cast or ambient shadow. The tool uses pixel threshold analysis directly inside your browser to convert shaded grey background paper into pure 255,255,255 white while keeping ink strokes sharp.',
    },
    {
      q: 'What is the required file size for Passport Seva signatures?',
      a: 'Signatures must be in JPEG/JPG format, under 100 KB (strictly between 10 KB and 100 KB), formatted with a 300 DPI resolution header.',
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
        toolName="Passport Seva Signature (400×200)"
        step1Label="Upload Signature"
        step2Label="Isolate & Whiten Background"
        step3Label="Download 300 DPI"
        step1Desc="Select signature image"
        step2Desc="Remove shadow & frame"
        step3Desc="Under 100 KB & 300 DPI JPEG"
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
              <PenTool className="w-3.5 h-3.5 text-zinc-500" />
              <span>Ministry of External Affairs (MEA) Passport Seva Portal</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Passport Seva Signature Resizer
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Clean, whiten, and resize official passport signatures to strict 4.0×2.0 cm proportions. Embeds 300 DPI metadata and compresses under 100 KB with pure white background.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
              400 × 200 px
            </span>
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
              &lt; 100 KB
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
              <span className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <PenTool className="w-3.5 h-3.5 text-zinc-500" />
                Interactive Signature Alignment
              </span>
              {imageElement && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={rotateCCW}
                    title="Rotate 90° CCW"
                    className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={rotateCW}
                    title="Rotate 90° CW"
                    className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={resetTransform}
                    title="Reset Alignment"
                    className="px-2 py-1 text-xs font-medium rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
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
                title="Upload Physical Signature Scan"
                description="Upload photo or scan of your signature on clean white paper (JPEG, PNG)"
              />
            ) : (
              <div className="space-y-4">
                {/* Viewport Frame */}
                <div
                  className="relative w-full flex items-center justify-center p-4 rounded-md bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden select-none"
                  onWheel={handleWheel}
                >
                  <div
                    ref={viewportRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    className="relative overflow-hidden border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded bg-white shadow-xs"
                  >
                    <div
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                      className="w-full h-full flex items-center justify-center pointer-events-none"
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

                    <div className="absolute bottom-1 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-zinc-200 pointer-events-none">
                      400 × 200 px (4×2 cm)
                    </div>
                  </div>
                </div>

                {/* Viewport & Contrast Controls */}
                <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
                    <Slider
                      value={zoom}
                      min={0.5}
                      max={3}
                      step={0.05}
                      onChange={setZoom}
                      label="Zoom Signature"
                    />
                    <ZoomIn className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <Slider
                      value={contrast}
                      min={100}
                      max={200}
                      step={2}
                      onChange={setContrast}
                      label="Ink Contrast"
                      unit="%"
                    />
                    <Slider
                      value={whitenBgThreshold}
                      min={150}
                      max={255}
                      step={5}
                      onChange={setWhitenBgThreshold}
                      label="Background Clean"
                      helperText="Auto-Whitens paper"
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
                    Change Signature
                  </button>
                  <Button
                    onClick={() => processSignature()}
                    isLoading={isProcessing}
                    variant="primary"
                    size="sm"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Format Passport Signature
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
                MEA Signature Verification
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Verified
              </span>
            </div>

            <div className={`space-y-2 p-3 rounded border text-xs ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Aspect Ratio
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>400 × 200 px (4×2 cm)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Size Constraint
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Under 100 KB (10–100 KB)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Resolution Header
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>300 DPI Embedded</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  Background Purity
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Pure White (#FFFFFF)</span>
              </div>
            </div>

            {resultUrl ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-md border text-center flex flex-col items-center ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50/60 border-zinc-200'}`}>
                  <div className="w-[240px] h-[120px] rounded border border-zinc-200 dark:border-zinc-800 bg-white flex items-center justify-center p-2">
                    <img
                      src={resultUrl}
                      alt="Formatted Signature"
                      className="max-w-full max-h-full object-contain"
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

                <Button
                  onClick={handleDownload}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Passport Signature
                </Button>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCopySignature}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShareSignature}
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
                <PenTool className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                Upload physical signature photo to auto-whiten and format for Passport Seva upload.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div
        className={`p-5 sm:p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900/40 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
          <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          Passport Seva Signature Rules
        </h3>
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'}`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className={`w-full p-3.5 text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                    isDark ? 'text-slate-200 hover:text-white' : 'text-slate-800 hover:text-slate-950'
                  }`}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isOpen ? 'rotate-180 text-blue-500 dark:text-blue-400' : 'text-slate-400'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className={`p-3.5 pt-0 text-xs border-t ${isDark ? 'text-slate-400 border-slate-800/40' : 'text-slate-600 border-slate-200'}`}>
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
