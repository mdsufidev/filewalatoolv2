import { addRecentFile, RecentFileRecord } from './recentFiles';

/**
 * Safe Memory Management & File Utilities for FileWala
 */

// Active blob URLs registry for garbage collection
const activeObjectUrls = new Set<string>();

/**
 * Creates an Object URL and tracks it for safe revocation.
 */
export function createSafeObjectURL(blob: Blob | MediaSource): string {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.add(url);
  return url;
}

/**
 * Explicitly revokes a tracked Object URL to free browser memory immediately.
 */
export function revokeSafeObjectURL(url: string | null | undefined): void {
  if (!url) return;
  if (activeObjectUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore already revoked URLs
    }
    activeObjectUrls.delete(url);
  }
}

/**
 * Revokes all currently active Object URLs (e.g. on full reset or app unmount).
 */
export function revokeAllSafeObjectURLs(): void {
  activeObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
  });
  activeObjectUrls.clear();
}

/**
 * Formats byte values into human-readable strings (e.g., 2.4 MB, 450 KB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
}

/**
 * Validates whether a file is an accepted image format.
 */
export function isValidImageFile(file: File): boolean {
  const acceptedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/x-icon',
  ];
  return acceptedTypes.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp|avif|gif|bmp|svg|ico)$/i.test(file.name);
}

/**
 * Downloads a Blob directly with custom filename without sending data to any server.
 * Automatically saves the document into the local Recent Files history in localStorage.
 */
export function triggerFileDownload(
  blob: Blob,
  filename: string,
  toolMeta?: Partial<RecentFileRecord>
): void {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

  // Automatically record into local Recent Files history asynchronously
  addRecentFile(blob, filename, toolMeta).catch((err) => {
    console.warn('Failed to add to recent files history', err);
  });
}
