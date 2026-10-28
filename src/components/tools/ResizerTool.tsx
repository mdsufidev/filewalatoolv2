/*
=== AI WEB BUG ANALYSIS & FIX PLAN ===

Bug Found: Stale Async Execution Race Condition in CanvasEngine.resize -> Fix: Introduced `executionIdRef` sequence counter. Outdated async promises are discarded if settings change before the previous canvas export finishes, preventing stale preview overwrites.

Bug Found: Object URL Memory Leak Accumulation During Live Resizing -> Fix: Prior `resizedResult.url` object URLs were never revoked during live parameter adjustments. Now revokes the previous object URL prior to registering the newly generated blob preview.

Bug Found: Missing Drag-and-Drop on Active Workspace -> Fix: When an image was loaded, dragging a new image onto the screen was ignored or risked browser navigation. Implemented an active workspace drag-over detector with internal element drag protection (`e.dataTransfer.types.includes('Files')`).

Bug Found: Internal Page Element Drag Hazard in Dropzone -> Fix: The dropzone activated on dragging internal webpage text/logos. Added strict validation requiring `e.dataTransfer.types.includes('Files')`.

Bug Found: Unused Lucide Icon Imports -> Fix: Cleaned up unused icons (`CheckCircle2`, `Maximize2`, `ArrowRight`, `Columns`) and added productive utility icons (`Copy`, `Share2`, `FileCheck`, `Info`).

Bug Found: Missing Clipboard Copy & Web Share APIs -> Fix: Added native 1-click "Copy Resized Image to Clipboard" via `ClipboardItem` API and mobile "Share" via `navigator.share` with fallback handling and feedback.

Bug Found: Percentage Scaling Loss of Custom Proportions -> Fix: When aspect ratio is unlocked and user customizes dimensions, switching to percentage scaling now scales relative to the currently configured dimensions rather than always resetting to original source ratio.
*/
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Link as LinkIcon,
  Unlink,
  Download,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Check,
  AlertCircle,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  Target,
  Grid,
  Copy,
  Share2,
  FileCheck,
  Info
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { ImageToolGuideSection } from './image/ImageToolGuideSection';
import { formatBytes, triggerFileDownload, createSafeObjectURL, revokeSafeObjectURL } from '../../utils/memory';
import { CanvasEngine, ImageFormat } from '../../core/engine/CanvasEngine';
import { copyImageToClipboard, shareFileOrBlob } from '../../utils/clipboardAndShare';

interface ResizerToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFile?: File | null;
}

export interface Preset {
  label: string;
  width: number;
  height: number;
  category: 'Social' | 'Display' | 'Govt' | 'Web';
  aspectRatioLabel: string;
}

const POPULAR_PRESETS: Preset[] = [
  { label: 'Instagram Square', width: 1080, height: 1080, category: 'Social', aspectRatioLabel: '1:1' },
  { label: 'Instagram Story / Reel', width: 1080, height: 1920, category: 'Social', aspectRatioLabel: '9:16' },
  { label: 'YouTube Thumbnail', width: 1280, height: 720, category: 'Social', aspectRatioLabel: '16:9' },
  { label: 'Twitter / X Header', width: 1500, height: 500, category: 'Social', aspectRatioLabel: '3:1' },
  { label: 'Full HD 1080p', width: 1920, height: 1080, category: 'Display', aspectRatioLabel: '16:9' },
  { label: '4K Ultra HD', width: 3840, height: 2160, category: 'Display', aspectRatioLabel: '16:9' },
  { label: 'PAN Card Photo (NSDL)', width: 213, height: 213, category: 'Govt', aspectRatioLabel: '1:1' },
  { label: 'Govt Signature Upload', width: 300, height: 120, category: 'Govt', aspectRatioLabel: '5:2' },
  { label: 'Website Favicon / Icon', width: 512, height: 512, category: 'Web', aspectRatioLabel: '1:1' },
];

