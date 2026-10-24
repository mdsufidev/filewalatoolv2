/**
 * Universal Clipboard Copy & Native Web Share Utilities for FileWala
 */

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Copies an image (Blob or URL string) to the user's system clipboard as PNG.
 * Browsers strictly enforce PNG for ClipboardItem image/png.
 */
export async function copyImageToClipboard(
  imageSource: Blob | string,
  options?: { width?: number; height?: number }
): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    return { success: false, error: 'Clipboard API not supported in this browser' };
  }

  try {
    // If it is already a PNG blob, write directly
    if (imageSource instanceof Blob && imageSource.type === 'image/png') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': imageSource }),
      ]);
      return { success: true };
    }

    // Otherwise, paint to canvas and export as PNG blob
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const objectUrl =
      imageSource instanceof Blob ? URL.createObjectURL(imageSource) : imageSource;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for clipboard copy'));
      img.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = options?.width || img.naturalWidth || img.width;
    canvas.height = options?.height || img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (imageSource instanceof Blob) URL.revokeObjectURL(objectUrl);
      return { success: false, error: 'Canvas 2D context unavailable' };
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (imageSource instanceof Blob) {
      URL.revokeObjectURL(objectUrl);
    }

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );

    if (!pngBlob) {
      return { success: false, error: 'Failed to convert image to PNG blob' };
    }

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to copy to clipboard' };
  }
}

/**
 * Invokes the native system share sheet (Mobile & Desktop) for files or images.
 */
export async function shareFileOrBlob(params: {
  blob: Blob;
  filename: string;
  title?: string;
  text?: string;
}): Promise<{ shared: boolean; cancelled?: boolean; error?: string }> {
  if (!isShareSupported()) {
    return { shared: false, error: 'Web Share API not supported' };
  }

  try {
    const file = new File([params.blob], params.filename, {
      type: params.blob.type || 'application/octet-stream',
    });

    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      // Fallback: share title & text without file attachment
      await navigator.share({
        title: params.title || 'FileWala',
        text: params.text || params.filename,
      });
      return { shared: true };
    }

    await navigator.share({
      title: params.title || 'FileWala Export',
      text: params.text || params.filename,
      files: [file],
    });

    return { shared: true };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { shared: false, cancelled: true };
    }
    return { shared: false, error: err?.message || 'Share failed' };
  }
}
