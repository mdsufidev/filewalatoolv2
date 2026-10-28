'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Eye,
  UploadCloud,
  Copy,
  Share2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { ImageToolGuideSection } from './image/ImageToolGuideSection';
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
  { id: '16:9', label: '16:9 Video', ratio: 16 / 9, description: 'YouTube thumbnail, widescreen' },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16, description: 'Instagram Reels, Stories, TikTok' },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3, description: 'Classic digital photos, tablets' },
  { id: '3:2', label: '3:2 Photo', ratio: 3 / 2, description: 'Classic 35mm DSLR photography' },
  { id: '21:9', label: '21:9 Cinema', ratio: 21 / 9, description: 'Cinematic ultrawide banners' },
];

type DragHandleType = 'box' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface CropBox {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  w: number; // 0 to 1 normalized
  h: number; // 0 to 1 normalized
}

interface DragSession {
  handle: DragHandleType;
  startX: number;
  startY: number;
  startBox: CropBox;
  stageRect: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
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
 * Standardized Schema-Matched Guide & Knowledge Base for Crop & Rotate
 */
const CropRotateGuideAndFaq: React.FC<{ isDark?: boolean }> = () => {
  return <ImageToolGuideSection toolId="crop-image" />;
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
  const stageRef = useRef<HTMLDivElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeUrlsRef = useRef<Set<string>>(new Set());
  const lastPreviewUrlRef = useRef<string | null>(null);
  const loadedInitialFileRef = useRef<File | null>(null);

  // Pointer drag session
  const dragStateRef = useRef<DragSession | null>(null);

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

  // Render transformed image directly onto stage canvas buffer
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    if (!canvas || !sourceImage) return;

    canvas.width = currentTransformedW;
    canvas.height = currentTransformedH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, currentTransformedW, currentTransformedH);

    ctx.save();
    ctx.translate(currentTransformedW / 2, currentTransformedH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    const img = sourceImage.imageElement;
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [sourceImage, currentTransformedW, currentTransformedH, rotation, flipH, flipV]);

