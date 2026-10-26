/**
 * Converts a HEIC or HEIF file/blob to a standard JPEG Blob client-side.
 * Loads heic2any dynamically at runtime ONLY when a user processes a HEIC file.
 * This completely isolates the heavy libheif WebAssembly and inline worker from the main bundle,
 * preventing 'Tool Engine Error' and module evaluation crashes in browsers with strict security policies.
 */
export async function convertHeicToJpeg(file: File | Blob, quality = 0.92): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('HEIC decoding is only supported in browser environments.');
  }

  try {
    // Dynamically load heic2any only on demand
    const heic2anyModule = await import('heic2any');
    const heic2any = (heic2anyModule as any).default || heic2anyModule;

    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality,
    });

    if (Array.isArray(conversionResult)) {
      return conversionResult[0];
    }
    return conversionResult;
  } catch (error: any) {
    console.error('HEIC decoding failure:', error);
    throw new Error(
      error?.message ||
        'Failed to decode HEIC image. The file might be corrupted, or your browser security policy prevents inline Web Workers.'
    );
  }
}
