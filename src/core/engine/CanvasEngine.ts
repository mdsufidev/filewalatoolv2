/**
 * Pure TypeScript Canvas Processing Engine for FileWala Tool
 * 100% Client-side, framework-agnostic, zero-server footprint.
 */

import { loadOrientedImage } from '../../utils/exifHelper';
import { convertHeicToJpeg } from '../../utils/heicHelper';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/bmp' | 'image/x-icon';

/**
 * Checks if the given MIME type represents JPEG / JPG.
 */
export function isJpegFormat(format?: string): boolean {
  if (!format) return false;
  const f = format.toLowerCase().trim();
  return f === 'image/jpeg' || f === 'image/jpg' || f.endsWith('/jpeg') || f.endsWith('/jpg') || f.endsWith('jpeg') || f.endsWith('jpg');
}

export interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio?: boolean;
  fitMode?: 'stretch' | 'contain' | 'cover';
  format?: ImageFormat;
  quality?: number; // 0.0 - 1.0
  backgroundColor?: string;
}

export interface CompressOptions {
  quality: number; // 0.0 - 1.0 (e.g. 0.8 for 80%)
  format?: ImageFormat;
  maxWidth?: number;
  maxHeight?: number;
}

export interface CompressToTargetSizeOptions {
  targetKb: number;
  format?: ImageFormat;
  minQuality?: number;
  maxQuality?: number;
  allowDownscaling?: boolean;
}

export interface TargetCompressResult {
  blob: Blob;
  width: number;
  height: number;
  quality: number;
  wasDownscaled: boolean;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FilterOptions {
  brightness: number; // 0 to 200 (100 is default)
  contrast: number;   // 0 to 200 (100 is default)
  saturation: number; // 0 to 200 (100 is default)
  blur: number;       // 0 to 20 px (0 is default)
  grayscale: number;  // 0 to 100 % (0 is default)
  sepia: number;      // 0 to 100 % (0 is default)
  invert: number;     // 0 to 100 % (0 is default)
  sharpen?: boolean;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number; // px
  fontFamily?: string;
  color: string;
  opacity: number; // 0.0 - 1.0
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  padding?: number;
}

export interface RotateFlipOptions {
  angle: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export class CanvasEngine {
  /**
   * Safely loads an image from a File, Blob, or URL into an HTMLImageElement,
   * automatically applying EXIF orientation correction so phone camera photos never appear sideways.
   */
  public static async loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
    if (typeof source !== 'string') {
      let processableSource: File | Blob = source;
      const isHeic =
        source.type.toLowerCase().includes('heic') ||
        source.type.toLowerCase().includes('heif') ||
        ('name' in source && typeof (source as File).name === 'string' && /\.(heic|heif)$/i.test((source as File).name));

      if (isHeic) {
        try {
          processableSource = await convertHeicToJpeg(source);
        } catch (e) {
          console.warn('HEIC auto-transcode failed, attempting direct load', e);
        }
      }

      const oriented = await loadOrientedImage(processableSource);
      return oriented.img;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image. File may be corrupted or unsupported format.'));
      img.crossOrigin = 'anonymous';
      img.src = source;
    });
  }

  /**
   * Clamps canvas dimensions to prevent mobile browser (iOS Safari) canvas memory allocation crashes (>16 Megapixels).
   */
  public static clampDimensions(w: number, h: number, maxPixels: number = 16000000): { width: number; height: number } {
    const safeW = Math.max(1, Math.round(w));
    const safeH = Math.max(1, Math.round(h));
    if (safeW * safeH <= maxPixels) {
      return { width: safeW, height: safeH };
    }
    const ratio = Math.sqrt(maxPixels / (safeW * safeH));
    return {
      width: Math.max(1, Math.round(safeW * ratio)),
      height: Math.max(1, Math.round(safeH * ratio)),
    };
  }

