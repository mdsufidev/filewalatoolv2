/**
 * JPEG DPI Metadata & Government Portal Size Constraint Utilities
 * FileWala Tool - 100% Client-Side Pure Browser Processing
 */

/**
 * Embeds JFIF APP0 DPI metadata (200 DPI or 300 DPI) into a JPEG Blob.
 */
export async function embedJpegDpi(blob: Blob, dpi: number = 200): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validate SOI marker (0xFF, 0xD8)
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return blob; // Not a standard JPEG
  }

  // Check if first marker is APP0 (0xFF, 0xE0)
  if (bytes[2] === 0xFF && bytes[3] === 0xE0) {
    // Check for "JFIF\0" identifier at offset 6..10
    if (
      bytes[6] === 0x4A && // J
      bytes[7] === 0x46 && // F
      bytes[8] === 0x49 && // I
      bytes[9] === 0x46 && // F
      bytes[10] === 0x00  // \0
    ) {
      // Modify in place
      bytes[13] = 1; // Units: 1 = dots per inch (DPI)
      bytes[14] = (dpi >> 8) & 0xFF; // Xdensity high
      bytes[15] = dpi & 0xFF;        // Xdensity low
      bytes[16] = (dpi >> 8) & 0xFF; // Ydensity high
      bytes[17] = dpi & 0xFF;        // Ydensity low
      return new Blob([bytes], { type: 'image/jpeg' });
    }
  }

  // If no APP0 JFIF found right after SOI, construct and insert a 18-byte JFIF segment
  const jfifSegment = new Uint8Array([
    0xFF, 0xE0, // APP0 marker
    0x00, 0x10, // Length = 16 bytes (excluding marker)
    0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // Version 1.01
    0x01,       // Units: 1 = DPI
    (dpi >> 8) & 0xFF, dpi & 0xFF, // Xdensity
    (dpi >> 8) & 0xFF, dpi & 0xFF, // Ydensity
    0x00, 0x00  // Xthumbnail = 0, Ythumbnail = 0
  ]);

  const output = new Uint8Array(bytes.length + jfifSegment.length);
  // Copy SOI (first 2 bytes)
  output.set(bytes.subarray(0, 2), 0);
  // Insert APP0 segment
  output.set(jfifSegment, 2);
  // Copy remainder of original JPEG
  output.set(bytes.subarray(2), 2 + jfifSegment.length);

  return new Blob([output], { type: 'image/jpeg' });
}

/**
 * Reads embedded DPI and JFIF headers from a JPEG Blob.
 */
export async function readJpegDpi(
  blob: Blob
): Promise<{ dpiX: number; dpiY: number; unit: 'DPI' | 'DPC' | 'None'; hasJfif: boolean } | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 18 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      return null;
    }

    let offset = 2;
    while (offset < bytes.length - 4) {
      if (bytes[offset] !== 0xFF) break;
      const marker = bytes[offset + 1];

      // Found APP0
      if (marker === 0xE0) {
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (
          bytes[offset + 4] === 0x4A && // J
          bytes[offset + 5] === 0x46 && // F
          bytes[offset + 6] === 0x49 && // I
          bytes[offset + 7] === 0x46 && // F
          bytes[offset + 8] === 0x00    // \0
        ) {
          const unitCode = bytes[offset + 11];
          const dpiX = (bytes[offset + 12] << 8) | bytes[offset + 13];
          const dpiY = (bytes[offset + 14] << 8) | bytes[offset + 15];
          const unit = unitCode === 1 ? 'DPI' : unitCode === 2 ? 'DPC' : 'None';
          return { dpiX, dpiY, unit, hasJfif: true };
        }
        offset += 2 + length;
      } else if (marker === 0xDA) {
        // Start of scan - stop parsing headers
        break;
      } else {
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        offset += 2 + length;
      }
    }
  } catch {
    // Non-blocking parse error
  }
  return null;
}

/**
 * Safely adds standard JPEG Comment padding (0xFF, 0xFE) to bring
 * a JPEG file size up to a required portal minimum (e.g., minimum 20 KB).
 */
