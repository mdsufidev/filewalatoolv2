'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop as CropIcon,
  Download,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Layers,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  UploadCloud,
  FileCheck,
  Copy,
  Share2,
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { formatBytes, triggerFileDownload, createSafeObjectURL, revokeSafeObjectURL } from '../../utils/memory';
import { CanvasEngine } from '../../core/engine/CanvasEngine';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../utils/clipboardAndShare';

interface CropRotateToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFile?: File | null;
}

export type AspectPreset = 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:2' | '21:9';

interface AspectPresetOption {
  id: AspectPreset;
  label: string;
  ratio: number | null; // width / height
  description: string;
}

const ASPECT_PRESETS: AspectPresetOption[] = [
  { id: 'free', label: 'Freeform', ratio: null, description: 'Custom unconstrained framing' },
  { id: '1:1', label: '1:1 Square', ratio: 1, description: 'Instagram post, avatars & icons' },
  { id: '16:9', label: '16:9 Video', ratio: 16 / 9, description: 'YouTube thumbnail, widescreen displays' },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16, description: 'Instagram Reels, Stories, TikTok' },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3, description: 'Classic digital photos, tablet screens' },
  { id: '3:2', label: '3:2 Photo', ratio: 3 / 2, description: 'Classic 35mm DSLR photography' },
  { id: '21:9', label: '21:9 Cinema', ratio: 21 / 9, description: 'Cinematic ultrawide banners' },
];

type DragHandleType = 'box' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface CropBox {
  x: number; // 0 to 1 relative to transformed canvas
  y: number; // 0 to 1 relative to transformed canvas
  w: number; // 0 to 1 relative to transformed canvas
  h: number; // 0 to 1 relative to transformed canvas
}

interface LoadedImage {
  file: File;
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  previewUrl: string;
  imageElement: HTMLImageElement;
}

/**
 * Detailed Reference & Knowledge Base Component for Crop & Rotate
 */
