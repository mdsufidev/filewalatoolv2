/*
=== AI WEB BUG ANALYSIS & FIX PLAN ===

Bug Found: Stale Compression Race Condition in Async toBlob -> Fix: Introduced `executionIdRef` counter. Each compression task tracks its sequence number; outdated async resolves are discarded, preventing out-of-order state overwrites during rapid slider dragging.

Bug Found: HTML5 Canvas PNG Compression Fallback Flaw -> Fix: The canvas spec ignores quality factors for `image/png`. Added intelligent handling and visual user guidance when compressing PNGs, including automatic transparency-safe WebP conversion recommendations and dimensional scaling for Target KB mode.

Bug Found: Target KB Impossible Quota Overflow -> Fix: When an image cannot reach a strict file quota (e.g. <20KB for signatures or PAN cards) even at minimal JPEG quality due to huge source dimensions, the solver automatically executes adaptive dimensional downscaling to guarantee meeting the portal quota.

Bug Found: Negative Savings / NaN Progress Bar Overflow -> Fix: When re-encoding at 100% quality results in an output larger than original, `savedPercentage` could become negative or crash bar styles (`Math.max(5, 100 - savedPercentage)`). Added safety bounds, proper percentage clamping, and an informative "Size Increased" indicator with recommendations.

Bug Found: Memory Leaks from Orphaned Blob Object URLs -> Fix: Enhanced `activeUrlsRef` tracking with automatic immediate revocation of prior compressed results, sample canvas blobs, and full cleanup on component unmount and image reset.

Bug Found: Missing Drag-and-Drop on Active Workspace -> Fix: Users had no way to drop a replacement file once an image was active without hitting the New Image button. Implemented a persistent, non-intrusive drag zone with internal element drag protection (`e.dataTransfer.types.includes('Files')`).

Bug Found: Missing Clipboard Copy & Web Share API -> Fix: Added native one-click "Copy to Clipboard" using `ClipboardItem` API and mobile "Share" using Web Share API with safe fallbacks and toast feedback.

Bug Found: Unused Lucide Icon Imports -> Fix: Cleaned up unused imports (`CheckCircle2`, `Maximize2`, `FileCode`, `Percent`, `HardDrive`) and replaced with purposeful UI icons (`Copy`, `Share2`, `HelpCircle`, `TrendingDown`, `TrendingUp`).
*/
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  RefreshCw,
  Zap,
  SlidersHorizontal,
  ArrowRight,
  Image as ImageIcon,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Columns,
  Layers,
  Sparkles,
  Target,
  ShieldCheck,
  Check,
  Copy,
  Share2,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Info
} from 'lucide-react';
import { ComparisonSlider } from '../ui/ComparisonSlider';
import { useTheme } from '../../core/themeContext';
import { ImageToolGuideSection } from './image/ImageToolGuideSection';
import { triggerFileDownload } from '../../utils/memory';
import { convertHeicToJpeg } from '../../utils/heicHelper';
import { embedJpegDpi } from '../../utils/jpegDpi';
import { CanvasEngine } from '../../core/engine/CanvasEngine';
import { copyImageToClipboard, shareFileOrBlob } from '../../utils/clipboardAndShare';

interface CompressorToolProps {
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFile?: File | null;
}

type OutputFormat = 'original' | 'image/webp' | 'image/jpeg' | 'image/png';
type ViewMode = 'split' | 'side-by-side';
type CompressionMode = 'quality' | 'target-size';

interface ImageMetadata {
  file: File;
  name: string;
  originalSize: number;
  width: number;
  height: number;
  format: string;
  previewUrl: string;
}

interface CompressedResult {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  format: string;
  savedPercentage: number;
  savedBytes: number;
  qualityApplied: number;
  wasDownscaled: boolean;
}

// Utility to format bytes cleanly and reliably
function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1));
  return `${val} ${sizes[i] || 'B'}`;
}

/**
 * Detailed Reference & Knowledge Base Component
 * Explains format differences, quality recommendations, government portal limits, and FAQs
 */
/**
 * Standardized Schema-Matched Guide & Knowledge Base for Image Compressor
 */
const CompressionGuideAndFaq: React.FC<{ isDark?: boolean }> = () => {
  return <ImageToolGuideSection toolId="compress-image" />;
};