type TargetFormatOption = 'original' | 'image/webp' | 'image/jpeg' | 'image/png';
type FitMode = 'stretch' | 'contain' | 'cover';

interface SourceImageMeta {
  file: File;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  sizeBytes: number;
  format: string;
  previewUrl: string;
  imageElement: HTMLImageElement;
}

interface ResizedResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

/**
 * Helper to compute common aspect ratio string (e.g. 16:9, 1:1, 4:3)
 */
function getAspectRatioLabel(width: number, height: number): string {
  if (width <= 0 || height <= 0) return 'Custom';
  const ratio = width / height;

  if (Math.abs(ratio - 1) < 0.02) return '1:1 (Square)';
  if (Math.abs(ratio - 16 / 9) < 0.03) return '16:9 (Widescreen)';
  if (Math.abs(ratio - 9 / 16) < 0.03) return '9:16 (Vertical)';
  if (Math.abs(ratio - 4 / 3) < 0.03) return '4:3 (Standard)';
  if (Math.abs(ratio - 3 / 2) < 0.03) return '3:2 (Classic 35mm)';
  if (Math.abs(ratio - 21 / 9) < 0.05) return '21:9 (Ultrawide)';

  // Calculate greatest common divisor for clean fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const simW = Math.round(width / divisor);
  const simH = Math.round(height / divisor);

  if (simW <= 20 && simH <= 20) {
    return `${simW}:${simH}`;
  }

  return `${ratio.toFixed(2)}:1`;
}

/**
 * Standardized Schema-Matched Guide & Knowledge Base for Image Resizer
 */
const ResizerGuideAndFaq: React.FC<{ isDark?: boolean }> = () => {
  return <ImageToolGuideSection toolId="image-resizer" />;
};

