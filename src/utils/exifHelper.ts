/**
 * Pure TypeScript Client-Side EXIF Orientation Parser & Normalizer
 * FileWala Tool - 100% Client-Side Engine
 *
 * Automatically detects and corrects orientation metadata (tags 1 to 8) from mobile
 * phone camera photos (iPhones, Samsung, Xiaomi, etc.) so images never display or export sideways.
 */

/**
 * Extracts EXIF orientation tag (0x0112) from a JPEG Blob or ArrayBuffer.
 * Returns 1 (normal / no rotation) if not found or unreadable.
 */
export async function readExifOrientation(source: Blob | ArrayBuffer): Promise<number> {
  try {
    let buffer: ArrayBuffer;
    if (source instanceof ArrayBuffer) {
      buffer = source;
    } else {
      // Non-JPEG files never contain JPEG APP1 EXIF data - return immediately without reading
      if (source.type && !source.type.includes('jpeg') && !source.type.includes('jpg')) {
        return 1;
      }
      // EXIF APP1 metadata is strictly located within the header (first 64KB).
      // Slicing to 64KB prevents allocating entire 10-50MB files into heap memory.
      const slice = source.slice(0, 65536);
      buffer = await slice.arrayBuffer();
    }
    const view = new DataView(buffer);

    // Verify JPEG SOI marker (0xFF, 0xD8)
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) {
      return 1;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 2) {
      // Must start with marker prefix 0xFF
      if (view.getUint8(offset) !== 0xFF) {
        break;
      }

      const marker = view.getUint8(offset + 1);

      // APP1 Marker (0xFFE1) contains EXIF data
      if (marker === 0xE1) {
        const markerLength = view.getUint16(offset + 2, false);
        const exifOffset = offset + 4;

        // Check for "Exif\0\0" header (0x45786966, 0x0000)
        if (
          view.getUint32(exifOffset, false) === 0x45786966 &&
          view.getUint16(exifOffset + 4, false) === 0x0000
        ) {
          const tiffStart = exifOffset + 6;

          // Byte alignment: "II" (0x4949) = Little Endian, "MM" (0x4D4D) = Big Endian
          const byteOrder = view.getUint16(tiffStart, false);
          let littleEndian = false;
          if (byteOrder === 0x4949) {
            littleEndian = true;
          } else if (byteOrder === 0x4D4D) {
            littleEndian = false;
          } else {
            return 1; // Invalid TIFF byte order
          }

          // Verify 42 (0x002A) in TIFF header
          if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) {
            return 1;
          }

          // Read offset to 0th IFD
          const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
          if (ifdOffset < 8) return 1;

          const tagsStart = tiffStart + ifdOffset;
          if (tagsStart + 2 > length) return 1;

          const numTags = view.getUint16(tagsStart, littleEndian);

          for (let i = 0; i < numTags; i++) {
            const tagOffset = tagsStart + 2 + i * 12;
            if (tagOffset + 12 > length) break;

            const tagId = view.getUint16(tagOffset, littleEndian);

            // Tag 0x0112 is Orientation
            if (tagId === 0x0112) {
              const orientation = view.getUint16(tagOffset + 8, littleEndian);
              if (orientation >= 1 && orientation <= 8) {
                return orientation;
              }
              return 1;
            }
          }
        }
        offset += 2 + markerLength;
      } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xDA && marker !== 0xD9) {
        // Skip other markers
        const markerLength = view.getUint16(offset + 2, false);
        offset += 2 + markerLength;
      } else {
        break;
      }
    }
  } catch {
    // Non-blocking parse error fallback
  }

  return 1;
}

/**
 * Draws an image element onto a canvas with the specified EXIF orientation applied.
 * Swaps canvas width and height for 90° or 270° rotations (orientations 5, 6, 7, 8).
 */
