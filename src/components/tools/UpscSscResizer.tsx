'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  Camera,
  PenTool,
  Calendar,
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

export type ExamCategory = 'upsc' | 'ssc';
export type ExamItemType = 'photo' | 'signature';

interface ExamRuleConfig {
  name: string;
  portal: string;
  width: number;
  height: number;
  minKb: number;
  maxKb: number;
  dpi: number;
  aspectRatio: number;
  needsDateNameBadge: boolean;
  notes: string;
}

const EXAM_RULES: Record<string, ExamRuleConfig> = {
  'upsc-photo': {
    name: 'UPSC Online Photograph',
    portal: 'Union Public Service Commission (OTR Portal)',
    width: 350,
    height: 350, // UPSC 1:1 or 350x350 standard
    minKb: 20,
    maxKb: 300,
    dpi: 300,
    aspectRatio: 1,
    needsDateNameBadge: true,
    notes: 'Candidate name and date of photo taken mandated by UPSC guidelines.',
  },
  'upsc-signature': {
    name: 'UPSC Online Signature',
    portal: 'UPSC Online OTR Portal',
    width: 350,
    height: 150,
    minKb: 20,
    maxKb: 300,
    dpi: 300,
    aspectRatio: 350 / 150,
    needsDateNameBadge: false,
    notes: 'Black ink pen on white paper. No initials only allowed.',
  },
  'ssc-photo': {
    name: 'SSC Official Photograph',
    portal: 'Staff Selection Commission (SSC.gov.in)',
    width: 350,
    height: 450, // 3.5 cm x 4.5 cm
    minKb: 20,
    maxKb: 50,
    dpi: 200,
    aspectRatio: 350 / 450,
    needsDateNameBadge: true,
    notes: 'Strictly 20 KB to 50 KB. White background without spectacles/caps.',
  },
  'ssc-signature': {
    name: 'SSC Official Signature',
    portal: 'Staff Selection Commission (SSC.gov.in)',
    width: 400,
    height: 200, // 4.0 cm x 2.0 cm
    minKb: 10,
    maxKb: 20,
    dpi: 200,
    aspectRatio: 2,
    needsDateNameBadge: false,
    notes: 'Strictly 10 KB to 20 KB JPEG. Clear signature on pure white canvas.',
  },
};