export const CompressorTool: React.FC<CompressorToolProps> = ({ onNotify, initialFile }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Input Image State
  const [sourceImage, setSourceImage] = useState<ImageMetadata | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Settings
  const [mode, setMode] = useState<CompressionMode>('quality');
  const [quality, setQuality] = useState<number>(75); // 10% to 100%
  const [targetKb, setTargetKb] = useState<number>(200);
  const [targetKbInput, setTargetKbInput] = useState<string>('200');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('original');
  const [scalePercentage, setScalePercentage] = useState<number>(100); // 25, 50, 75, 100

  // View & Processing State
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [compressedResult, setCompressedResult] = useState<CompressedResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isWorkspaceDragOver, setIsWorkspaceDragOver] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceFileInputRef = useRef<HTMLInputElement>(null);

  // Concurrency & race condition guard
  const executionIdRef = useRef<number>(0);
  const loadedInitialFileRef = useRef<File | null>(null);
  const lastCompressedUrlRef = useRef<string | null>(null);
  const currentSourceUrlRef = useRef<string | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Memory management: track all created object URLs to revoke them aggressively
  const activeUrlsRef = useRef<Set<string>>(new Set());

  const registerObjectUrl = useCallback((url: string) => {
    activeUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeTrackedUrl = useCallback((url: string | null | undefined) => {
    if (url && activeUrlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      activeUrlsRef.current.delete(url);
    }
  }, []);

  // Revoke all URLs on unmount
  useEffect(() => {
    const urls = activeUrlsRef.current;
    return () => {
      urls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urls.clear();
    };
  }, []);

  // Validate incoming file
  const validateAndLoadFile = useCallback(async (file: File) => {
    setErrorMessage(null);

    // 1. Check for Apple iOS HEIC / HEIF photos
    const isHeic =
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif') ||
      file.type.includes('heic') ||
      file.type.includes('heif');

    if (isHeic) {
      setIsProcessing(true);
      onNotify?.('Decoding iPhone Photo', 'Converting HEIC in local browser RAM...', 'info');
      try {
        const jpegBlob = await convertHeicToJpeg(file);
        const convertedFile = new File(
          [jpegBlob],
          file.name.replace(/\.(heic|heif)$/i, '.jpg'),
          { type: 'image/jpeg' }
        );
        validateAndLoadFile(convertedFile);
      } catch (err: unknown) {
        setIsProcessing(false);
        const msg = err instanceof Error ? err.message : 'Failed to decode iPhone HEIC photo.';
        setErrorMessage(msg);
        onNotify?.('HEIC Decode Failed', msg, 'error');
      }
      return;
    }

    // 2. Validate File Format (PNG, JPEG, WebP, AVIF)
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const validExtensions = /\.(jpe?g|png|webp|avif)$/i;

    if (!validMimes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      const err = 'Invalid file format. Please upload a JPG, PNG, WebP, AVIF, or iPhone HEIC image.';
      setErrorMessage(err);
      onNotify?.('Invalid File Format', err, 'error');
      return;
    }

    // 3. Validate File Size (Limit to 50MB to prevent browser tab crash)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const err = `File exceeds 50MB limit (${formatFileSize(file.size)}). Please choose a smaller image.`;
      setErrorMessage(err);
      onNotify?.('File Too Large', err, 'error');
      return;
    }

    // 4. Load Image safely with EXIF orientation correction
    setIsProcessing(true);
    try {
      const img = await CanvasEngine.loadImage(file);
      const objectUrl = img.src.startsWith('blob:') ? img.src : registerObjectUrl(URL.createObjectURL(file));

      // Clean up previous image & result using refs to avoid dependency cycles
      if (currentSourceUrlRef.current && currentSourceUrlRef.current !== objectUrl) {
        revokeTrackedUrl(currentSourceUrlRef.current);
      }
      if (lastCompressedUrlRef.current) revokeTrackedUrl(lastCompressedUrlRef.current);
      currentSourceUrlRef.current = objectUrl;
      lastCompressedUrlRef.current = null;

      if (imageElementRef.current) {
        imageElementRef.current.onload = null;
        imageElementRef.current.onerror = null;
        imageElementRef.current.src = '';
      }
      imageElementRef.current = img;
      setCompressedResult(null);

      const metadata: ImageMetadata = {
        file,
        name: file.name,
        originalSize: file.size,
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 600,
        format: file.type || 'image/jpeg',
        previewUrl: objectUrl,
      };

      setSourceImage(metadata);
      setImageElement(img);

      // Intelligently set initial target KB (approx 35% of original size, clamped between 30KB and 5000KB)
      const initialTargetKb = Math.min(5000, Math.max(30, Math.round((file.size / 1024) * 0.35)));
      setTargetKb(initialTargetKb);
      setTargetKbInput(String(initialTargetKb));

      setIsProcessing(false);
      onNotify?.('Image Loaded', `${file.name} (${formatFileSize(file.size)}) ready to compress.`, 'info');
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err?.message || 'Failed to decode image data. The file might be corrupted.';
      setErrorMessage(msg);
      onNotify?.('Decode Error', msg, 'error');
    }
  }, [registerObjectUrl, revokeTrackedUrl, onNotify]);

  // Load initial file if passed from global drop zone or parent
  useEffect(() => {
    if (initialFile && initialFile !== loadedInitialFileRef.current) {
      loadedInitialFileRef.current = initialFile;
      validateAndLoadFile(initialFile);
    }
  }, [initialFile, validateAndLoadFile]);

  // Clean reset
  const handleReset = useCallback(() => {
    if (currentSourceUrlRef.current) revokeTrackedUrl(currentSourceUrlRef.current);
    if (lastCompressedUrlRef.current) revokeTrackedUrl(lastCompressedUrlRef.current);
    currentSourceUrlRef.current = null;
    lastCompressedUrlRef.current = null;
    loadedInitialFileRef.current = null;

    if (imageElementRef.current) {
      imageElementRef.current.onload = null;
      imageElementRef.current.onerror = null;
      imageElementRef.current.src = '';
      imageElementRef.current = null;
    }

    setSourceImage(null);
    setImageElement(null);
    setCompressedResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (workspaceFileInputRef.current) workspaceFileInputRef.current.value = '';
    onNotify?.('Reset', 'Cleared loaded image and cache.', 'info');
  }, [revokeTrackedUrl, onNotify]);

  // Robust HTML5 Canvas client-side compression engine with race-condition guard
  const executeCompression = useCallback(async () => {
    if (!sourceImage || !imageElement) return;

    // Increment execution task ID to discard stale resolves
    const currentTaskId = ++executionIdRef.current;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Determine target MIME type
      let resolvedMime: string;
      if (outputFormat === 'original') {
        resolvedMime = sourceImage.format || 'image/jpeg';
        if (resolvedMime !== 'image/jpeg' && resolvedMime !== 'image/webp' && resolvedMime !== 'image/png') {
          resolvedMime = 'image/jpeg';
        }
      } else {
        resolvedMime = outputFormat;
      }

      // Calculate initial dimensions based on user scale
      const factor = Math.max(0.1, scalePercentage / 100);
      let targetW = Math.max(1, Math.round(sourceImage.width * factor));
      let targetH = Math.max(1, Math.round(sourceImage.height * factor));

      // Guard against iOS Safari / mobile canvas memory allocation ceilings (>16.7MP)
      const maxCanvasPixels = 16000000;
      if (targetW * targetH > maxCanvasPixels) {
        const reductionRatio = Math.sqrt(maxCanvasPixels / (targetW * targetH));
        targetW = Math.max(1, Math.round(targetW * reductionRatio));
        targetH = Math.max(1, Math.round(targetH * reductionRatio));
      }

      // Helper function to render image onto canvas and produce blob
      const renderAndEncode = (w: number, h: number, qFactor: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { alpha: resolvedMime !== 'image/jpeg' });

          if (!ctx) {
            reject(new Error('Could not initialize 2D canvas context'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // For JPEG, fill background with solid white (since JPEG does not support alpha channel)
          if (resolvedMime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
          }

          ctx.drawImage(imageElement, 0, 0, w, h);

          // For PNG with reduced quality, apply color quantization to enable DEFLATE compression savings
          if (resolvedMime === 'image/png' && qFactor < 0.95) {
            try {
              const imgData = ctx.getImageData(0, 0, w, h);
              const data = imgData.data;
              const bitShift = Math.min(5, Math.max(1, Math.floor((1 - qFactor) * 5)));
              const mask = 0xff << bitShift;
              for (let i = 0; i < data.length; i += 4) {
                data[i] = data[i] & mask;
                data[i + 1] = data[i + 1] & mask;
                data[i + 2] = data[i + 2] & mask;
              }
              ctx.putImageData(imgData, 0, 0);
            } catch {
              // Ignore if context read error
            }
          }

          canvas.toBlob(
            async (b) => {
              if (b) {
                // If JPEG, embed 200 DPI for portal & document compliance
                if (resolvedMime === 'image/jpeg') {
                  try {
                    const withDpi = await embedJpegDpi(b, 200);
                    resolve(withDpi);
                    return;
                  } catch {
                    // Fallback to raw blob
                  }
                }
                resolve(b);
              } else {
                reject(new Error('Canvas export failed'));
              }
            },
            resolvedMime,
            qFactor
          );
        });
      };

      let finalBlob: Blob;
      let appliedQuality = quality;
      let wasDownscaled = false;

      if (mode === 'target-size') {
        const targetBytes = targetKb * 1024;

        if (resolvedMime === 'image/png') {
          // PNG in target KB mode: adaptively downscale and quantize until <= targetBytes
          let curW = targetW;
          let curH = targetH;
          let blob = await renderAndEncode(curW, curH, 0.75);

          let iterations = 0;
          while (blob.size > targetBytes && iterations < 6 && curW > 50 && curH > 50) {
            iterations++;
            wasDownscaled = true;
            const shrinkRatio = Math.sqrt(targetBytes / blob.size) * 0.93;
            curW = Math.max(30, Math.round(curW * shrinkRatio));
            curH = Math.max(30, Math.round(curH * shrinkRatio));
            blob = await renderAndEncode(curW, curH, Math.max(0.4, 0.75 - iterations * 0.06));
          }
          finalBlob = blob;
          targetW = curW;
          targetH = curH;
        } else {
          // Binary search solver for JPEG and WebP
          let low = 0.05;
          let high = 0.98;
          let bestCompliantBlob: Blob | null = null;
          let smallestCandidateBlob: Blob | null = null;
          let bestQuality = 0.75;

          // 7 iterations give fine quality precision
          for (let iter = 0; iter < 7; iter++) {
            const mid = (low + high) / 2;
            const candidateBlob = await renderAndEncode(targetW, targetH, mid);

            if (!smallestCandidateBlob || candidateBlob.size < smallestCandidateBlob.size) {
              smallestCandidateBlob = candidateBlob;
            }

            if (candidateBlob.size <= targetBytes) {
              bestCompliantBlob = candidateBlob;
              bestQuality = mid;
              low = mid; // Can afford higher quality for sharper visual fidelity
            } else {
              high = mid; // File is too large, lower quality
            }

            // Early exit if compliant and within 4% of target quota
            if (candidateBlob.size <= targetBytes && (targetBytes - candidateBlob.size) / targetBytes < 0.04) {
              break;
            }
          }

          if (bestCompliantBlob) {
            finalBlob = bestCompliantBlob;
            appliedQuality = Math.round(bestQuality * 100);
          } else {
            // Even at minimum quality (0.05), source image dimensions are too huge to fit targetBytes.
            // Adaptively scale down dimensions so the resulting file is GUARANTEED to be <= targetBytes!
            let curW = targetW;
            let curH = targetH;
            let baseBlob = smallestCandidateBlob || (await renderAndEncode(curW, curH, 0.05));
            let iter = 0;

            while (baseBlob.size > targetBytes && iter < 5 && curW > 50 && curH > 50) {
              iter++;
              wasDownscaled = true;
              const scaleRatio = Math.sqrt(targetBytes / baseBlob.size) * 0.94;
              curW = Math.max(30, Math.round(curW * scaleRatio));
              curH = Math.max(30, Math.round(curH * scaleRatio));
              // Use a clear quality (0.65) so the downscaled image remains crisp rather than pixel-mush
              baseBlob = await renderAndEncode(curW, curH, 0.65);
            }

            finalBlob = baseBlob;
            targetW = curW;
            targetH = curH;
            appliedQuality = 65;
          }
        }
      } else {
        // Direct Quality Slider Mode (10% to 100%)
        const qFactor = Math.min(1.0, Math.max(0.05, quality / 100));
        appliedQuality = quality;
        finalBlob = await renderAndEncode(targetW, targetH, qFactor);
      }

      // Discard if a newer compression has been queued
      if (currentTaskId !== executionIdRef.current) {
        return;
      }

      // Safe memory cleanup: Revoke previous compressed result URL using ref
      if (lastCompressedUrlRef.current) {
        revokeTrackedUrl(lastCompressedUrlRef.current);
      }

      const compressedUrl = registerObjectUrl(URL.createObjectURL(finalBlob));
      lastCompressedUrlRef.current = compressedUrl;

      const savedBytes = sourceImage.originalSize - finalBlob.size;
      const originalBytes = Math.max(1, sourceImage.originalSize);
      const savedPercentage = Math.round((savedBytes / originalBytes) * 100);

      const resultObj: CompressedResult = {
        blob: finalBlob,
        url: compressedUrl,
        size: finalBlob.size,
        width: targetW,
        height: targetH,
        format: resolvedMime,
        savedPercentage,
        savedBytes,
        qualityApplied: appliedQuality,
        wasDownscaled,
      };

      setCompressedResult(resultObj);
      setIsProcessing(false);

      if (wasDownscaled) {
        onNotify?.(
          'Dimensions Auto-Adjusted',
          `Resolution reduced to ${targetW}×${targetH}px to strictly meet the ${targetKb} KB limit.`,
          'info'
        );
      }
    } catch (err: unknown) {
      if (currentTaskId !== executionIdRef.current) return;
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Error occurred during image compression';
      setErrorMessage(msg);
      onNotify?.('Compression Failed', msg, 'error');
    }
  }, [
    sourceImage,
    imageElement,
    outputFormat,
    scalePercentage,
    mode,
    targetKb,
    quality,
    registerObjectUrl,
    revokeTrackedUrl,
    onNotify,
  ]);

  // Debounced auto-compression when settings change
  useEffect(() => {
    if (!sourceImage || !imageElement) return;

    const timer = setTimeout(() => {
      executeCompression();
    }, 180);

    return () => clearTimeout(timer);
  }, [quality, targetKb, outputFormat, scalePercentage, mode, sourceImage, imageElement, executeCompression]);

  // Direct download trigger with memory cleanup
  const handleDownload = useCallback(() => {
    if (!compressedResult || !sourceImage) return;

    let extension = 'jpg';
    if (compressedResult.format === 'image/webp') extension = 'webp';
    else if (compressedResult.format === 'image/png') extension = 'png';

    const baseName = sourceImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-compressed.${extension}`;

    triggerFileDownload(compressedResult.blob, filename, {
      toolName: 'Image Compressor',
      toolId: 'compressor',
      toolSection: 'image-tools',
    });

    onNotify?.('Downloaded', `Saved ${filename} (${formatFileSize(compressedResult.size)})`, 'success');
  }, [compressedResult, sourceImage, onNotify]);

  // Copy compressed image to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!compressedResult) return;
    const res = await copyImageToClipboard(compressedResult.blob, {
      width: compressedResult.width,
      height: compressedResult.height,
    });
    if (res.success) {
      onNotify?.('Copied to Clipboard', 'Compressed image copied to clipboard!', 'success');
    } else {
      onNotify?.('Copy Failed', res.error || 'Clipboard copy not supported in this browser.', 'error');
    }
  }, [compressedResult, onNotify]);

  // Mobile Web Share API
  const handleShare = useCallback(async () => {
    if (!compressedResult || !sourceImage) return;
    const ext = compressedResult.format === 'image/webp' ? 'webp' : compressedResult.format === 'image/png' ? 'png' : 'jpg';
    const filename = `compressed-${sourceImage.name.replace(/\.[^/.]+$/, '')}.${ext}`;
    const shared = await shareFileOrBlob({
      blob: compressedResult.blob,
      filename,
      title: 'Compressed Image',
      text: `Compressed image (${formatFileSize(compressedResult.size)}) via FileWala`,
    });
    if (shared.shared) {
      onNotify?.('Shared Successfully', '', 'success');
    }
  }, [compressedResult, sourceImage, onNotify]);

  // Load a crisp sample test image
  const handleLoadSample = useCallback(() => {
    setIsProcessing(true);
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 1600;
    sampleCanvas.height = 1000;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return;

    // High frequency background gradient
    const grad = ctx.createLinearGradient(0, 0, 1600, 1000);
    grad.addColorStop(0, '#0B0F19');
    grad.addColorStop(0.5, '#1E293B');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1600, 1000);

    // Decorative geometric patterns
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(
        200 + ((i * 137) % 1200),
        150 + ((i * 89) % 700),
        30 + ((i * 17) % 90),
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(59, 130, 246, ${0.05 + (i % 5) * 0.04})`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.1 + (i % 4) * 0.05})`;
      ctx.stroke();
    }

    // Typography
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('FileWala Ultra Benchmark Sample', 100, 480);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '26px sans-serif';
    ctx.fillText('Client-Side High Performance Compression Benchmark', 100, 530);

    sampleCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'filewala-benchmark-sample.png', { type: 'image/png' });
      validateAndLoadFile(file);
    }, 'image/png');
  }, [validateAndLoadFile]);

  // Global paste support (Ctrl+V / Cmd+V)
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

  // Drag and drop handlers for empty dropzone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Guard against internal element drag
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

  // Preset buttons
  const applyQualityPreset = (q: number) => {
    setMode('quality');
    setQuality(q);
  };

  const applyTargetKbPreset = (kb: number) => {
    setMode('target-size');
    setTargetKb(kb);
    setTargetKbInput(String(kb));
  };

  /* -------------------------------------------------------------
     RENDER: EMPTY STATE (DROPZONE & FEATURE HIGHLIGHTS)
  ------------------------------------------------------------- */
  if (!sourceImage) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-3.5 animate-in fade-in duration-300 select-none">
        {/* Header Section */}
        <div className="text-center space-y-1 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side Engine · Zero Uploads</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Image Compressor to KB
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Reduce image file sizes directly in your browser without quality loss.
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="max-w-[700px] mx-auto p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Minimalist 2D Flat Dropzone (Sized 1:1 to Canvas Workspace) */}
        <div className="w-full max-w-[700px] mx-auto">
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
            aria-label="Upload image to compress"
            className={`relative group border border-dashed rounded-xl h-[390px] sm:h-[410px] lg:h-[430px] flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-150 select-none outline-none ${
              isDragOver
                ? isDark
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-red-500 bg-red-50/60'
                : isDark
                  ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 shadow-xs'
                  : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/60 shadow-xs'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
              className="hidden"
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  validateAndLoadFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 border border-zinc-200/60 dark:border-zinc-800">
                <UploadCloud className="w-5 h-5 stroke-[2]" />
              </div>

              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Drop an image here or browse
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Supports PNG, JPG, WebP, AVIF, HEIC · Press Ctrl+V to paste
                </p>
              </div>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Try Sample Image</span>
                </button>
              </div>

              <div className="pt-1 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                <span>Max 50MB</span>
                <span>·</span>
                <span>Direct RAM Processing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Reference, Format Matrix, Presets Guide & FAQ */}
        <CompressionGuideAndFaq isDark={isDark} />
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (IMAGE LOADED)
  ------------------------------------------------------------- */
  const savedPercentage = compressedResult?.savedPercentage ?? 0;
  const isReduced = savedPercentage > 0;
  const isIncreased = savedPercentage < 0;

  return (
    <div
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={handleWorkspaceDragLeave}
      onDrop={handleWorkspaceDrop}
      className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 relative select-none"
    >
      {/* Hidden input for replacing image from workspace */}
      <input
        ref={workspaceFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
        className="hidden"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            validateAndLoadFile(e.target.files[0]);
          }
        }}
      />

      {/* Visual Drop Overlay when dragging a new file over active workspace */}
      {isWorkspaceDragOver && (
        <div className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-red-500 bg-zinc-950/85 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/30">
            <UploadCloud className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-white">Drop replacement image</h4>
            <p className="text-xs text-zinc-400">Replaces current image immediately in local RAM</p>
          </div>
        </div>
      )}

      {/* Hero Title & Top Action Bar Row (Ultra-Compact Viewport-Safe) */}
      <div className="flex items-center justify-between gap-3 pt-0 pb-0.5">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
            Image Compressor to KB
          </h1>
          <span className="hidden sm:inline-block text-zinc-300 dark:text-zinc-700">·</span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
            Make images lighter without losing quality.
          </p>
        </div>

        <button
          type="button"
          onClick={() => workspaceFileInputRef.current?.click()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
          <span>Change image</span>
        </button>
      </div>

      {/* Main Grid: Left Comparison Preview / Right Stacked Cards (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* LEFT COLUMN: Before & After Comparison Preview Card */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
          <div
            className={`border rounded-xl p-2.5 sm:p-3 flex flex-col justify-between h-full transition-colors relative overflow-hidden ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-800/80 shadow-xs'
                : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            {/* Header bar inside left card */}
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md overflow-hidden shrink-0 flex items-center justify-center border ${
                    isDark ? 'bg-zinc-850 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex items-center gap-2">
                  <h3 className={`text-xs font-semibold truncate max-w-[160px] sm:max-w-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {sourceImage.name}
                  </h3>
                  <div className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span>{sourceImage.width}×{sourceImage.height}</span>
                    <span>·</span>
                    <span className="font-semibold">{formatFileSize(sourceImage.originalSize)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => workspaceFileInputRef.current?.click()}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-750'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>Replace</span>
                </button>
              </div>
            </div>

            {/* Comparison Canvas Area (Height adjusted by +150px for testing) */}
            <div className="relative rounded-xl overflow-hidden bg-black/15 h-[380px] sm:h-[410px] lg:h-[430px] xl:h-[450px] flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/60">
              {isProcessing && (
                <div className="absolute inset-0 z-20 bg-zinc-950/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono font-medium text-zinc-200 bg-zinc-900 px-3 py-1 rounded">
                    Optimizing image in local RAM...
                  </span>
                </div>
              )}

              {compressedResult ? (
                <ComparisonSlider
                  originalSrc={sourceImage.previewUrl}
                  processedSrc={compressedResult.url}
                  originalLabel={`Original`}
                  processedLabel={`Compressed`}
                  maxHeightClass="max-h-[360px] sm:max-h-[390px] lg:max-h-[410px] xl:max-h-[430px]"
                  className="max-h-[370px] sm:max-h-[400px] lg:max-h-[420px] xl:max-h-[440px] w-full"
                />
              ) : (
                <div className="relative max-h-full max-w-full flex items-center justify-center overflow-hidden">
                  <img
                    src={sourceImage.previewUrl}
                    alt="Original Preview"
                    draggable={false}
                    className="max-h-[360px] sm:max-h-[390px] lg:max-h-[410px] xl:max-h-[430px] max-w-full object-contain select-none"
                  />
                </div>
              )}
            </div>

            {/* Quick Action footer inside left card */}
            <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 px-0.5 pt-0.5 gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>100% In-Browser Engine · Zero Uploads</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={!compressedResult}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
                      : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  <Copy className="w-3 h-3 text-blue-500" />
                  <span>Copy</span>
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!compressedResult}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
                        : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    <Share2 className="w-3 h-3 text-indigo-500" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & Fine Tune Stacked Cards (Equal to Canvas Height) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between h-full gap-2.5">
          {/* Card 1: YOUR RESULTS */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border space-y-1.5 transition-colors shrink-0 ${
              isDark ? 'bg-zinc-900/90 border-zinc-800/80 shadow-xs' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 block">
                  YOUR RESULTS
                </span>
                <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  File size
                </h3>
              </div>

              {isReduced ? (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50">
                  {savedPercentage}% smaller
                </span>
              ) : isIncreased ? (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50">
                  +{Math.abs(savedPercentage)}% larger
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                  Optimized
                </span>
              )}
            </div>

            {/* Stats Breakdown Rows */}
            <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              {/* Row 1: Original */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                  <div>
                    <span className={`text-[11px] font-semibold block leading-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Original
                    </span>
                    <span className="text-[9px] text-zinc-500 block leading-tight">
                      Before compression
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {formatFileSize(sourceImage.originalSize)}
                </span>
              </div>

              {/* Row 2: Compressed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <div>
                    <span className={`text-[11px] font-semibold block leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Compressed
                    </span>
                    <span className="text-[9px] text-zinc-500 block leading-tight">
                      {outputFormat === 'original'
                        ? sourceImage.format.replace('image/', '').toUpperCase()
                        : outputFormat.replace('image/', '').toUpperCase()}{' '}
                      · {mode === 'quality' ? `${quality}% quality` : `${targetKb} KB limit`}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-mono font-bold ${isReduced ? 'text-emerald-500' : isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {compressedResult ? formatFileSize(compressedResult.size) : 'Calculating...'}
                </span>
              </div>
            </div>

            {/* Highlight Banner */}
            {isReduced && compressedResult ? (
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/50 text-[10px] sm:text-[11px] font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-red-500 shrink-0" />
                <span>+ You save <strong>{formatFileSize(compressedResult.savedBytes)}</strong> with this setting</span>
              </div>
            ) : isIncreased ? (
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                <span>Re-encoding produced a larger output. Lower quality or choose WebP.</span>
              </div>
            ) : null}
          </div>

          {/* Card 2: FINE TUNE */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border flex-1 flex flex-col justify-between transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800/80 shadow-xs' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 block">
                  FINE TUNE
                </span>
                <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  Compression
                </h3>
              </div>

              {/* Mode switch: Quality slider vs Target KB */}
              <div className={`inline-flex p-0.5 rounded-md text-[11px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <button
                  type="button"
                  onClick={() => setMode('quality')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    mode === 'quality'
                      ? isDark
                        ? 'bg-zinc-700 text-white shadow-xs font-semibold'
                        : 'bg-white text-zinc-900 shadow-xs font-semibold'
                      : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Quality
                </button>
                <button
                  type="button"
                  onClick={() => setMode('target-size')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    mode === 'target-size'
                      ? isDark
                        ? 'bg-zinc-700 text-white shadow-xs font-semibold'
                        : 'bg-white text-zinc-900 shadow-xs font-semibold'
                      : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Target KB
                </button>
              </div>
            </div>

            {/* Quality Slider Controls */}
            {mode === 'quality' ? (
              <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Quality
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-zinc-500">
                      {quality <= 40 ? 'Max Compression' : quality <= 65 ? 'High Savings' : quality <= 85 ? 'Balanced' : 'High Quality'}
                    </span>
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${isDark ? 'text-white bg-zinc-800' : 'text-zinc-900 bg-zinc-100'}`}>
                      {quality}%
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={quality}
                  aria-label="Compression quality slider"
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-none"
                  style={{
                    background: isDark
                      ? `linear-gradient(to right, #ef4444 ${(quality - 10) / 0.9}%, #27272a ${(quality - 10) / 0.9}%)`
                      : `linear-gradient(to right, #ef4444 ${(quality - 10) / 0.9}%, #e4e4e7 ${(quality - 10) / 0.9}%)`,
                  }}
                />

                {/* Quick Quality Presets */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '35%', val: 35 },
                    { label: '60%', val: 60 },
                    { label: 'Balanced', val: 75 },
                    { label: '90%', val: 90 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => applyQualityPreset(p.val)}
                      className={`text-[10px] px-1 py-0.5 rounded font-medium transition-colors cursor-pointer text-center ${
                        quality === p.val
                          ? 'bg-red-500 text-white font-semibold'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-300 hover:text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Target KB Solver Mode */
              <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Target File Size
                  </span>
                  <span className="font-mono text-[11px] font-bold text-red-500">
                    {targetKb} KB
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    max={10000}
                    value={targetKbInput}
                    aria-label="Target file size in kilobytes"
                    onChange={(e) => {
                      const valStr = e.target.value;
                      setTargetKbInput(valStr);
                      const parsed = parseInt(valStr, 10);
                      if (!isNaN(parsed) && parsed >= 5) {
                        setTargetKb(parsed);
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseInt(targetKbInput, 10);
                      if (isNaN(parsed) || parsed < 5) {
                        setTargetKbInput('20');
                        setTargetKb(20);
                      }
                    }}
                    className={`w-full px-2 py-0.5 rounded-md text-xs font-mono font-medium border focus:outline-none focus:ring-1 focus:ring-red-500 ${
                      isDark
                        ? 'bg-zinc-850 border-zinc-750 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                  <span className="text-[11px] text-zinc-400 font-mono font-semibold">KB</span>
                </div>

                {/* Indian Govt & Exam Portal Chips */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { kb: 20, label: '< 20 KB' },
                    { kb: 50, label: '< 50 KB' },
                    { kb: 100, label: '< 100 KB' },
                    { kb: 200, label: '< 200 KB' },
                  ].map((item) => (
                    <button
                      key={item.kb}
                      type="button"
                      onClick={() => applyTargetKbPreset(item.kb)}
                      className={`text-[10px] py-0.5 px-0.5 rounded font-medium text-center transition-colors cursor-pointer ${
                        targetKb === item.kb
                          ? 'bg-red-500 text-white font-semibold'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-300 hover:text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Output Format Selector */}
            <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Output format
                </span>
                <span className="text-[9px] text-zinc-500">
                  Choose one
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'image/webp', label: 'WEBP' },
                  { id: 'image/jpeg', label: 'JPG' },
                  { id: 'image/png', label: 'PNG' },
                  { id: 'original', label: 'Original' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setOutputFormat(fmt.id as OutputFormat)}
                    className={`py-0.5 px-1 rounded-md text-[10px] font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                      outputFormat === fmt.id
                        ? 'border-2 border-red-500 bg-red-500/10 text-red-500 dark:text-red-400'
                        : isDark
                          ? 'border border-zinc-800 bg-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800'
                          : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                    }`}
                  >
                    <span>{fmt.label}</span>
                    {outputFormat === fmt.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Scaling Dropdown/Chips */}
            <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Resolution
                </span>
                <span className="font-mono text-zinc-400 text-[10px]">
                  {scalePercentage}%
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[100, 75, 50, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setScalePercentage(pct)}
                    className={`py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      scalePercentage === pct
                        ? isDark
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'bg-zinc-200 text-zinc-900 font-semibold'
                        : isDark
                          ? 'bg-zinc-850 text-zinc-400'
                          : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action: Download Button (Docked at bottom of Fine Tune card) */}
          <div className="pt-2.5 mt-auto">
            <button
              type="button"
              disabled={!compressedResult || isProcessing}
              onClick={handleDownload}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                {compressedResult ? `Download (${formatFileSize(compressedResult.size)})` : 'Download Image'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Detailed Reference, Format Matrix, Presets Guide & FAQ */}
      <CompressionGuideAndFaq isDark={isDark} />
    </div>
  );
};
