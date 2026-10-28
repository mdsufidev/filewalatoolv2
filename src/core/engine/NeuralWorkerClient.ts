/**
 * NeuralWorkerClient.ts
 * Manages background Web Worker for ONNX Runtime Web.
 * Keeps heavy GFPGAN v1.4 and CodeFormer quantized model processing
 * off the main UI thread to eliminate browser freezes and "Page Not Responding" alerts.
 */

import { NEURAL_WORKER_CODE } from './neuralWorkerScript';

export interface RestoredPatchResult {
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

export class NeuralWorkerClient {
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
      const blob = new Blob([NEURAL_WORKER_CODE], { type: 'application/javascript' });
      this.workerBlobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerBlobUrl);
      return true;
    } catch (e) {
      console.warn('[NeuralWorkerClient] Worker init failed, will use main thread fallback:', e);
      this.worker = null;
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.worker !== null;
  }

  public restorePatch(options: {
    patchBuffer: ArrayBuffer;
    patchDim: number;
    modelKey: string;
    modelUrl: string;
    hasWebGPU: boolean;
    onProgress?: (percent: number, stage: string) => void;
  }): Promise<RestoredPatchResult> {
    const { patchBuffer, patchDim, modelKey, modelUrl, hasWebGPU, onProgress } = options;

    if (!this.worker) {
      const success = this.initWorker();
      if (!success || !this.worker) {
        return Promise.reject(new Error('Web Worker not supported in this environment'));
      }
    }

    const taskId = ++this.currentTaskId;

    return new Promise<RestoredPatchResult>((resolve, reject) => {
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
          }
          this.activeReject = null;
          resolve({
            buffer: msg.buffer,
            width: msg.width,
            height: msg.height,
          });
        } else if (msg.type === 'error') {
          if (this.worker) {
            this.worker.removeEventListener('message', handleMessage);
          }
          this.activeReject = null;
          reject(new Error(msg.error || 'Neural worker enhancement failed'));
        }
      };

      if (this.worker) {
        this.worker.addEventListener('message', handleMessage);

        this.worker.postMessage(
          {
            type: 'restore_patch',
            id: taskId,
            patchBuffer: patchBuffer,
            patchDim: patchDim,
            modelKey: modelKey,
            modelUrl: modelUrl,
            hasWebGPU: hasWebGPU,
          },
          [patchBuffer]
        );
      }
    });
  }

  public terminate() {
    if (this.activeReject) {
      this.activeReject(new Error('Neural task cancelled'));
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
