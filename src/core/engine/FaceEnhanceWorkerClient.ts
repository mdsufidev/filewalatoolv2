/**
 * FaceEnhanceWorkerClient.ts
 * Manages background Web Worker lifecycle and provides Promise-based
 * offloading for non-blocking UI during heavy AI enhancement and super-resolution.
 */

import { FACE_WORKER_CODE } from './faceWorkerScript';
import { FaceEnhanceSettings } from './FaceEnhancerEngine';

export class FaceEnhanceWorkerClient {
  private worker: Worker | null = null;
  private workerBlobUrl: string | null = null;
  private currentTaskId = 0;
  private activeReject: ((err: any) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;
    try {
      const blob = new Blob([FACE_WORKER_CODE], { type: 'application/javascript' });
      this.workerBlobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerBlobUrl);
    } catch (e) {
      console.warn('Inline Web Worker initialization failed, will fallback to main thread:', e);
      this.worker = null;
    }
  }

  public process(
    imageData: ImageData,
    settings: FaceEnhanceSettings,
    upscale: 1 | 2 | 4 = 1,
    onProgress?: (percent: number, stage: string) => void
  ): Promise<ImageData> {
    const taskId = ++this.currentTaskId;

    if (!this.worker) {
      // Fallback if worker not available
      return Promise.reject(new Error('Web Worker not initialized'));
    }

    return new Promise<ImageData>((resolve, reject) => {
      this.activeReject = reject;

      const handleMessage = (e: MessageEvent) => {
        const msg = e.data;
        if (!msg || msg.id !== taskId) return;

        if (msg.type === 'progress') {
          if (onProgress) {
            onProgress(msg.percent, msg.stage);
          }
        } else if (msg.type === 'complete') {
          if (this.worker) {
            this.worker.removeEventListener('message', handleMessage);
            this.worker.removeEventListener('error', handleError);
          }
          this.activeReject = null;
          const outData = new ImageData(
            new Uint8ClampedArray(msg.buffer),
            msg.width,
            msg.height
          );
          resolve(outData);
        } else if (msg.type === 'error') {
          if (this.worker) {
            this.worker.removeEventListener('message', handleMessage);
            this.worker.removeEventListener('error', handleError);
          }
          this.activeReject = null;
          reject(new Error(msg.error || 'Worker enhancement failed'));
        }
      };

      const handleError = (e: ErrorEvent) => {
        if (this.worker) {
          this.worker.removeEventListener('message', handleMessage);
          this.worker.removeEventListener('error', handleError);
        }
        this.activeReject = null;
        reject(new Error(e.message || 'Worker thread encountered an unexpected error'));
      };

      if (this.worker) {
        this.worker.addEventListener('message', handleMessage);
        this.worker.addEventListener('error', handleError);

        // Clone buffer to transfer without mutating source
        const bufferCopy = imageData.data.buffer.slice(0);
        this.worker.postMessage(
          {
            type: 'enhance',
            id: taskId,
            buffer: bufferCopy,
            width: imageData.width,
            height: imageData.height,
            settings: settings,
            upscale: upscale,
          },
          [bufferCopy]
        );
      }
    });
  }

  public terminate() {
    if (this.activeReject) {
      this.activeReject(new Error('Enhancement task cancelled'));
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
