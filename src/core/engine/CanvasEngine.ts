/**
 * Pure TypeScript Canvas Processing Engine for FileWala Tool
 * 100% Client-side, framework-agnostic, zero-server footprint.
 */

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/bmp' | 'image/x-icon';

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
   * Safely loads an image from a File, Blob, or URL into an HTMLImageElement.
   */
  public static async loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let objectUrl: string | null = null;

      img.onload = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = (err) => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image. File may be corrupted or unsupported format.'));
      };

      if (typeof source === 'string') {
        img.crossOrigin = 'anonymous';
        img.src = source;
      } else {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      }
    });
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
    if (backgroundColor && (format === 'image/jpeg' || backgroundColor !== 'transparent')) {
      ctx.fillStyle = backgroundColor === 'transparent' ? '#FFFFFF' : backgroundColor;
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

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (format === 'image/jpeg') {
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
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    if (targetFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);
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
    const canvas = document.createElement('canvas');
    const { x, y, width, height } = cropRect;

    const safeW = Math.max(1, Math.round(width));
    const safeH = Math.max(1, Math.round(height));

    canvas.width = safeW;
    canvas.height = safeH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    if (format === 'image/jpeg') {
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

    canvas.width = isQuarterTurn ? img.naturalHeight : img.naturalWidth;
    canvas.height = isQuarterTurn ? img.naturalWidth : img.naturalHeight;

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rads);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2,
      img.naturalWidth,
      img.naturalHeight
    );

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
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

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

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

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
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

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
            } catch (err) {
              reject(new Error('Failed to export canvas to blob'));
            }
          }
        },
        format,
        quality
      );
    });
  }
}
