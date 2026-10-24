/**
 * Local Storage Recent Files History Manager for FileWala
 * Stores up to 5 recently generated documents and photos locally in localStorage
 * Allows users to re-download or re-process files without re-uploading.
 */

export interface RecentFileRecord {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  timestamp: number;
  toolSection: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  toolId: string;
  toolName: string;
  dataUrl: string; // Base64 Data URL representation
  previewUrl?: string; // Optional thumbnail
}

export interface PendingReProcessState {
  fileRecord: RecentFileRecord;
  targetToolId: string;
  targetSection: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  timestamp: number;
}

const RECENT_FILES_STORAGE_KEY = 'filewala_recent_files_history_v1';
const PENDING_REPROCESS_STORAGE_KEY = 'filewala_pending_reprocess_v1';
export const MAX_RECENT_FILES = 5;

// In-memory cache for ultra-fast access
let recentFilesCache: RecentFileRecord[] | null = null;
let pendingReProcessCache: PendingReProcessState | null = null;

/**
 * Infer tool metadata based on active hash, current route, or filename
 */
export function inferToolMeta(
  filename: string,
  activeHash?: string
): {
  toolSection: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  toolId: string;
  toolName: string;
} {
  const hash = (activeHash || (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase();
  const lowerName = filename.toLowerCase();

  // Hash route matching
  if (hash.includes('pan-photo')) {
    return { toolSection: 'document-tools', toolId: 'pan-photo-resize', toolName: 'PAN Photo Resizer' };
  }
  if (hash.includes('signature-resize') || hash.includes('pan-signature')) {
    return { toolSection: 'document-tools', toolId: 'signature-resize', toolName: 'PAN Signature Resizer' };
  }
  if (hash.includes('passport-photo')) {
    return { toolSection: 'document-tools', toolId: 'passport-photo-resize', toolName: 'Passport Photo Resizer' };
  }
  if (hash.includes('passport-signature')) {
    return { toolSection: 'document-tools', toolId: 'passport-signature-resize', toolName: 'Passport Signature Resizer' };
  }
  if (hash.includes('upsc-photo') || hash.includes('upsc')) {
    return { toolSection: 'document-tools', toolId: 'upsc-photo-maker', toolName: 'UPSC Photo Maker' };
  }
  if (hash.includes('ssc')) {
    return { toolSection: 'document-tools', toolId: 'ssc-resizer', toolName: 'SSC Resizer' };
  }
  if (hash.includes('gov-compressor') || hash.includes('gov')) {
    return { toolSection: 'document-tools', toolId: 'gov-compressor', toolName: 'Gov Document Compressor' };
  }
  if (hash.includes('merge-pdf') || hash.includes('merge')) {
    return { toolSection: 'pdf-tools', toolId: 'merge-pdf', toolName: 'Merge PDF' };
  }
  if (hash.includes('compress-pdf') || (hash.includes('compress') && lowerName.endsWith('.pdf'))) {
    return { toolSection: 'pdf-tools', toolId: 'compress-pdf', toolName: 'Compress PDF' };
  }
  if (hash.includes('split-pdf') || hash.includes('split')) {
    return { toolSection: 'pdf-tools', toolId: 'split-pdf', toolName: 'Split PDF' };
  }
  if (hash.includes('rotate-pdf') || hash.includes('rotate')) {
    return { toolSection: 'pdf-tools', toolId: 'rotate-pdf', toolName: 'Rotate PDF' };
  }
  if (hash.includes('to-image') || hash.includes('to-jpg') || hash.includes('pdf-to-jpg')) {
    return { toolSection: 'pdf-tools', toolId: 'pdf-to-jpg', toolName: 'PDF to Image' };
  }
  if (hash.includes('image-to-pdf')) {
    return { toolSection: 'pdf-tools', toolId: 'image-to-pdf', toolName: 'Image to PDF' };
  }
  if (hash.includes('pdf-to-text') || hash.includes('ocr')) {
    return { toolSection: 'pdf-tools', toolId: 'pdf-to-text', toolName: 'PDF to Text / OCR' };
  }
  if (hash.includes('pdf-to-word') || hash.includes('word')) {
    return { toolSection: 'pdf-tools', toolId: 'pdf-to-word', toolName: 'PDF to Word' };
  }
  if (hash.includes('compressor')) {
    return { toolSection: 'image-tools', toolId: 'compressor', toolName: 'Image Compressor' };
  }
  if (hash.includes('resizer')) {
    return { toolSection: 'image-tools', toolId: 'resizer', toolName: 'Image Resizer' };
  }
  if (hash.includes('cropper') || hash.includes('crop')) {
    return { toolSection: 'image-tools', toolId: 'cropper', toolName: 'Crop & Rotate' };
  }
  if (hash.includes('convert') || hash.includes('converter')) {
    return { toolSection: 'convert', toolId: 'image-converter', toolName: 'Format Converter' };
  }

  // Filename heuristics
  if (lowerName.includes('pan_photo') || lowerName.includes('pan-photo')) {
    return { toolSection: 'document-tools', toolId: 'pan-photo-resize', toolName: 'PAN Photo Resizer' };
  }
  if (lowerName.includes('passport_photo') || lowerName.includes('passport-photo')) {
    return { toolSection: 'document-tools', toolId: 'passport-photo-resize', toolName: 'Passport Photo Resizer' };
  }
  if (lowerName.includes('upsc_photo') || lowerName.includes('upsc')) {
    return { toolSection: 'document-tools', toolId: 'upsc-photo-maker', toolName: 'UPSC Photo Maker' };
  }
  if (lowerName.includes('ssc_')) {
    return { toolSection: 'document-tools', toolId: 'ssc-resizer', toolName: 'SSC Resizer' };
  }
  if (lowerName.includes('signature')) {
    return { toolSection: 'document-tools', toolId: 'signature-resize', toolName: 'Signature Resizer' };
  }
  if (lowerName.includes('gov_compressed') || lowerName.includes('gov-doc')) {
    return { toolSection: 'document-tools', toolId: 'gov-compressor', toolName: 'Gov Document Compressor' };
  }
  if (lowerName.endsWith('.pdf')) {
    return { toolSection: 'pdf-tools', toolId: 'compress-pdf', toolName: 'PDF Document' };
  }
  if (lowerName.includes('compressed')) {
    return { toolSection: 'image-tools', toolId: 'compressor', toolName: 'Image Compressor' };
  }
  if (lowerName.includes('resized')) {
    return { toolSection: 'image-tools', toolId: 'resizer', toolName: 'Image Resizer' };
  }

  return { toolSection: 'image-tools', toolId: 'compressor', toolName: 'Document Optimizer' };
}

/**
 * Retrieve recent files list from localStorage
 */
export function getRecentFiles(): RecentFileRecord[] {
  if (recentFilesCache !== null) {
    return recentFilesCache;
  }

  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
    if (!raw) {
      recentFilesCache = [];
      return [];
    }
    const parsed: RecentFileRecord[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentFilesCache = parsed.slice(0, MAX_RECENT_FILES);
      return recentFilesCache;
    }
  } catch (err) {
    console.warn('Failed to parse recent files from localStorage', err);
  }

  recentFilesCache = [];
  return [];
}

/**
 * Save files array to localStorage safely handling quota limits
 */
function saveRecentFilesToStorage(list: RecentFileRecord[]): void {
  if (typeof window === 'undefined') return;

  const trimmed = list.slice(0, MAX_RECENT_FILES);
  recentFilesCache = trimmed;

  try {
    localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (quotaError) {
    console.warn('localStorage quota exceeded while saving recent files. Trimming data payloads...', quotaError);
    // If quota exceeded, try dropping the oldest items or truncate dataUrls
    try {
      const smaller = trimmed.slice(0, 3);
      localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(smaller));
      recentFilesCache = smaller;
    } catch {
      try {
        // As an emergency fallback, retain metadata with miniature or omitted dataUrl
        const metaOnly = trimmed.map((item) => ({
          ...item,
          dataUrl: item.dataUrl.length > 50000 ? '' : item.dataUrl,
        }));
        localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(metaOnly));
        recentFilesCache = metaOnly;
      } catch (finalErr) {
        console.error('Could not save recent files even with reduced payload', finalErr);
      }
    }
  }

  // Notify all components in the app
  window.dispatchEvent(new CustomEvent('filewala:recent-files-updated', { detail: { files: recentFilesCache } }));
}