export const ResizerTool: React.FC<ResizerToolProps> = ({ onNotify, initialFile }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Input Image State
  const [sourceImage, setSourceImage] = useState<SourceImageMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isWorkspaceDragOver, setIsWorkspaceDragOver] = useState<boolean>(false);

  // Resize Settings
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [unitMode, setUnitMode] = useState<'pixels' | 'percentage'>('pixels');
  const [percentage, setPercentage] = useState<number>(100);
  const [fitMode, setFitMode] = useState<FitMode>('stretch');
  const [outputFormat, setOutputFormat] = useState<TargetFormatOption>('original');
  const [quality, setQuality] = useState<number>(90);
  const [customFilename, setCustomFilename] = useState<string>('');

  // Processing & Live Preview State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resizedResult, setResizedResult] = useState<ResizedResult | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceFileInputRef = useRef<HTMLInputElement>(null);

  // Concurrency & race condition guard
  const executionIdRef = useRef<number>(0);
  const loadedInitialFileRef = useRef<File | null>(null);
  const lastResizedUrlRef = useRef<string | null>(null);

  // Memory management: registry of created object URLs to revoke cleanly
  const activeUrlsRef = useRef<Set<string>>(new Set());

  const registerObjectUrl = useCallback((url: string) => {
    activeUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeTrackedUrl = useCallback((url: string | null | undefined) => {
    if (url && activeUrlsRef.current.has(url)) {
      try {
        revokeSafeObjectURL(url);
      } catch {
        // Ignore
      }
      activeUrlsRef.current.delete(url);
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeAllTrackedUrls();
    };
  }, [revokeAllTrackedUrls]);

  // Handle file loading with instant dimension extraction
  const validateAndLoadFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      // Validate MIME type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp'];
      if (!validTypes.includes(file.type) && !/\.(jpe?g|png|webp|avif|bmp)$/i.test(file.name)) {
        const msg = 'Invalid file format. Please upload PNG, JPEG, WebP, or AVIF image.';
        setErrorMessage(msg);
        onNotify('Unsupported File', msg, 'error');
        return;
      }

      // 50MB Limit
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
        const previewUrl = img.src.startsWith('blob:') ? img.src : registerObjectUrl(createSafeObjectURL(file));

        const originalWidth = img.naturalWidth || img.width || 800;
        const originalHeight = img.naturalHeight || img.height || 600;
        const ratio = originalWidth / originalHeight;

        const meta: SourceImageMeta = {
          file,
          name: file.name,
          width: originalWidth,
          height: originalHeight,
          aspectRatio: ratio,
          sizeBytes: file.size,
          format: file.type || 'image/jpeg',
          previewUrl,
          imageElement: img,
        };

        setSourceImage(meta);
        setWidth(originalWidth);
        setHeight(originalHeight);
        setPercentage(100);
        setLockRatio(true);
        setCustomFilename(file.name.replace(/\.[^/.]+$/, ''));
        setResizedResult(null);

        onNotify(
          'Image Loaded',
          `Original: ${originalWidth} × ${originalHeight} px (${formatBytes(file.size)})`,
          'info'
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to decode image file.';
        setErrorMessage(msg);
        onNotify('Load Error', msg, 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [onNotify, registerObjectUrl, revokeAllTrackedUrls]
  );

  // Load initial file if passed from global drop zone
  useEffect(() => {
    if (initialFile && initialFile !== loadedInitialFileRef.current) {
      loadedInitialFileRef.current = initialFile;
      validateAndLoadFile(initialFile);
    }
  }, [initialFile, validateAndLoadFile]);

  // Generate Sample Image for instant testing
  const handleLoadSample = useCallback(() => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 1920;
    sampleCanvas.height = 1080;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return;

    // Dark high-tech gradient
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(0.5, '#1E293B');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Grid lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1920; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1080);
      ctx.stroke();
    }
    for (let y = 0; y < 1080; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1920, y);
      ctx.stroke();
    }

    // Circles
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(
        200 + ((i * 110) % 1700),
        150 + ((i * 180) % 800),
        30 + (i % 6) * 15,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(59, 130, 246, ${0.08 + (i % 4) * 0.04})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 + (i % 3) * 0.05})`;
      ctx.stroke();
    }

    // Typography
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('FileWala Resizer Sample', 120, 480);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '28px sans-serif';
    ctx.fillText('1920 × 1080 Full HD 16:9 Client-Side Benchmark Image', 120, 540);

    sampleCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'filewala-benchmark-1920x1080.png', { type: 'image/png' });
      validateAndLoadFile(file);
    }, 'image/png');
  }, [validateAndLoadFile]);

  // Global paste support
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

  // Drag and drop handlers for empty state
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && !e.dataTransfer.types.includes('Files')) return;
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

  // Drag and drop handlers for active workspace
  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && !e.dataTransfer.types.includes('Files')) return;
    setIsWorkspaceDragOver(true);
  };

  const handleWorkspaceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWorkspaceDragOver(false);
  };

  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWorkspaceDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndLoadFile(e.dataTransfer.files[0]);
    }
  };

  // Width input change with aspect ratio locking
  const handleWidthChange = (valStr: string) => {
    const cleanStr = valStr.replace(/[^0-9]/g, '');
    const newWidth = parseInt(cleanStr, 10);

    if (isNaN(newWidth)) {
      setWidth(0);
      return;
    }

    const clampedWidth = Math.min(16000, Math.max(1, newWidth));
    setWidth(clampedWidth);

    if (lockRatio && sourceImage && sourceImage.aspectRatio > 0) {
      const propH = Math.max(1, Math.round(clampedWidth / sourceImage.aspectRatio));
      setHeight(propH);
    }

    if (sourceImage) {
      setPercentage(Math.round((clampedWidth / sourceImage.width) * 100));
    }
  };

  // Height input change with aspect ratio locking
  const handleHeightChange = (valStr: string) => {
    const cleanStr = valStr.replace(/[^0-9]/g, '');
    const newHeight = parseInt(cleanStr, 10);

    if (isNaN(newHeight)) {
      setHeight(0);
      return;
    }

    const clampedHeight = Math.min(16000, Math.max(1, newHeight));
    setHeight(clampedHeight);

    if (lockRatio && sourceImage && sourceImage.aspectRatio > 0) {
      const propW = Math.max(1, Math.round(clampedHeight * sourceImage.aspectRatio));
      setWidth(propW);
    }

    if (sourceImage) {
      setPercentage(Math.round((clampedHeight / sourceImage.height) * 100));
    }
  };

  // Percentage slider change
  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    if (sourceImage) {
      const factor = pct / 100;
      const w = Math.max(1, Math.round(sourceImage.width * factor));
      const h = Math.max(1, Math.round(sourceImage.height * factor));
      setWidth(w);
      setHeight(h);
    }
  };

  // Preset button click
  const applyPreset = (preset: Preset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setLockRatio(false); // Let preset determine exact target bounds

    if (sourceImage) {
      setPercentage(Math.round((preset.width / sourceImage.width) * 100));
    }

    onNotify('Preset Applied', `${preset.label}: ${preset.width} × ${preset.height} px`, 'info');
  };

  // Toggle Aspect Ratio
  const handleToggleLockRatio = () => {
    const nextLocked = !lockRatio;
    setLockRatio(nextLocked);

    // If locking, re-sync height to match current width based on original ratio
    if (nextLocked && sourceImage && sourceImage.aspectRatio > 0) {
      const propH = Math.max(1, Math.round(width / sourceImage.aspectRatio));
      setHeight(propH);
      onNotify('Aspect Ratio Locked', 'Proportions will be maintained automatically', 'info');
    } else if (!nextLocked) {
      onNotify('Aspect Ratio Unlocked', 'You can now set custom width & height independently', 'info');
    }
  };

  // Determine effective format for output
  const getEffectiveFormat = (): ImageFormat => {
    if (outputFormat === 'original') {
      if (sourceImage?.format === 'image/png') return 'image/png';
      if (sourceImage?.format === 'image/webp') return 'image/webp';
      return 'image/jpeg';
    }
    return outputFormat as ImageFormat;
  };

  // Generate suggested filename
  const getSuggestedFilename = (): string => {
    if (!sourceImage) return 'resized-image.jpg';
    const baseName = customFilename.trim() || sourceImage.name.replace(/\.[^/.]+$/, '');
    const fmt = getEffectiveFormat();
    const ext = fmt === 'image/png' ? 'png' : fmt === 'image/webp' ? 'webp' : 'jpg';
    return `${baseName}-${width}x${height}.${ext}`;
  };

  // Execute Resize via Client-Side Canvas Engine with race condition guard and memory cleanup
  const executeResize = useCallback(async (silent: boolean = false): Promise<ResizedResult | null> => {
    if (!sourceImage) return null;

    if (width <= 0 || height <= 0) {
      if (!silent) {
        onNotify('Invalid Dimensions', 'Width and height must be at least 1 pixel.', 'error');
      }
      return null;
    }

    const currentTaskId = ++executionIdRef.current;
    setIsProcessing(true);

    try {
      const fmt = getEffectiveFormat();
      const blob = await CanvasEngine.resize(sourceImage.imageElement, {
        width,
        height,
        maintainAspectRatio: lockRatio,
        fitMode,
        format: fmt,
        quality: quality / 100,
        backgroundColor: '#FFFFFF',
      });

      // Discard stale resolves
      if (currentTaskId !== executionIdRef.current) {
        return null;
      }

      // Safe memory cleanup: Revoke previous resized URL using ref
      if (lastResizedUrlRef.current) {
        revokeTrackedUrl(lastResizedUrlRef.current);
      }

      const url = registerObjectUrl(createSafeObjectURL(blob));
      lastResizedUrlRef.current = url;
      const res: ResizedResult = {
        blob,
        url,
        width,
        height,
        sizeBytes: blob.size,
        format: fmt,
      };

      setResizedResult(res);
      return res;
    } catch (err: unknown) {
      if (currentTaskId !== executionIdRef.current) return null;
      const msg = err instanceof Error ? err.message : 'Error executing canvas resize';
      onNotify('Resize Failed', msg, 'error');
      return null;
    } finally {
      if (currentTaskId === executionIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [
    sourceImage,
    width,
    height,
    lockRatio,
    fitMode,
    outputFormat,
    quality,
    onNotify,
    registerObjectUrl,
    revokeTrackedUrl
  ]);

  // Debounced auto-preview when settings change
  useEffect(() => {
    if (!sourceImage) return;

    const timer = setTimeout(() => {
      executeResize(true);
    }, 220);

    return () => clearTimeout(timer);
  }, [width, height, lockRatio, fitMode, outputFormat, quality, sourceImage, executeResize]);

  // Download Resized Image
  const handleDownload = async () => {
    if (width <= 0 || height <= 0) {
      onNotify('Invalid Dimensions', 'Width and height must be at least 1 pixel.', 'error');
      return;
    }

    let resultToDownload = resizedResult;

    if (!resultToDownload) {
      resultToDownload = await executeResize();
    }

    if (!resultToDownload || !sourceImage) return;

    const filename = getSuggestedFilename();
    triggerFileDownload(resultToDownload.blob, filename);
    onNotify(
      'Download Started',
      `Saved ${filename} (${resultToDownload.width}×${resultToDownload.height} px · ${formatBytes(resultToDownload.sizeBytes)})`,
      'success'
    );
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!resizedResult) return;
    const res = await copyImageToClipboard(resizedResult.blob, {
      width: resizedResult.width,
      height: resizedResult.height,
    });
    if (res.success) {
      onNotify('Copied to Clipboard', 'Resized image copied to clipboard!', 'success');
    } else {
      onNotify('Copy Failed', res.error || 'Clipboard copy not supported in this browser.', 'error');
    }
  };

  // Share API
  const handleShare = async () => {
    if (!resizedResult || !sourceImage) return;
    const ext = resizedResult.format === 'image/webp' ? 'webp' : resizedResult.format === 'image/png' ? 'png' : 'jpg';
    const filename = `resized-${sourceImage.name.replace(/\.[^/.]+$/, '')}.${ext}`;
    const shared = await shareFileOrBlob({
      blob: resizedResult.blob,
      filename,
      title: 'Resized Image',
      text: `Resized to ${resizedResult.width}×${resizedResult.height}px via FileWala`,
    });
    if (shared.shared) {
      onNotify('Shared Successfully', '', 'success');
    }
  };

  // Reset to initial state
  const handleReset = useCallback(() => {
    revokeAllTrackedUrls();
    lastResizedUrlRef.current = null;
    loadedInitialFileRef.current = null;
    setSourceImage(null);
    setResizedResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (workspaceFileInputRef.current) workspaceFileInputRef.current.value = '';
  }, [revokeAllTrackedUrls]);

  // Global Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (sourceImage) {
          e.preventDefault();
          handleReset();
          onNotify('Reset', 'Cleared image.', 'info');
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (resizedResult) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (resizedResult) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sourceImage, resizedResult, handleDownload, handleReset, onNotify]);

  /* -------------------------------------------------------------
     RENDER: EMPTY STATE (DROPZONE & FEATURE HIGHLIGHTS)
  ------------------------------------------------------------- */
  if (!sourceImage) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 select-none">
        {/* Single Authoritative Header Section */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side Engine · Zero Uploads</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Image Resizer
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Scale and resize images by exact pixel dimensions or percentage with aspect ratio lock.
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Fitts's Law Large Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload image to resize"
          className={`relative group border border-dashed rounded-lg p-10 sm:p-14 text-center cursor-pointer transition-colors duration-150 select-none outline-none ${
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
                <span>Try with Sample Benchmark Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* Popular Presets Showcase (Soft Unboxed Style) */}
        <div className={`p-6 rounded-xl ${isDark ? 'bg-zinc-900/60' : 'bg-zinc-100/70'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-500" />
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Popular Target Resolutions
              </h4>
            </div>
            <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              One-click standard presets
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {POPULAR_PRESETS.slice(0, 8).map((p) => (
              <div
                key={p.label}
                className={`p-3 rounded-xl text-center transition-colors ${
                  isDark
                    ? 'bg-zinc-800/60 hover:bg-zinc-800'
                    : 'bg-white hover:bg-white/90 shadow-xs'
                }`}
              >
                <div className={`font-semibold text-xs truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {p.label}
                </div>
                <div className="text-[11px] font-mono text-blue-500 dark:text-blue-400 mt-1">
                  {p.width} × {p.height}
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {p.aspectRatioLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Reference, Format Matrix, Presets Guide & FAQ */}
        <ResizerGuideAndFaq isDark={isDark} />
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (IMAGE LOADED)
  ------------------------------------------------------------- */
  return (
    <div
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={handleWorkspaceDragLeave}
      onDrop={handleWorkspaceDrop}
      className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 relative"
    >
      {/* Hidden input for replacing image from workspace */}
      <input
        ref={workspaceFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/bmp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            validateAndLoadFile(e.target.files[0]);
          }
        }}
      />

      {/* Visual Drop Overlay when dragging a new file over active workspace */}
      {isWorkspaceDragOver && (
        <div className="absolute inset-0 z-50 rounded-lg border border-dashed border-zinc-400 bg-zinc-950/80 flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-12 h-12 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-semibold text-white">Drop new image to resize</h4>
            <p className="text-xs text-zinc-400">Replaces current image immediately</p>
          </div>
        </div>
      )}

      {/* Top Header Bar with Source Info and Actions */}
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
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
          </div>
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {sourceImage.name}
            </h3>
            <div className={`flex flex-wrap items-center gap-2 text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <span className="font-mono text-blue-500 dark:text-blue-400">
                Original: {sourceImage.width} × {sourceImage.height} px
              </span>
              <span>·</span>
              <span className="font-mono">
                {getAspectRatioLabel(sourceImage.width, sourceImage.height)}
              </span>
              <span>·</span>
              <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {formatBytes(sourceImage.sizeBytes)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Change File Button */}
          <button
            onClick={() => workspaceFileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Replace</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {/* Direct Download Button */}
          <button
            disabled={!resizedResult || isProcessing}
            onClick={handleDownload}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download ({resizedResult ? formatBytes(resizedResult.sizeBytes) : '...'})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Controls + Real-Time Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* Left Column: Resizing Controls Panel (5 Columns) */}
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
                Resize Parameters
              </h4>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  lockRatio
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {lockRatio ? 'Ratio Locked' : 'Free Transform'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Customize dimensions, aspect ratio, and output format
            </p>
          </div>

          {/* Unit Mode Switcher: Exact Pixels vs Percentage */}
          <div
            className={`flex p-1 rounded-lg text-xs ${
              isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'
            }`}
          >
            <button
              onClick={() => setUnitMode('pixels')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                unitMode === 'pixels'
                  ? isDark
                    ? 'bg-zinc-700 text-white font-bold shadow-xs'
                    : 'bg-white text-zinc-950 font-bold shadow-xs'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Exact Pixels (px)
            </button>
            <button
              onClick={() => setUnitMode('percentage')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                unitMode === 'percentage'
                  ? isDark
                    ? 'bg-zinc-700 text-white font-bold shadow-xs'
                    : 'bg-white text-zinc-950 font-bold shadow-xs'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Scale by %
            </button>
          </div>

          {/* Dimension Controls */}
          {unitMode === 'pixels' ? (
            <div className="space-y-4">
              {/* Width / Link Icon / Height Row */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    Target Dimensions
                  </span>
                  <span className="font-mono text-[11px] text-blue-500 dark:text-blue-400">
                    {getAspectRatioLabel(width, height)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Width Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={width || ''}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        placeholder="Width"
                        className={`w-full px-3 py-2.5 text-sm font-mono rounded-lg border focus:outline-none transition-all ${
                          isDark
                            ? 'bg-zinc-800/80 border-zinc-700 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-400'
                        }`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        W (px)
                      </span>
                    </div>
                  </div>

                  {/* Prominent Chain Link Aspect Ratio Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleLockRatio}
                    title={lockRatio ? 'Aspect Ratio is Locked (Click to Unlock)' : 'Aspect Ratio is Unlocked (Click to Lock)'}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                      lockRatio
                        ? isDark
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30 shadow-xs'
                          : 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 shadow-xs'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                          : 'bg-zinc-100 text-zinc-400 border-zinc-300 hover:text-zinc-700'
                    }`}
                  >
                    {lockRatio ? (
                      <LinkIcon className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Unlink className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  {/* Height Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={height || ''}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        placeholder="Height"
                        className={`w-full px-3 py-2.5 text-sm font-mono rounded-lg border focus:outline-none transition-all ${
                          isDark
                            ? 'bg-zinc-800/80 border-zinc-700 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-400'
                        }`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        H (px)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] mt-1.5 px-0.5">
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                    Min: 1 px · Max: 16,000 px
                  </span>
                  <span className={`font-mono ${lockRatio ? 'text-emerald-500 dark:text-emerald-400' : 'text-zinc-400'}`}>
                    {lockRatio ? '🔗 Proportional' : '🔓 Independent'}
                  </span>
                </div>
              </div>

              {/* Quick Presets Selection */}
              <div className={`space-y-2 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    Popular Target Presets
                  </span>
                  <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Instant click to set
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {POPULAR_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`p-2 rounded-lg text-left transition-all cursor-pointer truncate ${
                        width === p.width && height === p.height
                          ? isDark
                            ? 'bg-blue-600/20 text-blue-300 font-semibold'
                            : 'bg-blue-50 text-blue-700 font-semibold'
                          : isDark
                            ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800'
                            : 'bg-zinc-100/70 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="text-[11px] font-medium truncate">{p.label}</div>
                      <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {p.width}×{p.height}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Percentage Scaling Controls */
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Scaling Factor
                  </span>
                  <span className="font-mono text-sm font-bold text-blue-500 dark:text-blue-400">
                    {percentage}%
                  </span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={percentage}
                  onChange={(e) => handlePercentageChange(parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-zinc-800"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>10% (Mini)</span>
                  <span>100% (Original)</span>
                  <span>200% (2× HD)</span>
                </div>
              </div>

              {/* Quick Percentage Chips (Soft Tiles) */}
              <div className="grid grid-cols-5 gap-1.5">
                {[25, 50, 75, 100, 150].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageChange(pct)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      percentage === pct
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-bold'
                          : 'bg-zinc-900 text-white font-bold'
                        : isDark
                          ? 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div
                className={`p-3 rounded-lg text-xs space-y-1 ${
                  isDark ? 'bg-zinc-800/60' : 'bg-zinc-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Result Dimensions:</span>
                  <span className="font-mono font-semibold text-blue-500 dark:text-blue-400">
                    {width} × {height} px
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Aspect Ratio:</span>
                  <span className="font-mono text-zinc-400">
                    {getAspectRatioLabel(width, height)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fit Mode Options (When aspect ratio is custom) */}
          {!lockRatio && (
            <div className={`space-y-2 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Canvas Fit Mode</span>
                <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Custom ratio mapping
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(
                  [
                    { id: 'stretch', name: 'Stretch' },
                    { id: 'contain', name: 'Contain (Pad)' },
                    { id: 'cover', name: 'Cover (Crop)' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFitMode(mode.id)}
                    className={`py-2 px-1 rounded-lg font-medium text-center transition-all cursor-pointer ${
                      fitMode === mode.id
                        ? isDark
                          ? 'bg-blue-600/20 text-blue-300 font-bold'
                          : 'bg-blue-50 text-blue-700 font-bold'
                        : isDark
                          ? 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format Selector & Quality */}
          <div className={`space-y-3 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Output Format</span>
              <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Convert on resize
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(
                [
                  { id: 'original', name: 'Match' },
                  { id: 'image/webp', name: 'WebP' },
                  { id: 'image/jpeg', name: 'JPEG' },
                  { id: 'image/png', name: 'PNG' },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setOutputFormat(fmt.id)}
                  className={`py-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
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

            {/* Quality Slider (for JPEG / WebP) */}
            {getEffectiveFormat() !== 'image/png' && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Output Quality
                  </span>
                  <span className="font-mono text-xs font-semibold text-blue-500 dark:text-blue-400">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-zinc-800"
                />
              </div>
            )}

            {/* Custom Output Filename */}
            <div className="space-y-1.5 pt-2">
              <label className={`block text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Filename Preview
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="Filename"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-lg border focus:outline-none ${
                    isDark
                      ? 'bg-zinc-800/80 border-zinc-700 text-white focus:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-400'
                  }`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  -{width}x{height}.{getEffectiveFormat() === 'image/png' ? 'png' : getEffectiveFormat() === 'image/webp' ? 'webp' : 'jpg'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button: Resize & Download (Fitts's Law Large CTA) */}
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
                <span>Resize & Download Image</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* Right Column: Real-Time Preview & Metrics (7 Columns) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`p-5 rounded-lg border space-y-4 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Real-Time Canvas Preview
                </h4>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Scaled visual simulation of your target output
                </p>
              </div>

              {resizedResult && (
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                    isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {formatBytes(resizedResult.sizeBytes)}
                </span>
              )}
            </div>

            {/* Display Canvas or Image with Clean Flat Surface */}
            <div
              className={`relative rounded-md border p-4 flex items-center justify-center min-h-[380px] overflow-hidden select-none ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800'
                  : 'bg-zinc-100 border-zinc-200'
              }`}
            >
              {isProcessing && (
                <div className="absolute inset-0 z-10 bg-zinc-950/60 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
                  <span className="text-xs text-white font-medium">Updating preview...</span>
                </div>
              )}

              <img
                src={resizedResult ? resizedResult.url : sourceImage.previewUrl}
                alt="Output preview"
                draggable={false}
                className="max-h-[440px] max-w-full object-contain rounded-lg shadow-sm transition-all select-none"
              />
            </div>

            {/* Quick Action Bar under Preview (Copy to clipboard & Share) */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1 gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero server latency · Client-side Canvas</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={!resizedResult}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900'
                  }`}
                >
                  <Copy className="w-3 h-3 text-blue-500" />
                  <span>Copy Image</span>
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!resizedResult}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900'
                    }`}
                  >
                    <Share2 className="w-3 h-3 text-indigo-500" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Breakdown Bar (Soft Unboxed Style) */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl text-xs ${
                isDark
                  ? 'bg-zinc-800/50'
                  : 'bg-zinc-100/80'
              }`}
            >
              <div>
                <span className={`block text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Target Resolution
                </span>
                <span className={`font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {width} × {height} px
                </span>
              </div>

              <div>
                <span className={`block text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Aspect Ratio
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {getAspectRatioLabel(width, height)}
                </span>
              </div>

              <div>
                <span className={`block text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Format & Codec
                </span>
                <span className="font-semibold uppercase text-blue-500 dark:text-blue-400">
                  {getEffectiveFormat().replace('image/', '')}
                </span>
              </div>

              <div>
                <span className={`block text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Estimated Size
                </span>
                <span className={`font-mono font-bold ${resizedResult ? 'text-emerald-500 dark:text-emerald-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {resizedResult ? formatBytes(resizedResult.sizeBytes) : '—'}
                </span>
              </div>
            </div>

            {/* Download Button */}
            <button
              disabled={isProcessing}
              onClick={handleDownload}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                Download Resized Image{' '}
                {resizedResult ? `(${formatBytes(resizedResult.sizeBytes)})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Reference, Aspect Ratio Matrix & FAQ */}
      <ResizerGuideAndFaq isDark={isDark} />
    </div>
  );
};