interface UpscSscResizerProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const UpscSscResizer: React.FC<UpscSscResizerProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [exam, setExam] = useState<ExamCategory>('upsc');
  const [itemType, setItemType] = useState<ExamItemType>('photo');

  // Candidate Name & Date Stamp
  const [candidateName, setCandidateName] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [includeDateStamp, setIncludeDateStamp] = useState<boolean>(true);

  // Active exam rules
  const activeKey = `${exam}-${itemType}`;
  const rule = EXAM_RULES[activeKey] || EXAM_RULES['upsc-photo'];

  // Image source state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Viewport transforms
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

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
        setSourceFile(file);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        onNotify(
          'Image Loaded',
          `${file.name} ready for ${exam.toUpperCase()} ${itemType} formatting.`,
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

  // Process and stamp image
  const handleProcessImage = async () => {
    if (!imageElement || !viewportRef.current) return;
    setIsProcessing(true);

    try {
      const targetWidth = rule.width;
      const targetHeight = rule.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Pure white base
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
      const cropAspectRatio = targetWidth / targetHeight;
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

      // Stamp candidate name and date if enabled for photos
      if (itemType === 'photo' && includeDateStamp && (candidateName.trim() || photoDate)) {
        const badgeHeight = Math.round(targetHeight * 0.16); // 16% bottom strip
        const badgeY = targetHeight - badgeHeight;

        // White background strip with clean subtle line
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, badgeY, targetWidth, badgeHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, badgeY, targetWidth, badgeHeight);

        // Black text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (candidateName.trim() && photoDate) {
          ctx.font = `bold ${Math.round(badgeHeight * 0.34)}px sans-serif`;
          ctx.fillText(candidateName.toUpperCase(), targetWidth / 2, badgeY + badgeHeight * 0.35);
          ctx.font = `${Math.round(badgeHeight * 0.28)}px sans-serif`;
          ctx.fillText(`DOP: ${photoDate}`, targetWidth / 2, badgeY + badgeHeight * 0.75);
        } else {
          ctx.font = `bold ${Math.round(badgeHeight * 0.42)}px sans-serif`;
          ctx.fillText(
            candidateName.trim() ? candidateName.toUpperCase() : `DOP: ${photoDate}`,
            targetWidth / 2,
            badgeY + badgeHeight * 0.5
          );
        }
      }

      // Compression & DPI embedding
      const compressionResult = await compressCanvasToPortalSpecs(canvas, {
        minKb: rule.minKb,
        maxKb: rule.maxKb,
        dpi: rule.dpi,
      });

      const dpiInfo = await readJpegDpi(compressionResult.blob);
      const verified = dpiInfo ? dpiInfo.dpiX : rule.dpi;

      if (resultUrl) revokeSafeObjectURL(resultUrl);
      const outUrl = createSafeObjectURL(compressionResult.blob);

      setResultBlob(compressionResult.blob);
      setResultUrl(outUrl);
      setResultSizeBytes(compressionResult.sizeBytes);
      setVerifiedDpi(verified);

      onNotify(
        `${exam.toUpperCase()} Document Ready!`,
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
      : `${exam}-${itemType}`;
    const filename = `${cleanName}-${exam.toUpperCase()}-${rule.width}x${rule.height}.jpg`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  };

  const isSizeCompliant =
    resultBlob &&
    resultSizeBytes <= rule.maxKb * 1024 &&
    resultSizeBytes >= rule.minKb * 1024;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>UPSC Civil Services &amp; SSC Official Portal Compliance</span>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          UPSC &amp; SSC Photo and Signature Resizer
        </h1>
        <p className={`text-sm max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Adhere strictly to UPSC (20–300 KB) and SSC (20–50 KB photo, 10–20 KB signature) guidelines with automatic candidate name and Date of Photo (DOP) stamping.
        </p>
      </div>

      {/* Exam & Type Switchers */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* Exam selector */}
        <div
          className={`inline-flex p-1 rounded-xl text-xs gap-1 border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setExam('upsc')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              exam === 'upsc'
                ? isDark
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                  : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>UPSC Portal</span>
          </button>
          <button
            onClick={() => setExam('ssc')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              exam === 'ssc'
                ? isDark
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                  : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>SSC Portal</span>
          </button>
        </div>

        {/* Item Type selector */}
        <div
          className={`inline-flex p-1 rounded-xl text-xs gap-1 border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setItemType('photo')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              itemType === 'photo'
                ? isDark
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                  : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Photograph</span>
          </button>
          <button
            onClick={() => setItemType('signature')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              itemType === 'signature'
                ? isDark
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                  : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Signature</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
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
                title={`Upload ${exam.toUpperCase()} ${itemType === 'photo' ? 'Photograph' : 'Signature'}`}
                description="Supports JPG, PNG, or WebP. 100% private in-browser client execution."
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
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Interactive Framing Viewport</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleResetViewport}
                    className={`${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} flex items-center gap-1 cursor-pointer`}
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
                    className="text-rose-400 hover:text-rose-300 ml-2 cursor-pointer"
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
                    height: itemType === 'photo' ? (rule.aspectRatio === 1 ? '320px' : '411px') : '160px',
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

                  {/* Stamp live preview overlay */}
                  {itemType === 'photo' && includeDateStamp && (candidateName || photoDate) && (
                    <div className="absolute bottom-0 inset-x-0 bg-white/95 border-t border-slate-800 text-center py-1 select-none pointer-events-none">
                      {candidateName && (
                        <p className="text-[11px] font-bold text-black uppercase tracking-wider">
                          {candidateName}
                        </p>
                      )}
                      {photoDate && (
                        <p className="text-[9px] font-mono font-medium text-black">
                          DOP: {photoDate}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Overlay Guides */}
                  <div className="absolute inset-0 border-2 border-dashed border-amber-400/50 pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] font-mono text-amber-400 bg-slate-950/80 px-1.5 py-0.5 rounded self-start border border-amber-500/30">
                      {rule.width} × {rule.height} px
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded self-end border border-slate-700/40">
                      Drag to Pan · Wheel to Zoom
                    </span>
                  </div>
                </div>
              </div>

              {/* UPSC / SSC Photo Name and Date Stamp Controls */}
              {itemType === 'photo' && (
                <div className={`p-3.5 rounded-xl border space-y-3 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <input
                        type="checkbox"
                        checked={includeDateStamp}
                        onChange={(e) => setIncludeDateStamp(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Add Name &amp; Date of Photo (DOP) Stamp</span>
                    </label>
                    <span className="text-[10px] text-amber-500 dark:text-amber-400 font-mono">UPSC / SSC Mandate</span>
                  </div>

                  {includeDateStamp && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={`text-[11px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Candidate Full Name
                        </label>
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="e.g. RAHUL SHARMA"
                          className={`w-full text-xs px-3 py-2 rounded-lg border uppercase focus:outline-hidden focus:border-amber-500 ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[11px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Date Photo Taken (DOP)
                        </label>
                        <input
                          type="date"
                          value={photoDate}
                          onChange={(e) => setPhotoDate(e.target.value)}
                          className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-hidden focus:border-amber-500 ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                  <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Rotate</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                      className={`p-2 rounded-lg border cursor-pointer ${
                        isDark
                          ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-950'
                      }`}
                      title="Rotate counter-clockwise"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-10 text-center">
                      {rotation}°
                    </span>
                    <button
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className={`p-2 rounded-lg border cursor-pointer ${
                        isDark
                          ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-950'
                      }`}
                      title="Rotate clockwise"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
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
                <span>Format for {exam.toUpperCase()} Portal ({rule.dpi} DPI JPEG)</span>
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
              <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {exam.toUpperCase()} Official Criteria
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium">
                Notification Verified
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Dimensions:</span>
                <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {rule.width} × {rule.height} px
                </span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Strict File Size Range:</span>
                <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {rule.minKb} KB – {rule.maxKb} KB
                </span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded border ${isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Resolution Target:</span>
                <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {rule.dpi} DPI JFIF Header
                </span>
              </div>
              <p className={`text-[11px] italic pt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Note: {rule.notes}
              </p>
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
            <div className={`flex flex-col items-center justify-center p-4 rounded-md border border-dashed min-h-[200px] ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'}`}>
              {resultUrl ? (
                <div className="text-center space-y-3">
                  <div className="inline-block p-1 bg-white rounded shadow-md border border-slate-200 dark:border-transparent">
                    <img
                      src={resultUrl}
                      alt="UPSC SSC output preview"
                      style={{
                        width: itemType === 'photo' ? '180px' : '220px',
                        height: 'auto',
                      }}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {rule.width} × {rule.height} px
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Dimensions: {rule.width} × {rule.height} px
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  File Size ({rule.minKb}–{rule.maxKb} KB)
                </span>
                <span className="font-mono font-bold">
                  {resultBlob ? formatBytes(resultSizeBytes) : 'Pending'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  resultBlob && verifiedDpi === rule.dpi
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Embedded DPI: {rule.dpi} DPI
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
              <span>Download {exam.toUpperCase()} {itemType === 'photo' ? 'Photo' : 'Signature'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Educational Guidelines */}
      <div className={`pt-8 border-t space-y-6 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
        <h2 className={`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
          UPSC &amp; SSC Portal Upload Instructions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xs'}`}>
            <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-bold">01. Recent Photograph</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Within 10 Days of Notification</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              UPSC mandates that photos must not be older than 10 days before the online application opens.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xs'}`}>
            <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-bold">02. SSC Strict 20–50 KB</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Automatic KB Targeting</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              SSC portal servers automatically reject photos exceeding 50 KB or under 20 KB. Our binary compression guarantees compliance.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xs'}`}>
            <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-bold">03. 100% Privacy</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>No Cloud Server Upload</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Your photo and signature never leave your device. Processed in-memory in your browser.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className={`p-5 rounded-lg border space-y-3 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
          <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Frequently Asked Questions</h3>
          {[
            {
              q: 'Is candidate name and date stamp compulsory on UPSC photo?',
              a: 'Yes. As per latest UPSC notifications, the photograph uploaded to the One Time Registration (OTR) must clearly display the candidate name and Date of Photograph (DOP) at the bottom.',
            },
            {
              q: 'What is the signature file size limit for SSC online application?',
              a: 'SSC mandates signatures strictly between 10 KB to 20 KB in JPEG format with dimensions 4.0 cm × 2.0 cm (approx 400×200 px).',
            },
            {
              q: 'What if my photo file size is too small?',
              a: 'FileWala automatically adds safe JPEG comment padding to ensure your file never falls below the mandatory 20 KB lower limit.',
            },
          ].map((faq, idx) => (
            <div key={idx} className={`border-b pb-3 last:border-b-0 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className={`w-full flex items-center justify-between text-left text-xs font-semibold cursor-pointer py-1 ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-amber-500 dark:text-amber-400' : 'text-slate-400'
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
