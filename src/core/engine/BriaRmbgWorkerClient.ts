/**
 * BriaRmbgWorkerClient.ts
 * Manages background Web Worker for client-side BRIA RMBG-1.4 Background Removal.
 * Offloads ONNX Runtime Web WebGPU/WASM inference to an isolated background thread
 * so the React UI never freezes.
 */

import { BRIA_RMBG_WORKER_CODE } from './briaRmbgWorkerScript';

export interface RmbgWorkerResult {
  alphaBuffer: ArrayBuffer;
  maskDim: number;
  elapsedMs: number;
}

export class BriaRmbgWorkerClient {
  private worker: Worker | null = null;
  private workerBlobUrl: string | null = null;
  private currentTaskId = 0;
  private activeReject: ((err: any) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const blob = new Blob([BRIA_RMBG_WORKER_CODE], { type: 'application/javascript' });
      this.workerBlobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerBlobUrl);
      return true;
    } catch (e) {
      console.warn('[BriaRmbgWorkerClient] Worker init failed, fallback mode:', e);
      this.worker = null;
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.worker !== null;
  }

  public warmup(hasWebGPU: boolean): void {
    if (!this.worker) {
      if (!this.initWorker()) return;
    }
    try {
      this.worker?.postMessage({ type: 'warmup', hasWebGPU });
    } catch (e) {
      // ignore
    }
  }

  public removeBackground(options: {
    imageBuffer: ArrayBuffer;
    hasWebGPU: boolean;
    onProgress?: (percent: number, stage: string) => void;
  }): Promise<RmbgWorkerResult> {
    const { imageBuffer, hasWebGPU, onProgress } = options;

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        if (!this.initWorker()) {
          reject(new Error('Background Web Worker is not supported on this browser'));
          return;
        }
      }

      const taskId = ++this.currentTaskId;
      this.activeReject = reject;

      const handleMessage = (e: MessageEvent) => {
        const data = e.data;
        if (!data || data.id !== taskId) return;

        if (data.type === 'progress') {
          onProgress?.(data.percent, data.stage);
        } else if (data.type === 'result') {
          this.worker?.removeEventListener('message', handleMessage);
          this.worker?.removeEventListener('error', handleError);
          this.activeReject = null;
          resolve({
            alphaBuffer: data.alphaBuffer,
            maskDim: data.maskDim,
            elapsedMs: data.elapsedMs,
          });
        } else if (data.type === 'error') {
          this.worker?.removeEventListener('message', handleMessage);
          this.worker?.removeEventListener('error', handleError);
          this.activeReject = null;
          reject(new Error(data.error || 'BRIA RMBG-1.4 processing failed'));
        }
      };

      const handleError = (e: ErrorEvent) => {
        this.worker?.removeEventListener('message', handleMessage);
        this.worker?.removeEventListener('error', handleError);
        this.activeReject = null;
        reject(new Error(e.message || 'Worker thread encountered an unexpected error'));
      };

      this.worker!.addEventListener('message', handleMessage);
      this.worker!.addEventListener('error', handleError);

      this.worker!.postMessage(
        {
          type: 'remove_background',
          id: taskId,
          imageBuffer,
          hasWebGPU,
        },
        [imageBuffer]
      );
    });
  }

  public terminate() {
    if (this.activeReject) {
      this.activeReject(new Error('Worker terminated'));
      this.activeReject = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }
  }
}