  /**
   * Resizes an image based on specified options.
   */
  public static async resize(
    img: HTMLImageElement,
    options: ResizeOptions
  ): Promise<Blob> {
    const {
      width,
      height,
      maintainAspectRatio = true,
      fitMode = 'stretch',
      format = 'image/jpeg',
      quality = 0.92,
      backgroundColor = 'transparent',
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context is not available');

    let targetW = Math.max(1, Math.round(width));
    let targetH = Math.max(1, Math.round(height));

    if (maintainAspectRatio && fitMode === 'stretch') {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (targetW / targetH > ratio) {
        targetW = Math.round(targetH * ratio);
      } else {
        targetH = Math.round(targetW / ratio);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // High quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Background filling for non-transparent formats
    if (isJpegFormat(format) || (backgroundColor && backgroundColor !== 'transparent')) {
      ctx.fillStyle = (!backgroundColor || backgroundColor === 'transparent') ? '#FFFFFF' : backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (fitMode === 'contain' && maintainAspectRatio) {
      const hRatio = targetW / img.naturalWidth;
      const vRatio = targetH / img.naturalHeight;
      const ratio = Math.min(hRatio, vRatio);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      const drawX = (targetW - drawW) / 2;
      const drawY = (targetH - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else if (fitMode === 'cover' && maintainAspectRatio) {
      const hRatio = targetW / img.naturalWidth;
      const vRatio = targetH / img.naturalHeight;
      const ratio = Math.max(hRatio, vRatio);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      const drawX = (targetW - drawW) / 2;
      const drawY = (targetH - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      ctx.drawImage(img, 0, 0, targetW, targetH);
    }

    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Compresses an image with specified quality and optional dimension capping.
   */
  public static async compress(
    img: HTMLImageElement,
    options: CompressOptions
  ): Promise<Blob> {
    const { quality, format = 'image/jpeg', maxWidth, maxHeight } = options;

    let targetW = img.naturalWidth;
    let targetH = img.naturalHeight;

    if (maxWidth && targetW > maxWidth) {
      const ratio = maxWidth / targetW;
      targetW = maxWidth;
      targetH = Math.round(targetH * ratio);
    }

    if (maxHeight && targetH > maxHeight) {
      const ratio = maxHeight / targetH;
      targetH = maxHeight;
      targetW = Math.round(targetW * ratio);
    }

    const clamped = this.clampDimensions(targetW, targetH);
    targetW = clamped.width;
    targetH = clamped.height;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isJpegFormat(format)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Converts an image to any target format with optional quality parameter.
   */
  public static async convertFormat(
    img: HTMLImageElement,
    targetFormat: ImageFormat,
    quality: number = 0.92
  ): Promise<Blob> {
    const rawW = img.naturalWidth || img.width;
    const rawH = img.naturalHeight || img.height;
    const { width: targetW, height: targetH } = this.clampDimensions(rawW, rawH);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isJpegFormat(targetFormat)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    return this.canvasToBlob(canvas, targetFormat, quality);
  }

  /**
   * Crops a specified rectangular subregion of an image.
   */
  public static async crop(
    img: HTMLImageElement,
    cropRect: CropRect,
    format: ImageFormat = 'image/png',
    quality: number = 0.95
  ): Promise<Blob> {
    const { x, y, width, height } = cropRect;
    const { width: safeW, height: safeH } = this.clampDimensions(width, height);

    const canvas = document.createElement('canvas');
    canvas.width = safeW;
    canvas.height = safeH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isJpegFormat(format)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, safeW, safeH);
    }

    ctx.drawImage(img, x, y, safeW, safeH, 0, 0, safeW, safeH);
    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Rotates and flips an image.
   */
  public static async rotateAndFlip(
    img: HTMLImageElement,
    options: RotateFlipOptions,
    format: ImageFormat = 'image/png',
    quality: number = 0.95
  ): Promise<Blob> {
    const { angle, flipHorizontal, flipVertical } = options;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    const rads = (angle * Math.PI) / 180;
    const isQuarterTurn = angle % 180 !== 0;

    const rawW = isQuarterTurn ? (img.naturalHeight || img.height) : (img.naturalWidth || img.width);
    const rawH = isQuarterTurn ? (img.naturalWidth || img.width) : (img.naturalHeight || img.height);
    const { width: targetW, height: targetH } = this.clampDimensions(rawW, rawH);

    canvas.width = targetW;
    canvas.height = targetH;

    if (isJpegFormat(format)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rads);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

    const drawW = isQuarterTurn ? targetH : targetW;
    const drawH = isQuarterTurn ? targetW : targetH;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Applies CSS-like filter adjustments (brightness, contrast, saturation, blur, grayscale, sepia, invert).
   */
  public static async applyFilters(
    img: HTMLImageElement,
    filters: FilterOptions,
    format: ImageFormat = 'image/png',
    quality: number = 0.92
  ): Promise<Blob> {
    const { width: targetW, height: targetH } = this.clampDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    const filterString = [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `blur(${filters.blur}px)`,
      `grayscale(${filters.grayscale}%)`,
      `sepia(${filters.sepia}%)`,
      `invert(${filters.invert}%)`,
    ].join(' ');

    ctx.filter = filterString;

    if (isJpegFormat(format)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Optional unsharp mask / convolution filter
    if (filters.sharpen) {
      this.applySharpenMatrix(ctx, canvas.width, canvas.height);
    }

    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Adds custom text watermark.
   */
  public static async addWatermark(
    img: HTMLImageElement,
    watermark: WatermarkOptions,
    format: ImageFormat = 'image/png',
    quality: number = 0.95
  ): Promise<Blob> {
    const { width: targetW, height: targetH } = this.clampDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    if (isJpegFormat(format)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);

    const {
      text,
      fontSize,
      fontFamily = 'system-ui, -apple-system, sans-serif',
      color,
      opacity,
      position,
      padding = 32,
    } = watermark;

    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity));
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    let x = padding;
    let y = padding + textHeight;

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding + textHeight;
        break;
      case 'top-center':
        x = (canvas.width - textWidth) / 2;
        y = padding + textHeight;
        break;
      case 'top-right':
        x = canvas.width - textWidth - padding;
        y = padding + textHeight;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = (canvas.height + textHeight) / 2;
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding;
        break;
      case 'bottom-center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height - padding;
        break;
      case 'bottom-right':
        x = canvas.width - textWidth - padding;
        y = canvas.height - padding;
        break;
    }

    // Add subtle shadow for legibility across varied backgrounds
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillText(text, x, y);
    ctx.restore();

    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Compresses an image to fit strictly under a target KB limit.
   * Uses binary quality search, and if minimum quality floor is reached,
   * automatically scales down dimensions so the target limit is strictly met.
   */
  public static async compressToTargetSize(
    img: HTMLImageElement,
    options: CompressToTargetSizeOptions
  ): Promise<TargetCompressResult> {
    const {
      targetKb,
      format = 'image/jpeg',
      minQuality = 0.05,
      maxQuality = 0.98,
      allowDownscaling = true,
    } = options;

    const targetBytes = targetKb * 1024;
    const clamped = this.clampDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height);
    let targetW = clamped.width;
    let targetH = clamped.height;

    // Helper to render and export to blob
    const render = async (w: number, h: number, q: number): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (isJpegFormat(format)) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);
      return this.canvasToBlob(canvas, format, q);
    };

    let bestCompliantBlob: Blob | null = null;
    let bestQuality = 0.75;
    let smallestCandidateBlob: Blob | null = null;

    // Binary search quality
    let low = minQuality;
    let high = maxQuality;

    for (let i = 0; i < 7; i++) {
      const mid = (low + high) / 2;
      const candidate = await render(targetW, targetH, mid);

      if (!smallestCandidateBlob || candidate.size < smallestCandidateBlob.size) {
        smallestCandidateBlob = candidate;
      }

      if (candidate.size <= targetBytes) {
        bestCompliantBlob = candidate;
        bestQuality = mid;
        low = mid; // Can afford higher quality for sharper visual fidelity
      } else {
        high = mid; // File too large, decrease quality
      }

      // Early exit if within 3% of target limit
      if (candidate.size <= targetBytes && (targetBytes - candidate.size) / targetBytes < 0.03) {
        break;
      }
    }

    if (bestCompliantBlob) {
      return {
        blob: bestCompliantBlob,
        width: targetW,
        height: targetH,
        quality: Math.round(bestQuality * 100),
        wasDownscaled: false,
      };
    }

    // If still exceeds target and downscaling is allowed
    if (allowDownscaling) {
      let curW = targetW;
      let curH = targetH;
      let currentBlob = smallestCandidateBlob || (await render(curW, curH, minQuality));
      let iterations = 0;
      let wasDownscaled = false;

      while (currentBlob.size > targetBytes && iterations < 6 && curW > 40 && curH > 40) {
        iterations++;
        wasDownscaled = true;
        const scaleRatio = Math.sqrt(targetBytes / currentBlob.size) * 0.94;
        curW = Math.max(30, Math.round(curW * scaleRatio));
        curH = Math.max(30, Math.round(curH * scaleRatio));
        // Use crisp quality 0.65 for downscaled image so text remains legible
        currentBlob = await render(curW, curH, 0.65);
      }

      return {
        blob: currentBlob,
        width: curW,
        height: curH,
        quality: 65,
        wasDownscaled,
      };
    }

    return {
      blob: smallestCandidateBlob || (await render(targetW, targetH, minQuality)),
      width: targetW,
      height: targetH,
      quality: Math.round(minQuality * 100),
      wasDownscaled: false,
    };
  }

  /**
   * Helper convolution filter for sharpening image
   */
  private static applySharpenMatrix(ctx: CanvasRenderingContext2D, w: number, h: number) {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const buffer = new Uint8ClampedArray(data);

      // 3x3 sharpen kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const val =
              5 * buffer[idx + c] -
              buffer[((y - 1) * w + x) * 4 + c] -
              buffer[((y + 1) * w + x) * 4 + c] -
              buffer[(y * w + (x - 1)) * 4 + c] -
              buffer[(y * w + (x + 1)) * 4 + c];
            data[idx + c] = Math.min(255, Math.max(0, val));
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Fallback if cross-origin tainted
    }
  }

  /**
   * Promisified canvas.toBlob with fallback
   */
  public static canvasToBlob(
    canvas: HTMLCanvasElement,
    format: ImageFormat,
    quality: number = 0.92
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          try {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback for uncommon mime types
              try {
                const dataUrl = canvas.toDataURL('image/png');
                const arr = dataUrl.split(',');
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                  u8arr[n] = bstr.charCodeAt(n);
                }
                resolve(new Blob([u8arr], { type: 'image/png' }));
              } catch {
                reject(new Error('Failed to export canvas to blob'));
              }
            }
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        },
        format,
        quality
      );
    });
  }
}
