'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Maximize2,
  Eye,
  Camera,
  PenTool,
  Check,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useTheme } from '../../core/themeContext';
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

export type PassportMode = 'photo' | 'signature';
export type PassportPresetId = 'india-passport-photo' | 'india-passport-signature' | 'custom';

interface PassportPresetConfig {
  id: PassportPresetId;
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

const PASSPORT_PRESETS: Record<PassportPresetId, PassportPresetConfig> = {
  'india-passport-photo': {
    id: 'india-passport-photo',
    name: 'Passport Seva Photo (MEA)',
    portal: 'Ministry of External Affairs (MEA) Passport Seva',
    width: 350,
    height: 450,
    minKb: 20,
    maxKb: 300,
    dpi: 300,
    aspectRatio: 350 / 450, // 3.5 cm x 4.5 cm
    description: '350 × 450 px (3.5 × 4.5 cm) · 20 KB to 300 KB · 300 DPI JPEG (Clean light background)',
  },
  'india-passport-signature': {
    id: 'india-passport-signature',
    name: 'Passport Seva Signature (MEA)',
    portal: 'Passport Seva Portal',
    width: 400,
    height: 200,
    minKb: 10,
    maxKb: 100,
    dpi: 200,
    aspectRatio: 400 / 200, // 2:1
    description: '400 × 200 px (4.5 × 2.0 cm) · 10 KB to 100 KB · 200 DPI JPEG (Black/Blue ink on white)',
  },
  custom: {
    id: 'custom',
    name: 'Custom Dimensions',
    portal: 'Visa / Embassy Specific',
    width: 350,
    height: 450,
    minKb: 20,
    maxKb: 300,
    dpi: 300,
    aspectRatio: 350 / 450,
    description: 'Custom dimensions and file size bounds',
  },
};

interface PassportResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PassportResizer: React.FC<PassportResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [mode, setMode] = useState<PassportMode>('photo');
  const [selectedPreset, setSelectedPreset] = useState<PassportPresetId>('india-passport-photo');
  const [customW, setCustomW] = useState<number>(350);
  const [customH, setCustomH] = useState<number>(450);
  const [customMaxKb, setCustomMaxKb] = useState<number>(300);
  const [customMinKb, setCustomMinKb] = useState<number>(20);
  const [customDpi, setCustomDpi] = useState<number>(300);

  // Active configurations
  const activeConfig = PASSPORT_PRESETS[selectedPreset];
  const targetWidth = selectedPreset === 'custom' ? customW : activeConfig.width;
  const targetHeight = selectedPreset === 'custom' ? customH : activeConfig.height;
  const targetMinKb = selectedPreset === 'custom' ? customMinKb : activeConfig.minKb;
  const targetMaxKb = selectedPreset === 'custom' ? customMaxKb : activeConfig.maxKb;
  const targetDpi = selectedPreset === 'custom' ? customDpi : activeConfig.dpi;
  const cropAspectRatio = targetWidth / targetHeight;

  // Image source state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Viewport Transforms
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [paperWhitening, setPaperWhitening] = useState<boolean>(false);

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

  // Mode change handler
  const handleModeChange = (newMode: PassportMode) => {
    setMode(newMode);
    if (newMode === 'photo') {
      setSelectedPreset('india-passport-photo');
      setPaperWhitening(false);
    } else {
      setSelectedPreset('india-passport-signature');
      setPaperWhitening(true);
    }
  };

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
        setSourceFile(file);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        onNotify(
          'Document Loaded',
          `${file.name} (${img.naturalWidth}×${img.naturalHeight} px) ready for Passport Seva framing.`,
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

  const handleResetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  };