export async function padJpegToMinBytes(blob: Blob, minBytes: number): Promise<Blob> {
  if (blob.size >= minBytes) return blob;

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const neededPadding = minBytes - bytes.length;
  // COM segment overhead: 2 bytes marker (0xFF, 0xFE) + 2 bytes length = 4 bytes
  if (neededPadding <= 4) return blob;

  const commentLength = Math.min(65535, neededPadding);
  const commentPayloadLength = commentLength - 2; // length field counts itself

  const comSegment = new Uint8Array(commentLength + 2);
  comSegment[0] = 0xFF;
  comSegment[1] = 0xFE; // COM marker
  comSegment[2] = (commentLength >> 8) & 0xFF;
  comSegment[3] = commentLength & 0xFF;

  const prefix = 'PAN_PORTAL_SAFE_PAD:';
  for (let i = 0; i < prefix.length && i < commentPayloadLength; i++) {
    comSegment[4 + i] = prefix.charCodeAt(i);
  }
  for (let i = prefix.length; i < commentPayloadLength; i++) {
    comSegment[4 + i] = 0x20; // fill with spaces
  }

  // Insert COM segment right before SOS (0xFF 0xDA) or after SOI/APP0
  const output = new Uint8Array(bytes.length + comSegment.length);
  output.set(bytes.subarray(0, 2), 0);
  output.set(comSegment, 2);
  output.set(bytes.subarray(2), 2 + comSegment.length);

  return new Blob([output], { type: 'image/jpeg' });
}

/**
 * Optimizes an HTML Canvas element to hit an exact KB range and embeds DPI.
 * Perfect for Protean (NSDL) and UTIITSL government portal upload compliance.
 */
export async function compressCanvasToPortalSpecs(
  canvas: HTMLCanvasElement,
  options: {
    minKb?: number;
    maxKb: number;
    dpi: number;
  }
): Promise<{
  blob: Blob;
  sizeBytes: number;
  sizeKb: number;
  quality: number;
  isCompliant: boolean;
}> {
  const minBytes = (options.minKb || 0) * 1024;
  const maxBytes = options.maxKb * 1024;
  const targetDpi = options.dpi || 200;

  let bestBlob: Blob | null = null;
  let bestQuality = 0.92;

  // Binary search for quality to stay below maxBytes
  let low = 0.35;
  let high = 0.98;

  for (let i = 0; i < 7; i++) {
    const mid = (low + high) / 2;
    const rawBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', mid)
    );
    const withDpi = await embedJpegDpi(rawBlob, targetDpi);

    if (withDpi.size <= maxBytes) {
      bestBlob = withDpi;
      bestQuality = mid;
      low = mid; // Try for better visual clarity
    } else {
      high = mid; // File is too big, decrease quality
    }
  }

  // If still too large, force lowest quality
  if (!bestBlob || bestBlob.size > maxBytes) {
    const rawBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.25)
    );
    bestBlob = await embedJpegDpi(rawBlob, targetDpi);
    bestQuality = 0.25;
  }

  // If minKb is specified and file is below minimum, pad it safely
  if (minBytes > 0 && bestBlob.size < minBytes) {
    // Add small buffer so it lands securely above minBytes (e.g., +1.5 KB)
    const targetPaddedBytes = Math.min(maxBytes - 1024, minBytes + 2048);
    bestBlob = await padJpegToMinBytes(bestBlob, targetPaddedBytes);
  }

  const finalSizeBytes = bestBlob.size;
  const finalSizeKb = Math.round((finalSizeBytes / 1024) * 10) / 10;
  const isCompliant =
    finalSizeBytes <= maxBytes && (minBytes === 0 || finalSizeBytes >= minBytes);

  return {
    blob: bestBlob,
    sizeBytes: finalSizeBytes,
    sizeKb: finalSizeKb,
    quality: Math.round(bestQuality * 100) / 100,
    isCompliant,
  };
}
