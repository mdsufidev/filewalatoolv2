// @ts-ignore
import heic2any from 'heic2any';

/**
 * Converts a HEIC or HEIF file/blob to a standard JPEG Blob client-side.
 */
export async function convertHeicToJpeg(file: File | Blob, quality = 0.92): Promise<Blob> {
  try {
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
    throw new Error(
      error?.message ||
        'Failed to decode HEIC image. The file might be corrupted or in an unsupported HEIF profile.'
    );
  }
}
