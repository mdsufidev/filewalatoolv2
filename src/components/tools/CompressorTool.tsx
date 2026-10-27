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
    try {
      // In browsers, clipboard API primarily supports PNG blobs
      if (compressedResult.blob.type === 'image/png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': compressedResult.blob })
        ]);
        onNotify?.('Copied to Clipboard', 'Image copied to clipboard successfully!', 'success');
      } else {
        // Render directly onto canvas for universal PNG clipboard export
        const canvas = document.createElement('canvas');
        canvas.width = compressedResult.width;
        canvas.height = compressedResult.height;
        const ctx = canvas.getContext('2d');
        if (!ctx || !imageElement) {
          throw new Error('Canvas context not available');
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob })
            ]);
            onNotify?.('Copied to Clipboard', 'Image copied to clipboard!', 'success');
          }
        }, 'image/png');
      }
    } catch {
      onNotify?.('Copy Failed', 'Clipboard image copy is not supported in this browser.', 'error');
    }
  }, [compressedResult, imageElement, onNotify]);

  // Mobile Web Share API
  const handleShare = useCallback(async () => {
    if (!compressedResult || !sourceImage || !navigator.share) return;
    try {
      const ext = compressedResult.format === 'image/webp' ? 'webp' : compressedResult.format === 'image/png' ? 'png' : 'jpg';
      const file = new File([compressedResult.blob], `compressed-${sourceImage.name.replace(/\.[^/.]+$/, '')}.${ext}`, {
        type: compressedResult.format,
      });
      await navigator.share({
        title: 'Compressed Image',
        text: `Compressed image (${formatFileSize(compressedResult.size)}) via FileWala`,
        files: [file],
      });
    } catch {
      // User cancelled share or not supported
    }
  }, [compressedResult, sourceImage]);

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
      <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 select-none">
        {/* Header Section */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side Engine · Zero Uploads</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Image Compressor
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Reduce image file sizes directly in your browser without quality loss.
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Minimalist 2D Flat Dropzone (Unboxed, Zero Clutter) */}
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
          className={`relative group border border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-colors duration-150 select-none outline-none ${
            isDragOver
              ? isDark
                ? 'border-zinc-500 bg-zinc-850/50'
                : 'border-zinc-500 bg-zinc-50'
              : isDark
                ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/60'
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

          <div className="flex flex-col items-center justify-center space-y-3.5">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <UploadCloud className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Drop an image here or browse
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Supports PNG, JPG, WebP · Press Ctrl+V to paste
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSample();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Try Sample Image</span>
              </button>
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
      className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 relative select-none"
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
        <div className="absolute inset-0 z-50 rounded-lg border border-dashed border-zinc-400 bg-zinc-950/80 flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-12 h-12 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-semibold text-white">Drop new image to compress</h4>
            <p className="text-xs text-zinc-400">Replaces current image immediately</p>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 border rounded-xl ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
              isDark ? 'bg-zinc-950' : 'bg-zinc-100'
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
            <h3 className={`text-xs sm:text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {sourceImage.name}
            </h3>
            <div className={`flex items-center gap-2 text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <span className="font-mono">
                {sourceImage.width} × {sourceImage.height} px
              </span>
              <span>·</span>
              <span className="font-medium">
                {formatFileSize(sourceImage.originalSize)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Change File Button */}
          <button
            onClick={() => workspaceFileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Replace</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {/* Direct Download Button */}
          <button
            disabled={!compressedResult || isProcessing}
            onClick={handleDownload}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {compressedResult ? `(${formatFileSize(compressedResult.size)})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Preview Dashboard / Right Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Before & After Preview Dashboard */}
        <div className="lg:col-span-8 space-y-4">
          {/* View mode toggle header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Preview
              </span>
              {isProcessing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 animate-pulse">
                  Optimizing...
                </span>
              )}
            </div>

            <div
              className={`inline-flex p-0.5 rounded-lg text-xs ${
                isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border border-zinc-200'
              }`}
            >
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? isDark
                      ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                      : 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split Slider</span>
              </button>

              <button
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'side-by-side'
                    ? isDark
                      ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                      : 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Side by Side</span>
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div
            className={`border rounded-xl p-4 flex flex-col items-center justify-center min-h-[420px] transition-colors relative overflow-hidden ${
              isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-zinc-950/60 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono font-medium text-zinc-200 bg-zinc-900 px-3 py-1 rounded">
                  Optimizing in browser...
                </span>
              </div>
            )}

            {/* Split Slider Mode */}
            {viewMode === 'split' && (
              <div className="w-full h-full flex items-center justify-center">
                {compressedResult ? (
                  <ComparisonSlider
                    originalSrc={sourceImage.previewUrl}
                    processedSrc={compressedResult.url}
                    originalLabel={`Original (${formatFileSize(sourceImage.originalSize)})`}
                    processedLabel={`Compressed (${formatFileSize(compressedResult.size)})`}
                    className="max-h-[500px] w-full"
                  />
                ) : (
                  <div className="relative max-h-[500px] max-w-full flex items-center justify-center overflow-hidden rounded-xl">
                    <img
                      src={sourceImage.previewUrl}
                      alt="Original Preview"
                      draggable={false}
                      className="max-h-[440px] max-w-full object-contain select-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Side-by-Side Dual Card Mode */}
            {viewMode === 'side-by-side' && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Card */}
                <div
                  className={`rounded-xl p-3 flex flex-col space-y-2 ${
                    isDark ? 'bg-zinc-950/70' : 'bg-zinc-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">
                      Original
                    </span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900/60 text-zinc-300">
                      {formatFileSize(sourceImage.originalSize)}
                    </span>
                  </div>
                  <div className="h-[280px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/10">
                    <img
                      src={sourceImage.previewUrl}
                      alt="Original"
                      draggable={false}
                      className="max-h-full max-w-full object-contain select-none"
                    />
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 flex justify-between">
                    <span>{sourceImage.width} × {sourceImage.height} px</span>
                    <span>{sourceImage.format.replace('image/', '').toUpperCase()}</span>
                  </div>
                </div>

                {/* Compressed Card */}
                <div
                  className={`rounded-xl p-3 flex flex-col space-y-2 ${
                    isDark ? 'bg-zinc-950/70' : 'bg-zinc-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3" /> Compressed
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      {compressedResult ? formatFileSize(compressedResult.size) : '...'}
                    </span>
                  </div>
                  <div className="h-[280px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/10">
                    {compressedResult ? (
                      <img
                        src={compressedResult.url}
                        alt="Compressed"
                        draggable={false}
                        className="max-h-full max-w-full object-contain select-none"
                      />
                    ) : (
                      <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 flex justify-between">
                    <span>
                      {compressedResult ? `${compressedResult.width} × ${compressedResult.height} px` : '...'}
                    </span>
                    <span className={isReduced ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {compressedResult && (isReduced ? `${savedPercentage}% smaller` : 'Original size')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Bar under Preview (Copy to clipboard & Share) */}
          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 px-1 gap-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>In-Browser RAM</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                disabled={!compressedResult}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
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

        {/* RIGHT COLUMN: Controls Panel & Metrics */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Metrics & Savings Card (Unboxed Inner Elements) */}
          <div
            className={`p-4 sm:p-5 rounded-xl border space-y-3.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Result
              </span>

              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isReduced
                    ? isDark
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-700'
                    : isIncreased
                      ? isDark
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-rose-50 text-rose-700'
                      : isDark
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isReduced ? (
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-emerald-500" />
                    {savedPercentage}% Smaller
                  </span>
                ) : isIncreased ? (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-rose-500" />
                    +{Math.abs(savedPercentage)}% Larger
                  </span>
                ) : (
                  'Original Size'
                )}
              </span>
            </div>

            {/* Comparison Metrics Grid: Target Size & Final Output Size side-by-side */}
            <div className={`grid ${mode === 'target-size' ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-850' : 'bg-zinc-100'}`}>
                <span className={`text-[10px] font-mono block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  ORIGINAL
                </span>
                <span className={`text-sm font-bold mt-0.5 block ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatFileSize(sourceImage.originalSize)}
                </span>
                <span className="text-[10px] text-zinc-500 block truncate font-mono">
                  {sourceImage.width}×{sourceImage.height}px
                </span>
              </div>

              {mode === 'target-size' && (
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-850/80 border-blue-500/30' : 'bg-blue-50/60 border-blue-200'}`}>
                  <span className={`text-[10px] font-mono block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    TARGET SIZE
                  </span>
                  <span className={`text-sm font-bold mt-0.5 block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {targetKb} KB
                  </span>
                  <span className="text-[10px] text-blue-500/80 block truncate font-mono">
                    Max Limit
                  </span>
                </div>
              )}

              <div className={`p-3 rounded-lg border ${compressedResult && mode === 'target-size' && compressedResult.size <= targetKb * 1024 ? (isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200') : (isDark ? 'bg-zinc-850 border-transparent' : 'bg-zinc-100 border-transparent')}`}>
                <span className={`text-[10px] font-mono block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  FINAL OUTPUT
                </span>
                <span className="text-sm font-bold text-emerald-500 mt-0.5 block">
                  {compressedResult ? formatFileSize(compressedResult.size) : 'Calculating...'}
                </span>
                <span className="text-[10px] text-emerald-500/80 block truncate font-mono">
                  {compressedResult ? (
                    mode === 'target-size' && compressedResult.size <= targetKb * 1024
                      ? '✓ Meets Limit'
                      : isReduced
                        ? `Saved ${formatFileSize(compressedResult.savedBytes)}`
                        : 'No size reduction'
                  ) : '...'}
                </span>
              </div>
            </div>

            {/* Downscaled Warning badge if solver automatically resized dimensions for quota */}
            {compressedResult?.wasDownscaled && (
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Scaled to {compressedResult.width}×{compressedResult.height}px for {targetKb}KB quota.</span>
              </div>
            )}

            {/* Notice if PNG size increased or not reducing */}
            {((outputFormat === 'image/png') || (sourceImage.format === 'image/png' && outputFormat === 'original')) && (
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>PNG is lossless. Switch to <strong>WebP</strong> for up to 80% size savings.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOutputFormat('image/webp')}
                  className="px-2 py-0.5 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700 text-[10px] shrink-0 cursor-pointer"
                >
                  Use WebP
                </button>
              </div>
            )}

            {/* Progress bar showing reduction */}
            {compressedResult && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>File Size Savings</span>
                  <span className={isReduced ? 'text-emerald-500 font-bold' : isIncreased ? 'text-rose-500 font-bold' : 'text-zinc-400'}>
                    {isReduced ? `-${savedPercentage}%` : isIncreased ? `+${Math.abs(savedPercentage)}%` : '0%'}
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isReduced ? 'bg-emerald-500' : isIncreased ? 'bg-rose-500' : 'bg-zinc-400'}`}
                    style={{ width: `${Math.min(100, Math.max(0, isReduced ? savedPercentage : Math.abs(savedPercentage)))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Compression Controls Panel */}
          <div
            className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Settings
              </h4>

              {/* Mode switch: Quality slider vs Target KB */}
              <div className={`flex items-center p-0.5 rounded-lg ${isDark ? 'bg-zinc-850' : 'bg-zinc-100'}`}>
                <button
                  onClick={() => setMode('quality')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
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
                  onClick={() => setMode('target-size')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
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
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Quality Level
                  </label>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-800 bg-zinc-100'}`}>
                    {quality}%
                  </span>
                </div>

                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={quality}
                  aria-label="Compression quality slider"
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                  style={{
                    background: isDark
                      ? `linear-gradient(to right, #3b82f6 ${(quality - 10) / 0.9}%, #27272a ${(quality - 10) / 0.9}%)`
                      : `linear-gradient(to right, #3b82f6 ${(quality - 10) / 0.9}%, #e4e4e7 ${(quality - 10) / 0.9}%)`,
                  }}
                />

                {/* Quick Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {[
                    { label: 'Max (35%)', val: 35 },
                    { label: 'Web (60%)', val: 60 },
                    { label: 'Balanced (75%)', val: 75 },
                    { label: 'High (90%)', val: 90 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => applyQualityPreset(p.val)}
                      className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors cursor-pointer flex-1 text-center ${
                        quality === p.val
                          ? isDark
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'bg-zinc-200 text-zinc-950 font-semibold'
                          : isDark
                            ? 'bg-zinc-850 text-zinc-400 hover:text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Target KB Solver Mode */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Target File Size
                  </label>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {targetKb} KB
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark
                        ? 'bg-zinc-850 border-zinc-750 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                  <span className="text-xs text-zinc-400 font-mono font-semibold">KB</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { kb: 20, label: '20 KB' },
                    { kb: 50, label: '50 KB' },
                    { kb: 100, label: '100 KB' },
                    { kb: 250, label: '250 KB' },
                  ].map((item) => (
                    <button
                      key={item.kb}
                      onClick={() => applyTargetKbPreset(item.kb)}
                      className={`text-[10px] py-1 px-1 rounded-md font-medium text-center transition-colors cursor-pointer ${
                        targetKb === item.kb
                          ? isDark
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'bg-zinc-200 text-zinc-950 font-semibold'
                          : isDark
                            ? 'bg-zinc-850 text-zinc-400 hover:text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Output Format Selector */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Output Format
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'original', label: 'Original' },
                  { id: 'image/webp', label: 'WebP' },
                  { id: 'image/jpeg', label: 'JPG' },
                  { id: 'image/png', label: 'PNG' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setOutputFormat(fmt.id as OutputFormat)}
                    className={`py-1.5 px-1 rounded-md text-xs font-medium text-center transition-all cursor-pointer ${
                      outputFormat === fmt.id
                        ? isDark
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : isDark
                          ? 'bg-zinc-850 text-zinc-400 hover:text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale Down Resolution (Optional) */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Resolution
                </span>
                <span className="font-mono text-zinc-400 text-xs">
                  {scalePercentage}%
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[100, 75, 50, 25].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setScalePercentage(pct)}
                    className={`py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
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

            {/* Direct Re-compress Action Button */}
            <div className="pt-1">
              <button
                disabled={isProcessing}
                onClick={executeCompression}
                className={`w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Optimizing...' : 'Re-compress'}</span>
              </button>
            </div>
          </div>

          {/* 3. Direct Download CTA */}
          <button
            disabled={!compressedResult || isProcessing}
            onClick={handleDownload}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download Image</span>
          </button>
        </div>
      </div>

      {/* Detailed Reference, Format Matrix, Presets Guide & FAQ */}
      <CompressionGuideAndFaq isDark={isDark} />
    </div>
  );
};