export function drawImageWithOrientation(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  orientation: number,
  srcW: number,
  srcH: number
): void {
  switch (orientation) {
    case 2:
      // Horizontal flip
      ctx.translate(srcW, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      // 180° rotation
      ctx.translate(srcW, srcH);
      ctx.rotate(Math.PI);
      break;
    case 4:
      // Vertical flip
      ctx.translate(0, srcH);
      ctx.scale(1, -1);
      break;
    case 5:
      // Vertical flip + 90° rotate
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      // 90° clockwise rotation (Phone taken in vertical portrait)
      ctx.translate(srcH, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7:
      // Horizontal flip + 90° rotate
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(srcW, -srcH);
      ctx.scale(-1, 1);
      break;
    case 8:
      // 270° clockwise / 90° counter-clockwise rotation
      ctx.translate(0, srcW);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      // Normal orientation 1: no transformation needed
      break;
  }

  ctx.drawImage(img, 0, 0, srcW, srcH);
}

export interface OrientedImageResult {
  img: HTMLImageElement;
  width: number;
  height: number;
  orientation: number;
  wasRotated: boolean;
  cleanObjectUrl: string;
}

/**
 * Safely loads an image file or blob, detects EXIF rotation tag, and produces
 * a guaranteed upright HTMLImageElement with accurate width and height.
 */
export async function loadOrientedImage(source: File | Blob | string): Promise<OrientedImageResult> {
  // If string URL, load directly
  if (typeof source === 'string') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = source;
    });
    if ('decode' in img) {
      try {
        await img.decode();
      } catch {
        // Fallback if background decode fails
      }
    }
    return {
      img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      orientation: 1,
      wasRotated: false,
      cleanObjectUrl: source,
    };
  }

  // Check if file is JPEG. Non-JPEGs (PNG, WebP, AVIF, GIF, SVG) don't need EXIF parsing
  const isJpeg =
    (source.type ? (source.type.includes('jpeg') || source.type.includes('jpg')) : false) ||
    ('name' in source && typeof (source as File).name === 'string' && /\.(jpe?g)$/i.test((source as File).name));

  // Parse EXIF orientation only for JPEGs
  const orientation = isJpeg ? await readExifOrientation(source) : 1;

  // If orientation is 1 (standard) or not JPEG, load directly
  if (orientation <= 1) {
    const objectUrl = URL.createObjectURL(source);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image file'));
      };
      img.src = objectUrl;
    });

    if ('decode' in img) {
      try {
        await img.decode();
      } catch {
        // Fallback
      }
    }

    return {
      img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      orientation: 1,
      wasRotated: false,
      cleanObjectUrl: objectUrl,
    };
  }

  // Orientation is 2..8: We need to bake the upright orientation
  // First, check if modern browser createImageBitmap with imageOrientation: 'from-image' is available
  let uprightCanvas: HTMLCanvasElement | null = null;

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
      uprightCanvas = document.createElement('canvas');
      uprightCanvas.width = bitmap.width;
      uprightCanvas.height = bitmap.height;
      const ctx = uprightCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      } else {
        uprightCanvas = null;
      }
    }
  } catch {
    uprightCanvas = null;
  }

  // Fallback: Manually apply EXIF rotation transformation on canvas
  if (!uprightCanvas) {
    const rawUrl = URL.createObjectURL(source);
    const rawImg = new Image();
    await new Promise<void>((resolve, reject) => {
      rawImg.onload = () => resolve();
      rawImg.onerror = () => {
        URL.revokeObjectURL(rawUrl);
        reject(new Error('Failed to load image for rotation correction'));
      };
      rawImg.src = rawUrl;
    });

    const isSwapped = orientation >= 5 && orientation <= 8;
    const rawW = rawImg.naturalWidth || rawImg.width;
    const rawH = rawImg.naturalHeight || rawImg.height;

    uprightCanvas = document.createElement('canvas');
    uprightCanvas.width = isSwapped ? rawH : rawW;
    uprightCanvas.height = isSwapped ? rawW : rawH;

    const ctx = uprightCanvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(rawUrl);
      throw new Error('Canvas 2D context unavailable for orientation');
    }

    ctx.save();
    drawImageWithOrientation(ctx, rawImg, orientation, rawW, rawH);
    ctx.restore();

    URL.revokeObjectURL(rawUrl);
  }

  // Convert upright canvas to Blob and load into new HTMLImageElement
  const uprightBlob: Blob = await new Promise((resolve, reject) => {
    uprightCanvas!.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to bake upright canvas to blob'));
      },
      source.type === 'image/png' ? 'image/png' : 'image/jpeg',
      0.98
    );
  });

  // Free canvas GPU memory immediately
  uprightCanvas.width = 0;
  uprightCanvas.height = 0;

  const uprightUrl = URL.createObjectURL(uprightBlob);
  const uprightImg = new Image();
  await new Promise<void>((resolve, reject) => {
    uprightImg.onload = () => resolve();
    uprightImg.onerror = () => {
      URL.revokeObjectURL(uprightUrl);
      reject(new Error('Failed to load upright image element'));
    };
    uprightImg.src = uprightUrl;
  });

  if ('decode' in uprightImg) {
    try {
      await uprightImg.decode();
    } catch {
      // Fallback
    }
  }

  return {
    img: uprightImg,
    width: uprightImg.naturalWidth || uprightImg.width,
    height: uprightImg.naturalHeight || uprightImg.height,
    orientation,
    wasRotated: true,
    cleanObjectUrl: uprightUrl,
  };
}