/**
 * Converts a Blob to a Base64 data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts Base64 data URL to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binaryString = atob(parts[1] || '');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Converts Base64 data URL back into a File object for seamless re-processing
 */
export function dataUrlToFile(dataUrl: string, filename: string, mimeType?: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, {
    type: mimeType || blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
}

/**
 * Generates a thumbnail for an image blob
 */
async function generateThumbnail(blob: Blob, maxWidth = 120, maxHeight = 120): Promise<string | undefined> {
  if (!blob.type.startsWith('image/')) return undefined;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumbDataUrl);
        } else {
          resolve(undefined);
        }
      } catch {
        resolve(undefined);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
  });
}

/**
 * Record a newly generated document or photo into the Recent Files history
 */
export async function addRecentFile(
  blob: Blob,
  filename: string,
  toolMeta?: Partial<RecentFileRecord>
): Promise<RecentFileRecord> {
  const dataUrl = await blobToDataUrl(blob);
  const inferred = inferToolMeta(filename);

  const thumbnail = await generateThumbnail(blob);

  const newRecord: RecentFileRecord = {
    id: `rf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: filename,
    sizeBytes: blob.size,
    mimeType: blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    timestamp: Date.now(),
    toolSection: toolMeta?.toolSection || inferred.toolSection,
    toolId: toolMeta?.toolId || inferred.toolId,
    toolName: toolMeta?.toolName || inferred.toolName,
    dataUrl,
    previewUrl: thumbnail || (blob.type.startsWith('image/') ? dataUrl : undefined),
  };

  const current = getRecentFiles();
  // Filter out any matching filename or id to prevent duplicates
  const filtered = current.filter((item) => item.name !== filename && item.id !== newRecord.id);
  const updated = [newRecord, ...filtered].slice(0, MAX_RECENT_FILES);

  saveRecentFilesToStorage(updated);
  return newRecord;
}

/**
 * Remove a specific item from Recent Files history
 */
export function removeRecentFile(id: string): void {
  const current = getRecentFiles();
  const updated = current.filter((item) => item.id !== id);
  saveRecentFilesToStorage(updated);
}

/**
 * Clear all Recent Files history from localStorage
 */
export function clearRecentFiles(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(RECENT_FILES_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  recentFilesCache = [];
  window.dispatchEvent(new CustomEvent('filewala:recent-files-updated', { detail: { files: [] } }));
}

/**
 * Trigger download of a Recent File
 */
export function downloadRecentFile(file: RecentFileRecord): void {
  try {
    const blob = dataUrlToBlob(file.dataUrl);
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (err) {
    console.error('Failed to download recent file', err);
  }
}

/**
 * Set a file to be re-processed by a tool
 */
export function setPendingReProcess(
  fileRecord: RecentFileRecord,
  targetToolId?: string,
  targetSection?: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools'
): void {
  const state: PendingReProcessState = {
    fileRecord,
    targetToolId: targetToolId || fileRecord.toolId,
    targetSection: targetSection || fileRecord.toolSection,
    timestamp: Date.now(),
  };

  pendingReProcessCache = state;

  if (typeof window !== 'undefined') {
    try {
      // Store in sessionStorage or in-memory
      sessionStorage.setItem(PENDING_REPROCESS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('filewala:reprocess-trigger', { detail: state }));
  }
}

/**
 * Get the currently pending re-process state
 */
export function getPendingReProcess(): PendingReProcessState | null {
  if (pendingReProcessCache) {
    return pendingReProcessCache;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(PENDING_REPROCESS_STORAGE_KEY);
      if (raw) {
        pendingReProcessCache = JSON.parse(raw);
        return pendingReProcessCache;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Clear the pending re-process state after a tool successfully consumes it
 */
export function clearPendingReProcess(): void {
  pendingReProcessCache = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(PENDING_REPROCESS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