const CropRotateGuideAndFaq: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="w-full space-y-6 pt-6">
      {/* 1. Aspect Ratio Standards */}
      <div
        className={`p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <h3
            className={`text-sm font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Aspect Ratio Framing Standards
          </h3>
        </div>
        <p
          className={`text-xs mb-4 leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Preset ratios ensure your images fit popular social media platforms, websites, and print media without black letterbox bars:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-400 font-mono">1:1 Square</span>
              <span className="text-[10px] font-mono text-slate-500">Square Post</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Best for Instagram feed posts, Facebook profile photos, WhatsApp avatars, and e-commerce product catalogs.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-400 font-mono">16:9 Landscape</span>
              <span className="text-[10px] font-mono text-slate-500">Widescreen</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Best for YouTube video thumbnails, LinkedIn header banners, presentation slides, and computer wallpapers.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-400 font-mono">9:16 Vertical</span>
              <span className="text-[10px] font-mono text-slate-500">Full-Screen Mobile</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Best for Instagram Stories, Reels, TikTok clips, YouTube Shorts, and smartphone lock screens.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-400 font-mono">4:3 & 3:2</span>
              <span className="text-[10px] font-mono text-slate-500">Photography</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Classic digital sensor and 35mm film photography ratio. Best for print framing, portfolio displays, and photo albums.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Architecture & Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-6 rounded-lg border ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-white border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3
              className={`text-sm font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              100% Client-Side Canvas Engine
            </h3>
          </div>
          <p
            className={`text-xs mb-3.5 leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Cropping, 90° orientation rotation, and horizontal/vertical flipping occur entirely in your computer's RAM using hardware-accelerated Canvas 2D matrices.
          </p>

          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                <strong>Zero Server Processing:</strong> No files are uploaded to any server. Complete privacy and GDPR compliance.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                <strong>Bicubic Interpolation:</strong> Canvas smoothing is set to high-precision mode to ensure sharp lines and colors.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                <strong>Automatic Memory Safety:</strong> Generated object URLs are revoked immediately after rendering to prevent memory leaks.
              </span>
            </li>
          </ul>
        </div>

        {/* Rule of Thirds Card */}
        <div
          className={`p-6 rounded-lg border ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-white border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <h3
              className={`text-sm font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Rule of Thirds Composition
            </h3>
          </div>
          <p
            className={`text-xs mb-3.5 leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            The interactive crop box contains a 3×3 grid overlay based on the golden composition rule:
          </p>

          <div className="space-y-2 text-xs">
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-bold text-indigo-400">Intersection Focal Points:</span>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Align the most important subject (e.g. eyes in portraits, horizon in landscapes) along grid intersection lines for compelling balance.
              </p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-bold text-indigo-400">Horizon Alignment:</span>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Place horizons along the top third line (to emphasize land/foreground) or bottom third line (to emphasize skies).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Frequently Asked Questions */}
      <div
        className={`p-6 rounded-lg border ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-emerald-500" />
          <h3
            className={`text-sm font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Frequently Asked Questions (FAQ)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Does rotating or flipping reduce photo quality?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              No. Rotation by exact multiples of 90 degrees and horizontal/vertical flipping are lossless matrix operations. No blur or artifacts are introduced.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              What output format is generated?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              You can choose to export as PNG (lossless with transparency), WebP (lightweight web format), or JPEG (universal photo format with adjustable quality).
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Can I crop transparent PNG images?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Yes! PNG alpha transparency channels are fully preserved during cropping, rotation, and mirror flipping.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Can I revert if I make a mistake?
            </h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Yes. Use the prominent "Reset All" button anytime to immediately restore the original image orientation, framing, and aspect ratio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CropRotateTool: React.FC<CropRotateToolProps> = ({ onNotify, initialFile }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Loaded Source Image
  const [sourceImage, setSourceImage] = useState<LoadedImage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Geometric Transformation States
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectPreset>('free');

  // Crop Box Coordinates (relative 0 to 1 based on transformed canvas)
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0.05,
    y: 0.05,
    w: 0.9,
    h: 0.9,
  });

  // Output Settings
  const [outputFormat, setOutputFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState<number>(95);

  // Processing & Live Preview
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewSizeBytes, setPreviewSizeBytes] = useState<number | null>(null);
  const [lastCroppedBlob, setLastCroppedBlob] = useState<Blob | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const activeUrlsRef = useRef<Set<string>>(new Set());
  const lastPreviewUrlRef = useRef<string | null>(null);
  const loadedInitialFileRef = useRef<File | null>(null);

  // Mouse Dragging for Handles
  const isDragging = useRef<boolean>(false);
  const dragHandle = useRef<DragHandleType | null>(null);
  const dragStart = useRef<{
    mouseX: number;
    mouseY: number;
    box: CropBox;
  }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 },
  });

  // Memory URL management
  const registerObjectUrl = useCallback((url: string) => {
    activeUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeAllTrackedUrls = useCallback(() => {
    activeUrlsRef.current.forEach((url) => {
      try {
        revokeSafeObjectURL(url);
      } catch {
        // Ignore
      }
    });
    activeUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeAllTrackedUrls();
    };
  }, [revokeAllTrackedUrls]);

  // Transformed image dimensions (swaps width/height on 90° or 270°)
  const isSwapped = rotation === 90 || rotation === 270;
  const currentTransformedW = sourceImage
    ? isSwapped
      ? sourceImage.height
      : sourceImage.width
    : 1920;
  const currentTransformedH = sourceImage
    ? isSwapped
      ? sourceImage.width
      : sourceImage.height
    : 1080;

  // Pixel dimensions of current crop selection
  const cropPixelW = Math.max(1, Math.round(cropBox.w * currentTransformedW));
  const cropPixelH = Math.max(1, Math.round(cropBox.h * currentTransformedH));

  // Build an in-memory transformed canvas (rotated and flipped)
  const renderTransformedCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!sourceImage) return null;

    const img = sourceImage.imageElement;
    const canvas = document.createElement('canvas');
    canvas.width = currentTransformedW;
    canvas.height = currentTransformedH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.translate(currentTransformedW / 2, currentTransformedH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    return canvas;
  }, [sourceImage, currentTransformedW, currentTransformedH, rotation, flipH, flipV]);

  // Snap crop box to ratio when aspect preset or image orientation changes
  const applyAspectPreset = useCallback(
    (presetId: AspectPreset) => {
      setAspectRatio(presetId);
      const preset = ASPECT_PRESETS.find((p) => p.id === presetId);
      if (!preset || preset.ratio === null) {
        // Freeform: keep current or default to 90%
        return;
      }

      const targetRatio = preset.ratio; // W / H
      const canvasRatio = currentTransformedW / currentTransformedH;

      let newW = 0.85;
      let newH = 0.85;

      if (targetRatio > canvasRatio) {
        // Target is wider than canvas
        newW = 0.9;
        const pixelW = newW * currentTransformedW;
        const pixelH = pixelW / targetRatio;
        newH = pixelH / currentTransformedH;
      } else {
        // Target is taller than canvas
        newH = 0.9;
        const pixelH = newH * currentTransformedH;
        const pixelW = pixelH * targetRatio;
        newW = pixelW / currentTransformedW;
      }

      newW = Math.max(0.1, Math.min(0.98, newW));
      newH = Math.max(0.1, Math.min(0.98, newH));

      setCropBox({
        x: Math.max(0, (1 - newW) / 2),
        y: Math.max(0, (1 - newH) / 2),
        w: newW,
        h: newH,
      });

      onNotify('Aspect Ratio Snapped', `${preset.label} (${preset.description})`, 'info');
    },
    [currentTransformedW, currentTransformedH, onNotify]
  );

  // Re-adjust crop box when rotation alters canvas aspect ratio
  useEffect(() => {
    if (!sourceImage) return;
    if (aspectRatio !== 'free') {
      applyAspectPreset(aspectRatio);
    }
  }, [rotation, sourceImage, aspectRatio, applyAspectPreset]);

  // Generate live preview of the cropped area
  const updateCropPreview = useCallback(async () => {
    if (!sourceImage) return;

    const transformedCanvas = renderTransformedCanvas();
    if (!transformedCanvas) return;

    const cropX = Math.max(0, Math.round(cropBox.x * transformedCanvas.width));
    const cropY = Math.max(0, Math.round(cropBox.y * transformedCanvas.height));
    const cropW = Math.max(1, Math.round(cropBox.w * transformedCanvas.width));
    const cropH = Math.max(1, Math.round(cropBox.h * transformedCanvas.height));

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = cropW;
    finalCanvas.height = cropH;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      transformedCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    finalCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (lastPreviewUrlRef.current) {
          revokeSafeObjectURL(lastPreviewUrlRef.current);
        }
        const url = registerObjectUrl(createSafeObjectURL(blob));
        lastPreviewUrlRef.current = url;
        setPreviewBlobUrl(url);
        setPreviewSizeBytes(blob.size);
        setLastCroppedBlob(blob);
      },
      outputFormat,
      quality / 100
    );
  }, [sourceImage, renderTransformedCanvas, cropBox, outputFormat, quality, registerObjectUrl]);

  // Debounce live preview update when crop box, rotation, or format changes
  useEffect(() => {
    if (!sourceImage) return;

    const timer = setTimeout(() => {
      updateCropPreview();
    }, 150);

    return () => clearTimeout(timer);
  }, [cropBox, rotation, flipH, flipV, outputFormat, quality, sourceImage, updateCropPreview]);

  // File loading
  const validateAndLoadFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp'];
      if (!validTypes.includes(file.type) && !/\.(jpe?g|png|webp|avif|bmp)$/i.test(file.name)) {
        const msg = 'Unsupported file format. Please upload PNG, JPEG, WebP, or AVIF image.';
        setErrorMessage(msg);
        onNotify('Invalid File', msg, 'error');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        const msg = 'File size exceeds 50MB maximum limit.';
        setErrorMessage(msg);
        onNotify('File Too Large', msg, 'error');
        return;
      }

      try {
        setIsProcessing(true);
        revokeAllTrackedUrls();

        const img = await CanvasEngine.loadImage(file);
        const url = registerObjectUrl(createSafeObjectURL(file));

        const meta: LoadedImage = {
          file,
          name: file.name,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          sizeBytes: file.size,
          format: file.type || 'image/jpeg',
          previewUrl: url,
          imageElement: img,
        };

        setSourceImage(meta);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setAspectRatio('free');
        setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
        setLastCroppedBlob(null);

        onNotify('Image Loaded', `${meta.width} × ${meta.height} px (${formatBytes(meta.sizeBytes)})`, 'info');
      } catch (err: any) {
        const msg = err?.message || 'Failed to decode image file.';
        setErrorMessage(msg);
        onNotify('Load Error', msg, 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [onNotify, registerObjectUrl, revokeAllTrackedUrls]
  );

  // Sample Benchmark Image loader
  const handleLoadSample = useCallback(() => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 1920;
    sampleCanvas.height = 1080;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return;

    // Dark sleek gradient
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.4, '#0F172A');
    grad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Rule of thirds reference lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(640, 0);
    ctx.lineTo(640, 1080);
    ctx.moveTo(1280, 0);
    ctx.lineTo(1280, 1080);
    ctx.moveTo(0, 360);
    ctx.lineTo(1920, 360);
    ctx.moveTo(0, 720);
    ctx.lineTo(1920, 720);
    ctx.stroke();

    // Geometric rings
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(960, 540, 80 + i * 50, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(129, 140, 248, ${0.35 - i * 0.04})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('FileWala Crop & Rotate Benchmark', 200, 520);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '26px sans-serif';
    ctx.fillText('1920 × 1080 · High Precision Interactive Test Image', 200, 570);

    sampleCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'filewala-crop-sample.png', { type: 'image/png' });
      validateAndLoadFile(file);
    }, 'image/png');
  }, [validateAndLoadFile]);

  // Global clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            validateAndLoadFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [validateAndLoadFile]);

  // Handle incoming initialFile from drag-and-drop or tool selector
  useEffect(() => {
    if (initialFile && initialFile !== loadedInitialFileRef.current) {
      loadedInitialFileRef.current = initialFile;
      validateAndLoadFile(initialFile);
    }
  }, [initialFile, validateAndLoadFile]);

  // Drag-and-drop file events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndLoadFile(e.dataTransfer.files[0]);
    }
  };

  // Rotation & Flip operations
  const handleRotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
    onNotify('Rotated 90° Clockwise', `New Orientation: ${(rotation + 90) % 360}°`, 'info');
  };

  const handleRotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    onNotify('Rotated 90° Counter-Clockwise', `New Orientation: ${(rotation - 90 + 360) % 360}°`, 'info');
  };

  const handleToggleFlipH = () => {
    setFlipH((prev) => !prev);
    onNotify('Flipped Horizontally', `Mirror: ${!flipH ? 'Active' : 'Original'}`, 'info');
  };

  const handleToggleFlipV = () => {
    setFlipV((prev) => !prev);
    onNotify('Flipped Vertically', `Vertical: ${!flipV ? 'Active' : 'Original'}`, 'info');
  };

  // Reset all adjustments
  const handleResetAdjustments = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('free');
    setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    onNotify('Reset to Default', 'Crop box and orientation restored to original', 'info');
  };

  // Mouse Drag Handlers for Crop Handles
  const startDrag = (e: React.MouseEvent, handle: DragHandleType) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragHandle.current = handle;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...cropBox },
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !previewContainerRef.current) return;

    const rect = previewContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragStart.current.mouseX) / rect.width;
    const dy = (e.clientY - dragStart.current.mouseY) / rect.height;
    const initial = dragStart.current.box;
    const handle = dragHandle.current;

    // Moving the entire box
    if (handle === 'box') {
      const maxX = 1 - initial.w;
      const maxY = 1 - initial.h;
      const newX = Math.max(0, Math.min(maxX, initial.x + dx));
      const newY = Math.max(0, Math.min(maxY, initial.y + dy));
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      return;
    }

    let newX = initial.x;
    let newY = initial.y;
    let newW = initial.w;
    let newH = initial.h;

    // Fixed aspect ratio constraints
    const preset = ASPECT_PRESETS.find((p) => p.id === aspectRatio);
    const fixedRatio = preset && preset.ratio !== null ? preset.ratio : null;

    if (handle === 'se') {
      newW = Math.max(0.08, Math.min(1 - initial.x, initial.w + dx));
      if (fixedRatio) {
        const pixelW = newW * currentTransformedW;
        const pixelH = pixelW / fixedRatio;
        newH = Math.max(0.08, Math.min(1 - initial.y, pixelH / currentTransformedH));
      } else {
        newH = Math.max(0.08, Math.min(1 - initial.y, initial.h + dy));
      }
    } else if (handle === 'nw') {
      const targetW = initial.w - dx;
      const targetH = initial.h - dy;
      if (targetW > 0.08 && initial.x + dx >= 0) {
        newX = initial.x + dx;
        newW = targetW;
      }
      if (targetH > 0.08 && initial.y + dy >= 0) {
        newY = initial.y + dy;
        newH = targetH;
      }
    } else if (handle === 'ne') {
      newW = Math.max(0.08, Math.min(1 - initial.x, initial.w + dx));
      const targetH = initial.h - dy;
      if (targetH > 0.08 && initial.y + dy >= 0) {
        newY = initial.y + dy;
        newH = targetH;
      }
    } else if (handle === 'sw') {
      const targetW = initial.w - dx;
      if (targetW > 0.08 && initial.x + dx >= 0) {
        newX = initial.x + dx;
        newW = targetW;
      }
      newH = Math.max(0.08, Math.min(1 - initial.y, initial.h + dy));
    } else if (handle === 'n') {
      const targetH = initial.h - dy;
      if (targetH > 0.08 && initial.y + dy >= 0) {
        newY = initial.y + dy;
        newH = targetH;
      }
    } else if (handle === 's') {
      newH = Math.max(0.08, Math.min(1 - initial.y, initial.h + dy));
    } else if (handle === 'w') {
      const targetW = initial.w - dx;
      if (targetW > 0.08 && initial.x + dx >= 0) {
        newX = initial.x + dx;
        newW = targetW;
      }
    } else if (handle === 'e') {
      newW = Math.max(0.08, Math.min(1 - initial.x, initial.w + dx));
    }

    setCropBox({
      x: Math.max(0, Math.min(0.92, newX)),
      y: Math.max(0, Math.min(0.92, newY)),
      w: Math.max(0.08, Math.min(1 - newX, newW)),
      h: Math.max(0.08, Math.min(1 - newY, newH)),
    });
  };

  const stopDrag = () => {
    isDragging.current = false;
    dragHandle.current = null;
  };

  // Download Cropped & Rotated Image
  const handleDownload = async () => {
    if (!lastCroppedBlob || !sourceImage) {
      await updateCropPreview();
    }

    if (!lastCroppedBlob || !sourceImage) {
      onNotify('Download Error', 'No image ready for export', 'error');
      return;
    }

    const baseName = sourceImage.name.replace(/\.[^/.]+$/, '');
    const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${baseName}-cropped-${cropPixelW}x${cropPixelH}.${ext}`;

    triggerFileDownload(lastCroppedBlob, filename);
    onNotify(
      'Download Started',
      `Saved ${filename} (${cropPixelW} × ${cropPixelH} px · ${formatBytes(lastCroppedBlob.size)})`,
      'success'
    );
  };

  const handleCopyImage = async () => {
    let blob = lastCroppedBlob;
    if (!blob) {
      await updateCropPreview();
      blob = lastCroppedBlob;
    }
    if (!blob) {
      onNotify('Copy Failed', 'No image ready to copy.', 'error');
      return;
    }
    const ok = await copyImageToClipboard(blob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Cropped image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShareImage = async () => {
    let blob = lastCroppedBlob;
    if (!blob) {
      await updateCropPreview();
      blob = lastCroppedBlob;
    }
    if (!blob || !sourceImage) {
      onNotify('Share Failed', 'No image ready to share.', 'error');
      return;
    }
    const baseName = sourceImage.name.replace(/\.[^/.]+$/, '');
    const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${baseName}-cropped-${cropPixelW}x${cropPixelH}.${ext}`;
    const shared = await shareFileOrBlob({
      blob,
      filename,
      title: 'Cropped Image',
      text: 'Cropped image created with FileWala.',
    });
    if (shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
    }
  };

  // Full reset
  const handleFullReset = () => {
    revokeAllTrackedUrls();
    lastPreviewUrlRef.current = null;
    loadedInitialFileRef.current = null;
    setSourceImage(null);
    setPreviewBlobUrl(null);
    setLastCroppedBlob(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* -------------------------------------------------------------
     RENDER: EMPTY STATE (DROPZONE & WORKFLOW BANNER)
  ------------------------------------------------------------- */
  if (!sourceImage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Single Authoritative Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side Engine · Zero Cloud Uploads</span>
          </div>

          <h2
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-950'
            }`}
          >
            Crop & Rotate Tool
          </h2>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Crop images with interactive corner handles, lock standard aspect ratios (1:1, 16:9, 9:16), rotate 90°, and flip with high-precision Canvas rendering.
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4-Step Quick Start Workflow Banner */}
        <div
          className={`p-5 rounded-lg border ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-white border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              How to Crop & Rotate in 4 Easy Steps
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Upload Image
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Drop PNG, JPG, or WebP up to 50MB or paste directly with Ctrl+V.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Select Aspect Ratio
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Snap to 1:1 Square, 16:9 Video, 9:16 Story, 4:3, or Freeform.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Rotate & Frame
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Rotate 90°, flip mirror, and drag crop handles or center box.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Crop & Download
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Inspect live preview panel and download your high-res cropped asset.
              </p>
            </div>
          </div>
        </div>

        {/* Large Dropzone */}
        <div
          ref={previewContainerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group border border-dashed rounded-lg p-10 sm:p-14 text-center cursor-pointer transition-colors duration-150 select-none ${
            isDragOver
              ? isDark
                ? 'border-zinc-500 bg-zinc-800/40'
                : 'border-zinc-500 bg-zinc-50'
              : isDark
                ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                : 'border-zinc-300 bg-white hover:border-zinc-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/bmp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                validateAndLoadFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div
              className={`w-12 h-12 rounded-md flex items-center justify-center transition-colors border ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}
            >
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Choose an image or drag & drop here
              </h3>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Supports <span className="font-semibold text-slate-300">PNG, JPEG, WebP</span> up to 50MB (Paste via Ctrl+V)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                .PNG
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                .JPG / .JPEG
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                .WEBP
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSample();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Try with Sample Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Reference, Format Matrix, Presets Guide & FAQ */}
        <CropRotateGuideAndFaq isDark={isDark} />
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (IMAGE LOADED)
  ------------------------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header bar with Source Info & Full Reset Button */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-4 border rounded-lg ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded border overflow-hidden shrink-0 flex items-center justify-center ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}
          >
            <img
              src={sourceImage.previewUrl}
              alt="Source Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {sourceImage.name}
            </h3>
            <div className={`flex flex-wrap items-center gap-2 text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-mono text-blue-400">
                Source: {sourceImage.width} × {sourceImage.height} px
              </span>
              <span>·</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {formatBytes(sourceImage.sizeBytes)}
              </span>
              <span>·</span>
              <span className="font-mono text-emerald-400">
                Orientation: {rotation}° {flipH ? '↔' : ''} {flipV ? '↕' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetAdjustments}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Crop & Orientation</span>
          </button>
          <button
            onClick={handleFullReset}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200'
            }`}
          >
            <span>Change Image</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Controls + Interactive Cropping Canvas + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* Left Column: Crop & Transform Controls Panel (5 Columns) */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-5 p-5 rounded-lg border space-y-6 ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Crop & Rotate Controls
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400">
                Canvas 2D Engine
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Select standard aspect ratios, rotate orientation, or mirror flip
            </p>
          </div>

          {/* Aspect Ratio Presets Bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                Aspect Ratio Presets
              </span>
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Snap crop box
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyAspectPreset(preset.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer truncate ${
                    aspectRatio === preset.id
                      ? isDark
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-bold shadow-xs'
                        : 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-xs'
                      : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation & Flip Controls */}
          <div className={`space-y-2.5 pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                Rotation & Flipping
              </span>
              <span className="font-mono text-[10px] text-blue-400">
                {rotation}° {flipH ? '· Mirror H' : ''} {flipV ? '· Mirror V' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleRotateCounterClockwise}
                className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate -90°</span>
              </button>

              <button
                type="button"
                onClick={handleRotateClockwise}
                className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate +90°</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFlipH}
                className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  flipH
                    ? isDark
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-bold'
                      : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                    : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip Horizontal</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFlipV}
                className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  flipV
                    ? isDark
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-bold'
                      : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                    : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Flip Vertical</span>
              </button>
            </div>
          </div>

          {/* Current Selection Dimensions Card */}
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Selected Crop Area:</span>
              <span className="font-mono font-bold text-blue-400">
                {cropPixelW} × {cropPixelH} px
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Aspect Ratio:</span>
              <span className="font-mono text-slate-400">
                {(cropPixelW / cropPixelH).toFixed(2)}:1 ({aspectRatio.toUpperCase()})
              </span>
            </div>
            <div className={`text-[10px] pt-1 border-t ${isDark ? 'border-slate-800/60 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              Drag corners, edges, or the center box on the canvas to refine framing.
            </div>
          </div>

          {/* Export Format & Compression Quality */}
          <div className={`space-y-3 pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Output Format</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Client-side transcoding
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(
                [
                  { id: 'image/png', name: 'PNG (Lossless)' },
                  { id: 'image/webp', name: 'WebP (Small)' },
                  { id: 'image/jpeg', name: 'JPEG (Universal)' },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setOutputFormat(fmt.id)}
                  className={`py-2 px-1 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                    outputFormat === fmt.id
                      ? isDark
                        ? 'bg-slate-800 text-white border-slate-700 font-bold shadow-xs'
                        : 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                      : isDark
                        ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-950'
                  }`}
                >
                  {fmt.name}
                </button>
              ))}
            </div>

            {outputFormat !== 'image/png' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Output Quality
                  </span>
                  <span className="font-mono text-xs font-semibold text-blue-400">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-slate-800"
                />
              </div>
            )}
          </div>

          {/* Primary Action Button: Crop & Download */}
          <button
            disabled={isProcessing}
            onClick={handleDownload}
            className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Canvas...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  Crop & Download Image{' '}
                  {previewSizeBytes ? `(${formatBytes(previewSizeBytes)})` : ''}
                </span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isProcessing}
              className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
              <span>Copy Image</span>
            </button>
            {isShareSupported() && (
              <button
                type="button"
                onClick={handleShareImage}
                disabled={isProcessing}
                className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* Right Column: Interactive Crop Canvas Workspace (7 Columns) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Interactive Canvas */}
          <div
            className={`p-5 rounded-lg border space-y-3 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Interactive Cropping Canvas
                </h4>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Drag white box to position; drag handles to resize
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })}
                className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Reset Box
              </button>
            </div>

            {/* Canvas Interactive Viewport with Clean Flat Surface */}
            <div
              ref={previewContainerRef}
              onMouseMove={onMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              className={`relative select-none overflow-hidden rounded-md border min-h-[380px] max-h-[500px] flex items-center justify-center p-4 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800'
                  : 'bg-zinc-100 border-zinc-200'
              }`}
            >
              <div className="relative max-h-[440px] inline-block">
                {/* Rotated & Flipped Image Element */}
                <img
                  src={sourceImage.previewUrl}
                  alt="Transformed Source"
                  className="max-h-[440px] max-w-full object-contain block pointer-events-none rounded transition-transform duration-150"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                  }}
                />

                {/* Crop Overlay Box with Dimmed Outside Shadow and Drag Handles */}
                <div
                  onMouseDown={(e) => startDrag(e, 'box')}
                  className="absolute border-2 border-white cursor-move select-none"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.w * 100}%`,
                    height: `${cropBox.h * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                  }}
                >
                  {/* Rule of Thirds 3×3 Grid */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div />
                  </div>

                  {/* Dimension Pill Indicator Inside Box */}
                  <div className="absolute top-1.5 left-1.5 pointer-events-none bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                    {cropPixelW} × {cropPixelH}
                  </div>

                  {/* Corner Resize Handles */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'nw')}
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'ne')}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'sw')}
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'se')}
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md"
                  />

                  {/* Edge Resize Handles */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border border-slate-900 rounded-xs cursor-ns-resize shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border border-slate-900 rounded-xs cursor-ns-resize shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'w')}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-8 bg-white border border-slate-900 rounded-xs cursor-ew-resize shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'e')}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-8 bg-white border border-slate-900 rounded-xs cursor-ew-resize shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Live Preview Panel of the Cropped Result */}
          <div
            className={`p-4 rounded-lg border space-y-3 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                <h5 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Dynamic Cropped Preview
                </h5>
              </div>

              {previewSizeBytes && (
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {formatBytes(previewSizeBytes)}
                </span>
              )}
            </div>

            <div
              className={`rounded-xl border p-3 flex items-center justify-center min-h-[140px] max-h-[180px] overflow-hidden ${
                isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {previewBlobUrl ? (
                <img
                  src={previewBlobUrl}
                  alt="Dynamic Crop Preview"
                  className="max-h-[160px] max-w-full object-contain rounded shadow-xs"
                />
              ) : (
                <div className="text-xs text-slate-500">Generating live preview...</div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-3">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Output Resolution: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{cropPixelW} × {cropPixelH} px</strong>
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Format: <strong className="uppercase text-blue-400">{outputFormat.replace('image/', '')}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                  }`}
                  title="Copy Cropped Image"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy</span>
                </button>
                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={handleShareImage}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                    }`}
                    title="Share Cropped Image"
                  >
                    <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Share</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reference, Aspect Ratio Matrix & FAQ */}
      <CropRotateGuideAndFaq isDark={isDark} />
    </div>
  );
};