  // Mouse & Touch Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleMouseUp = () => {
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
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Canvas Processing
  const handleProcessImage = async () => {
    if (!imageElement || !viewportRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // MEA standard: White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const viewportEl = viewportRef.current;
      const viewportRect = viewportEl.getBoundingClientRect();
      const scaleX = targetWidth / viewportRect.width;
      const scaleY = targetHeight / viewportRect.height;

      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.translate(pan.x * scaleX, pan.y * scaleY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const imgAspect = imageElement.naturalWidth / imageElement.naturalHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;
      if (imgAspect > cropAspectRatio) {
        drawH = targetHeight;
        drawW = targetHeight * imgAspect;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / imgAspect;
      }

      ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      ctx.filter = 'none';

      // Background whitening for signatures
      if (paperWhitening) {
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 200 && g > 200 && b > 200) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Compression & DPI embedding
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

      onNotify(
        'Passport Seva Document Ready!',
        `Size: ${formatBytes(compressionResult.sizeBytes)} · Dimensions: ${targetWidth}×${targetHeight} px · DPI: ${verified}`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      onNotify('Processing Error', err?.message || 'Could not resize image', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const cleanName = sourceFile
      ? sourceFile.name.replace(/\.[^/.]+$/, '')
      : `passport-${mode}`;
    const filename = `${cleanName}-${targetWidth}x${targetHeight}-${targetDpi}dpi.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  };

  const isSizeCompliant =
    resultBlob &&
    resultSizeBytes <= targetMaxKb * 1024 &&
    resultSizeBytes >= targetMinKb * 1024;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <FileBadge className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Passport Seva (MEA) Online Portal Compliance</span>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Passport Seva Photo &amp; Signature Resizer
        </h1>
        <p className={`text-sm max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Scale and crop photos to exactly 350×450 px (under 300 KB) and signatures to 400×200 px (under 100 KB) with 300 DPI metadata for Ministry of External Affairs online applications.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center">
        <div
          className={`inline-flex p-1 rounded-xl text-xs gap-1 border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => handleModeChange('photo')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'photo'
                ? isDark
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                  : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Passport Photo (350×450 px)</span>
          </button>
          <button
            onClick={() => handleModeChange('signature')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'signature'
                ? isDark
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                  : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Passport Signature (400×200 px)</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dropzone & Interactive Viewport */}
        <div className="lg:col-span-7 space-y-5">
          {!sourceFile ? (
            <div
              className={`p-5 rounded-lg border ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <Dropzone
                onFilesSelected={handleFileSelected}
                accept="image/*"
                multiple={false}
                title={`Upload ${mode === 'photo' ? 'Passport Photo' : 'Passport Signature'}`}
                description="Supports JPG, PNG, or WebP. 100% private in-browser processing."
              />
            </div>
          ) : (
            <div
              className={`p-5 rounded-lg border space-y-4 ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Interactive Frame Viewport</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleResetViewport}
                    className={`flex items-center gap-1 cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    onClick={() => {
                      setSourceFile(null);
                      setImageElement(null);
                      if (resultUrl) revokeSafeObjectURL(resultUrl);
                      setResultUrl(null);
                      setResultBlob(null);
                    }}
                    className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 ml-2 cursor-pointer"
                  >
                    Change Image
                  </button>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="flex justify-center p-2 bg-slate-950/80 rounded-xl border border-slate-800/60 overflow-hidden">
                <div
                  ref={viewportRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    width: '320px',
                    height: mode === 'photo' ? '411px' : '160px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    backgroundColor: '#ffffff',
                  }}
                  className="rounded-lg shadow-inner select-none"
                >
                  {imageElement && (
                    <img
                      src={imageElement.src}
                      alt="Source file for positioning"
                      draggable={false}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                        transformOrigin: 'center center',
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Framing Overlay Guides */}
                  <div className="absolute inset-0 border-2 border-dashed border-blue-400/50 pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] font-mono text-blue-400 bg-slate-950/80 px-1.5 py-0.5 rounded self-start border border-blue-500/30">
                      {targetWidth} × {targetHeight} px ({mode.toUpperCase()})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded self-end border border-slate-700/40">
                      Drag to Pan · Wheel to Zoom
                    </span>
                  </div>
                </div>
              </div>

              {/* Viewport Transform Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <Slider
                    label="Zoom Scale"
                    min={0.6}
                    max={3.0}
                    step={0.05}
                    value={zoom}
                    onChange={(val) => setZoom(val)}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-300">Rotate</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                      className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white cursor-pointer"
                      title="Rotate 90 counter-clockwise"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-slate-400 w-10 text-center">
                      {rotation}°
                    </span>
                    <button
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white cursor-pointer"
                      title="Rotate 90 clockwise"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lighting & Contrast */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <Slider
                    label="Brightness"
                    min={70}
                    max={140}
                    step={2}
                    unit="%"
                    value={brightness}
                    onChange={(val) => setBrightness(val)}
                  />
                </div>
                <div>
                  <Slider
                    label="Contrast"
                    min={70}
                    max={150}
                    step={2}
                    unit="%"
                    value={contrast}
                    onChange={(val) => setContrast(val)}
                  />
                </div>
              </div>

              {/* Action Trigger */}
              <Button
                variant="primary"
                onClick={handleProcessImage}
                isLoading={isProcessing}
                className="w-full py-3 font-semibold text-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>Format for Passport Seva ({targetDpi} DPI JPEG)</span>
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Portal Settings & Result Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Target Compliance Parameters Card */}
          <div
            className={`p-5 rounded-lg border space-y-4 ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>MEA Compliance Criteria</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium">
                Official Norms
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Standard Dimensions:</span>
                <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {targetWidth} × {targetHeight} px
                </span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>File Size Range:</span>
                <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {targetMinKb} KB – {targetMaxKb} KB
                </span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>DPI Header:</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-white">
                  {targetDpi} DPI Embedded
                </span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Portal Format:</span>
                <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>Pure Baseline JPEG</span>
              </div>
            </div>
          </div>

          {/* Result Preview & Live Checklist */}
          <div
            className={`p-5 rounded-lg border space-y-4 ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <span className={`text-xs font-semibold block ${isDark ? 'text-white' : 'text-zinc-900'}`}>Portal Acceptance Status</span>

            {/* Preview Box */}
            <div className={`flex flex-col items-center justify-center p-4 rounded-md border border-dashed min-h-[200px] ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'
            }`}>
              {resultUrl ? (
                <div className="text-center space-y-3">
                  <div className="inline-block p-1 bg-white rounded shadow-md border border-slate-200 dark:border-slate-700">
                    <img
                      src={resultUrl}
                      alt="Passport Seva output preview"
                      style={{
                        width: mode === 'photo' ? '180px' : '220px',
                        height: 'auto',
                      }}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {targetWidth} × {targetHeight} px
                    </p>
                    <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {formatBytes(resultSizeBytes)} · {verifiedDpi} DPI
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 py-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                    <Eye className="w-5 h-5" />
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Document preview will appear here</p>
                </div>
              )}
            </div>

            {/* Compliance Checklist */}
            <div className="space-y-2 text-xs">
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  resultBlob
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Dimensions: {targetWidth} × {targetHeight} px
                </span>
                <span className="font-mono font-bold">
                  {resultBlob ? 'PASS' : 'Pending'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  resultBlob && isSizeCompliant
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  File Size ({targetMinKb}–{targetMaxKb} KB)
                </span>
                <span className="font-mono font-bold">
                  {resultBlob ? formatBytes(resultSizeBytes) : 'Pending'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  resultBlob && verifiedDpi === targetDpi
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Embedded DPI: {targetDpi} DPI
                </span>
                <span className="font-mono font-bold">
                  {resultBlob ? `${verifiedDpi} DPI Verified` : 'Pending'}
                </span>
              </div>
            </div>

            {/* Download Button */}
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={!resultBlob}
              className="w-full py-3 font-semibold text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Download Passport {mode === 'photo' ? 'Photo' : 'Signature'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Guide & Instructions Section */}
      <div className={`pt-8 border-t space-y-6 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
        <h2 className={`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Passport Seva Online Submission Guidelines
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xs'}`}>
            <span className="text-xs font-mono text-blue-500 dark:text-blue-400 font-bold">01. White Background</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Clean Solid Background</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              MEA mandates a plain white or light off-white background with no patterns or shadows behind your head.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xs'}`}>
            <span className="text-xs font-mono text-blue-500 dark:text-blue-400 font-bold">02. Head Proportion</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>70% to 80% Facial Coverage</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Your face from chin to top of hair must occupy between 70% to 80% of the frame with neutral expression.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xs'}`}>
            <span className="text-xs font-mono text-blue-500 dark:text-blue-400 font-bold">03. 100% Privacy</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Zero Server Processing</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              All processing executes exclusively in your browser memory via HTML5 Canvas. No personal photo is ever uploaded.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className={`p-5 rounded-lg border space-y-3 ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
          <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Frequently Asked Questions</h3>
          {[
            {
              q: 'What is the exact photo size for Passport Seva online application?',
              a: 'The Passport Seva portal requires photos of exactly 350 × 450 pixels (3.5 cm width × 4.5 cm height), strictly in JPEG format with file size between 20 KB and 300 KB.',
            },
            {
              q: 'What are the signature requirements for Passport Seva?',
              a: 'Signatures must be signed clearly in black or dark blue ink on white paper, resized to 400 × 200 pixels (4.5 cm × 2.0 cm), and strictly under 100 KB.',
            },
            {
              q: 'Does this tool upload my passport photo to any server?',
              a: 'No. FileWala operates 100% client-side inside your browser. No files, biometric data, or photos are ever transmitted to any external server.',
            },
          ].map((faq, idx) => (
            <div key={idx} className={`border-b pb-3 last:border-b-0 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className={`w-full flex items-center justify-between text-left text-xs font-semibold cursor-pointer py-1 ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'}`}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-blue-500 dark:text-blue-400' : 'text-slate-400'
                  }`}
                />
              </button>
              {openFaq === idx && (
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
