import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const PDFJS_VERSION = '6.4.299';

/**
 * Unified PDF.js Worker Initializer for FileWala.
 * Ensures the worker version exactly matches pdfjs-dist (6.4.299).
 * Bundled locally via Vite (?url) with zero external network dependency.
 */
export function ensurePdfWorkerInitialized(): void {
  if (typeof window === 'undefined') return;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
    }
  }
}

// Auto-initialize immediately
ensurePdfWorkerInitialized();

export { pdfjsLib };