  // Build an in-memory transformed canvas (rotated and flipped) for crop exports
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
        // Freeform: keep current or normalize
        return;
      }

      // In normalized coordinate space [0..1] x [0..1]:
      // w_pixel / h_pixel = (w_norm * W) / (h_norm * H) = preset.ratio
      // => w_norm / h_norm = preset.ratio * (H / W) = rNorm
      const rNorm = preset.ratio * (currentTransformedH / currentTransformedW);

      let newW: number;
      let newH: number;

      if (rNorm >= 1) {
        newW = 0.9;
        newH = newW / rNorm;
        if (newH > 0.9) {
          newH = 0.9;
          newW = newH * rNorm;
        }
      } else {
        newH = 0.9;
        newW = newH * rNorm;
        if (newW > 0.9) {
          newW = 0.9;
          newH = newW / rNorm;
        }
      }

      newW = Math.max(0.05, Math.min(1, newW));
      newH = Math.max(0.05, Math.min(1, newH));

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
    } else {
      // Re-clamp current cropbox to bounds
      setCropBox((prev) => ({
        x: Math.max(0, Math.min(0.95, prev.x)),
        y: Math.max(0, Math.min(0.95, prev.y)),
        w: Math.max(0.05, Math.min(1 - prev.x, prev.w)),
        h: Math.max(0.05, Math.min(1 - prev.y, prev.h)),
      }));
    }
  }, [rotation, sourceImage, aspectRatio, applyAspectPreset]);

  // Generate live preview of the cropped area
  const updateCropPreview = useCallback(async () => {
    if (!sourceImage) return;

    const transformedCanvas = renderTransformedCanvas();
    if (!transformedCanvas) return;

    const cropX = Math.max(0, Math.round(cropBox.x * transformedCanvas.width));
    const cropY = Math.max(0, Math.round(cropBox.y * transformedCanvas.height));
    const cropW = Math.max(1, Math.min(transformedCanvas.width - cropX, Math.round(cropBox.w * transformedCanvas.width)));
    const cropH = Math.max(1, Math.min(transformedCanvas.height - cropY, Math.round(cropBox.h * transformedCanvas.height)));

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = cropW;
    finalCanvas.height = cropH;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill white background for JPEG so transparent PNG areas don't turn black
    if (outputFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cropW, cropH);
    }

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
    }, 120);

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

  // Reset adjustments
  const handleResetAdjustments = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('free');
    setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    onNotify('Reset to Default', 'Crop box and orientation restored to original', 'info');
  };

  // Center crop selection
  const handleCenterCrop = () => {
    setCropBox((prev) => ({
      ...prev,
      x: Math.max(0, (1 - prev.w) / 2),
      y: Math.max(0, (1 - prev.h) / 2),
    }));
    onNotify('Centered', 'Crop box centered on image', 'info');
  };

  // Maximize / Fit to image
  const handleFitToImage = () => {
    if (aspectRatio === 'free') {
      setCropBox({ x: 0.02, y: 0.02, w: 0.96, h: 0.96 });
    } else {
      applyAspectPreset(aspectRatio);
    }
    onNotify('Fit to Image', 'Crop box expanded to fill canvas', 'info');
  };

  /* -------------------------------------------------------------
     POINTER DRAG ENGINE (UNIFIED VIRTUAL STAGE & 8 HANDLES)
  ------------------------------------------------------------- */
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: DragHandleType
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
      stageRect: {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      },
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    e.preventDefault();

    const { handle, startX, startY, startBox, stageRect } = dragStateRef.current;
    const dx = (e.clientX - startX) / stageRect.width;
    const dy = (e.clientY - startY) / stageRect.height;

    const minNormW = Math.max(0.02, 24 / stageRect.width);
    const minNormH = Math.max(0.02, 24 / stageRect.height);

    // 1. Moving the entire box
    if (handle === 'box') {
      const maxX = 1 - startBox.w;
      const maxY = 1 - startBox.h;
      const newX = Math.max(0, Math.min(maxX, startBox.x + dx));
      const newY = Math.max(0, Math.min(maxY, startBox.y + dy));
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      return;
    }

    const preset = ASPECT_PRESETS.find((p) => p.id === aspectRatio);
    const fixedRatio = preset && preset.ratio !== null ? preset.ratio : null;

    if (fixedRatio === null) {
      // 2. FREEFORM RESIZING (No ratio lock)
      let newX = startBox.x;
      let newY = startBox.y;
      let newW = startBox.w;
      let newH = startBox.h;

      switch (handle) {
        case 'e':
          newW = Math.max(minNormW, Math.min(1 - startBox.x, startBox.w + dx));
          break;
        case 'w': {
          const targetW = startBox.w - dx;
          if (targetW >= minNormW && startBox.x + dx >= 0) {
            newX = startBox.x + dx;
            newW = targetW;
          } else if (startBox.x + dx < 0) {
            newX = 0;
            newW = startBox.x + startBox.w;
          }
          break;
        }
        case 's':
          newH = Math.max(minNormH, Math.min(1 - startBox.y, startBox.h + dy));
          break;
        case 'n': {
          const targetH = startBox.h - dy;
          if (targetH >= minNormH && startBox.y + dy >= 0) {
            newY = startBox.y + dy;
            newH = targetH;
          } else if (startBox.y + dy < 0) {
            newY = 0;
            newH = startBox.y + startBox.h;
          }
          break;
        }
        case 'se':
          newW = Math.max(minNormW, Math.min(1 - startBox.x, startBox.w + dx));
          newH = Math.max(minNormH, Math.min(1 - startBox.y, startBox.h + dy));
          break;
        case 'sw': {
          const targetW = startBox.w - dx;
          if (targetW >= minNormW && startBox.x + dx >= 0) {
            newX = startBox.x + dx;
            newW = targetW;
          }
          newH = Math.max(minNormH, Math.min(1 - startBox.y, startBox.h + dy));
          break;
        }
        case 'ne': {
          newW = Math.max(minNormW, Math.min(1 - startBox.x, startBox.w + dx));
          const targetH = startBox.h - dy;
          if (targetH >= minNormH && startBox.y + dy >= 0) {
            newY = startBox.y + dy;
            newH = targetH;
          }
          break;
        }
        case 'nw': {
          const targetW = startBox.w - dx;
          if (targetW >= minNormW && startBox.x + dx >= 0) {
            newX = startBox.x + dx;
            newW = targetW;
          }
          const targetH = startBox.h - dy;
          if (targetH >= minNormH && startBox.y + dy >= 0) {
            newY = startBox.y + dy;
            newH = targetH;
          }
          break;
        }
      }

      setCropBox({
        x: Math.max(0, Math.min(0.98, newX)),
        y: Math.max(0, Math.min(0.98, newY)),
        w: Math.max(minNormW, Math.min(1 - newX, newW)),
        h: Math.max(minNormH, Math.min(1 - newY, newH)),
      });
    } else {
      // 3. FIXED ASPECT RATIO RESIZING
      // Normalized ratio: w_norm / h_norm = fixedRatio * (H_canvas / W_canvas)
      const rNorm = fixedRatio * (currentTransformedH / currentTransformedW);

      let newX = startBox.x;
      let newY = startBox.y;
      let newW = startBox.w;
      let newH = startBox.h;

      if (handle === 'se') {
        const rawW = startBox.w + dx;
        let targetW = Math.max(minNormW, rawW);
        let targetH = targetW / rNorm;

        if (startBox.x + targetW > 1) {
          targetW = 1 - startBox.x;
          targetH = targetW / rNorm;
        }
        if (startBox.y + targetH > 1) {
          targetH = 1 - startBox.y;
          targetW = targetH * rNorm;
        }
        newW = Math.max(minNormW, targetW);
        newH = Math.max(minNormH, targetH);
      } else if (handle === 'sw') {
        const rawW = startBox.w - dx;
        let targetW = Math.max(minNormW, rawW);
        let targetH = targetW / rNorm;

        const anchorRight = startBox.x + startBox.w;
        if (anchorRight - targetW < 0) {
          targetW = anchorRight;
          targetH = targetW / rNorm;
        }
        if (startBox.y + targetH > 1) {
          targetH = 1 - startBox.y;
          targetW = targetH * rNorm;
        }
        newW = Math.max(minNormW, targetW);
        newH = Math.max(minNormH, targetH);
        newX = anchorRight - newW;
      } else if (handle === 'ne') {
        const rawW = startBox.w + dx;
        let targetW = Math.max(minNormW, rawW);
        let targetH = targetW / rNorm;

        const anchorBottom = startBox.y + startBox.h;
        if (startBox.x + targetW > 1) {
          targetW = 1 - startBox.x;
          targetH = targetW / rNorm;
        }
        if (anchorBottom - targetH < 0) {
          targetH = anchorBottom;
          targetW = targetH * rNorm;
        }
        newW = Math.max(minNormW, targetW);
        newH = Math.max(minNormH, targetH);
        newY = anchorBottom - newH;
      } else if (handle === 'nw') {
        const rawW = startBox.w - dx;
        let targetW = Math.max(minNormW, rawW);
        let targetH = targetW / rNorm;

        const anchorRight = startBox.x + startBox.w;
        const anchorBottom = startBox.y + startBox.h;

        if (anchorRight - targetW < 0) {
          targetW = anchorRight;
          targetH = targetW / rNorm;
        }
        if (anchorBottom - targetH < 0) {
          targetH = anchorBottom;
          targetW = targetH * rNorm;
        }
        newW = Math.max(minNormW, targetW);
        newH = Math.max(minNormH, targetH);
        newX = anchorRight - newW;
        newY = anchorBottom - newH;
      } else if (handle === 'e' || handle === 'w') {
        const change = handle === 'e' ? dx : -dx;
        let targetW = Math.max(minNormW, startBox.w + change);
        let targetH = targetW / rNorm;

        if (targetH > 1) {
          targetH = 1;
          targetW = targetH * rNorm;
        }
        if (handle === 'e' && startBox.x + targetW > 1) {
          targetW = 1 - startBox.x;
          targetH = targetW / rNorm;
        }
        if (handle === 'w' && startBox.x + startBox.w - targetW < 0) {
          targetW = startBox.x + startBox.w;
          targetH = targetW / rNorm;
        }

        newW = targetW;
        newH = targetH;
        if (handle === 'w') {
          newX = startBox.x + startBox.w - newW;
        }
        const centerY = startBox.y + startBox.h / 2;
        newY = Math.max(0, Math.min(1 - newH, centerY - newH / 2));
      } else if (handle === 's' || handle === 'n') {
        const change = handle === 's' ? dy : -dy;
        let targetH = Math.max(minNormH, startBox.h + change);
        let targetW = targetH * rNorm;

        if (targetW > 1) {
          targetW = 1;
          targetH = targetW / rNorm;
        }
        if (handle === 's' && startBox.y + targetH > 1) {
          targetH = 1 - startBox.y;
          targetW = targetH * rNorm;
        }
        if (handle === 'n' && startBox.y + startBox.h - targetH < 0) {
          targetH = startBox.y + startBox.h;
          targetW = targetH * rNorm;
        }

        newH = targetH;
        newW = targetW;
        if (handle === 'n') {
          newY = startBox.y + startBox.h - newH;
        }
        const centerX = startBox.x + startBox.w / 2;
        newX = Math.max(0, Math.min(1 - newW, centerX - newW / 2));
      }

      setCropBox({
        x: Math.max(0, Math.min(1 - newW, newX)),
        y: Math.max(0, Math.min(1 - newH, newY)),
        w: Math.max(minNormW, newW),
        h: Math.max(minNormH, newH),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      dragStateRef.current = null;
    }
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
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Cropped image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Your browser could not copy image directly to clipboard.', 'error');
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
    if (shared.shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
    }
  };

  // Full reset
  const handleFullReset = useCallback(() => {
    revokeAllTrackedUrls();
    lastPreviewUrlRef.current = null;
    loadedInitialFileRef.current = null;
    setSourceImage(null);
    setPreviewBlobUrl(null);
    setLastCroppedBlob(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [revokeAllTrackedUrls]);

  // Global Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (sourceImage) {
          e.preventDefault();
          handleFullReset();
          onNotify('Reset', 'Cleared image.', 'info');
          return;
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (sourceImage) {
          e.preventDefault();
          handleRotateClockwise();
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (sourceImage) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (sourceImage) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sourceImage, handleDownload, handleRotateClockwise, handleFullReset, onNotify]);

  /* -------------------------------------------------------------
     RENDER: EMPTY STATE (DROPZONE & WORKFLOW BANNER)
  ------------------------------------------------------------- */
  if (!sourceImage) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 select-none">
        {/* Authoritative SEO Heading */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side Engine · Zero Uploads</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Crop & Rotate Tool
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Crop images with custom aspect ratios, rotate 90°, and flip with high-precision client-side Canvas rendering.
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Large Dropzone */}
        <div
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

            <div className="space-y-1">
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Choose an image or drag & drop here
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Supports PNG, JPEG, WebP, AVIF · Press Ctrl+V to paste
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSample();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
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
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header bar with Source Info & Actions */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${
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
            <div className={`flex flex-wrap items-center gap-2 text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <span className="font-mono text-blue-500 dark:text-blue-400">
                Source: {sourceImage.width} × {sourceImage.height} px
              </span>
              <span>·</span>
              <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {formatBytes(sourceImage.sizeBytes)}
              </span>
              <span>·</span>
              <span className="font-mono text-emerald-500 dark:text-emerald-400">
                Orientation: {rotation}° {flipH ? '↔' : ''} {flipV ? '↕' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetAdjustments}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Crop</span>
          </button>
          <button
            onClick={handleFullReset}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-rose-600'
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
          className={`lg:col-span-5 p-5 rounded-xl border space-y-6 ${
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
            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Select standard aspect ratios, rotate orientation, or mirror flip
            </p>
          </div>

          {/* Aspect Ratio Presets Bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                Aspect Ratio Presets
              </span>
              <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Snap crop box
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyAspectPreset(preset.id)}
                  className={`py-2 px-1 rounded-lg text-xs font-medium text-center transition-all cursor-pointer truncate ${
                    aspectRatio === preset.id
                      ? isDark
                        ? 'bg-blue-600/20 text-blue-300 font-bold'
                        : 'bg-blue-50 text-blue-700 font-bold'
                      : isDark
                        ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800'
                        : 'bg-zinc-100/70 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation & Flip Controls */}
          <div className={`space-y-2.5 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                Rotation & Flipping
              </span>
              <span className="font-mono text-[10px] text-blue-500 dark:text-blue-400">
                {rotation}° {flipH ? '· Mirror H' : ''} {flipV ? '· Mirror V' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleRotateCounterClockwise}
                className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate -90°</span>
              </button>

              <button
                type="button"
                onClick={handleRotateClockwise}
                className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate +90°</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFlipH}
                className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  flipH
                    ? isDark
                      ? 'bg-blue-600/20 text-blue-300 font-bold'
                      : 'bg-blue-50 text-blue-700 font-bold'
                    : isDark
                      ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip Horizontal</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFlipV}
                className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  flipV
                    ? isDark
                      ? 'bg-blue-600/20 text-blue-300 font-bold'
                      : 'bg-blue-50 text-blue-700 font-bold'
                    : isDark
                      ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Flip Vertical</span>
              </button>
            </div>
          </div>

          {/* Quick Framing Tools (Center / Fit All) */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCenterCrop}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800'
                  : 'bg-zinc-100/70 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Center Box</span>
            </button>
            <button
              type="button"
              onClick={handleFitToImage}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800'
                  : 'bg-zinc-100/70 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fit Image</span>
            </button>
          </div>

          {/* Current Selection Dimensions Card */}
          <div
            className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
              isDark ? 'bg-zinc-800/60' : 'bg-zinc-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Selected Crop Area:</span>
              <span className="font-mono font-bold text-blue-500 dark:text-blue-400">
                {cropPixelW} × {cropPixelH} px
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Aspect Ratio:</span>
              <span className="font-mono text-zinc-400">
                {cropPixelH > 0 ? (cropPixelW / cropPixelH).toFixed(2) : '1.00'}:1 ({aspectRatio.toUpperCase()})
              </span>
            </div>
            <div className={`text-[10px] pt-1 border-t ${isDark ? 'border-zinc-700/60 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
              Drag corners, edges, or the center box on the canvas to refine framing.
            </div>
          </div>

          {/* Export Format & Compression Quality */}
          <div className={`space-y-3 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Output Format</span>
              <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
                  className={`py-2 px-1 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    outputFormat === fmt.id
                      ? isDark
                        ? 'bg-zinc-100 text-zinc-900 font-bold shadow-xs'
                        : 'bg-zinc-900 text-white font-bold shadow-xs'
                      : isDark
                        ? 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
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
                  Drag white box to position; drag 8 handles to resize
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

            {/* Canvas Interactive Viewport with Unified Virtual Stage */}
            <div
              className={`relative select-none overflow-hidden rounded-md border min-h-[380px] max-h-[500px] flex items-center justify-center p-4 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800'
                  : 'bg-zinc-100 border-zinc-200'
              }`}
            >
              {/* Virtual Stage Container: Exact Aspect Ratio of Transformed Image */}
              <div
                ref={stageRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative select-none overflow-hidden touch-none"
                style={{
                  aspectRatio: `${currentTransformedW} / ${currentTransformedH}`,
                  maxWidth: '100%',
                  maxHeight: '440px',
                }}
              >
                {/* Transformed Canvas Buffer: Native 2D Rotation & Flipping */}
                <canvas
                  ref={stageCanvasRef}
                  className="w-full h-full block pointer-events-none"
                />

                {/* Crop Overlay Box with Dimmed Outside Shadow and Drag Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'box')}
                  className="absolute border-2 border-white cursor-move select-none touch-none"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.w * 100}%`,
                    height: `${cropBox.h * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)',
                  }}
                >
                  {/* Rule of Thirds 3×3 Grid */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-45">
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
                  <div className="absolute top-1.5 left-1.5 pointer-events-none bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                    {cropPixelW} × {cropPixelH}
                  </div>

                  {/* Corner Resize Handles (High Contrast Circular) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'nw')}
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md touch-none"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'ne')}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md touch-none"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'sw')}
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md touch-none"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'se')}
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md touch-none"
                  />

                  {/* Edge Resize Handles (Pill Bars) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border border-slate-900 rounded-xs cursor-ns-resize shadow-sm touch-none"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border border-slate-900 rounded-xs cursor-ns-resize shadow-sm touch-none"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'w')}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-8 bg-white border border-slate-900 rounded-xs cursor-ew-resize shadow-sm touch-none"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'e')}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-8 bg-white border border-slate-900 rounded-xs cursor-ew-resize shadow-sm touch-none"
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
              className={`rounded-xl p-3 flex items-center justify-center min-h-[140px] max-h-[180px] overflow-hidden ${
                isDark ? 'bg-zinc-800/60' : 'bg-zinc-100/80'
              }`}
            >
              {previewBlobUrl ? (
                <img
                  src={previewBlobUrl}
                  alt="Dynamic Crop Preview"
                  className="max-h-[160px] max-w-full object-contain rounded shadow-xs"
                />
              ) : (
                <div className="text-xs text-zinc-400">Generating live preview...</div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-3">
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                  Output: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{cropPixelW} × {cropPixelH} px</strong>
                </span>
                <span className={isDark ? 'text-zinc-600' : 'text-zinc-300'}>·</span>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                  Format: <strong className="uppercase text-blue-500 dark:text-blue-400">{outputFormat.replace('image/', '')}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                  title="Copy Cropped Image"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy</span>
                </button>
                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={handleShareImage}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                    title="Share Cropped Image"
                  >
                    <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Share</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
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
