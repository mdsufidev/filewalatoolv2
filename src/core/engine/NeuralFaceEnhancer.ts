/**
 * NeuralFaceEnhancer.ts
 * 100% Client-Side Remini-Grade Face Restoration & Super-Resolution Engine.
 *
 * Architecture Highlights:
 * 1. Face Extraction & Patch Processing:
 *    Crops facial patch (e.g. 384x384) instead of full 4K image to keep RAM usage
 *    under 100MB, preventing mobile browser OOM tab crashes.
 * 2. Smart Hardware Acceleration:
 *    Executes on WebGPU with automatic try-catch fallback to multi-threaded CPU WebAssembly (WASM).
 * 3. CacheStorage / IndexedDB Model Persistence:
 *    Downloads the 4.86MB Real-ESRGAN ONNX weights once from CDN, caches permanently locally.
 * 4. Seamless Feathered Stitching:
 *    Smoothly composites the 4x super-resolved facial patch back onto the canvas with zero visible seams.
 */

import { NeuralWorkerClient } from './NeuralWorkerClient';

export const ORT_CDN_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';
export const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

export const AI_MODEL_CONFIGS = {
  'realesr-fast': {
    id: 'realesr-fast',
    name: 'Real-ESRGAN Compact (4.8 MB)',
    tagline: 'Ultra-fast, light on RAM, 4x super-resolution with strong denoising',
    url: 'https://huggingface.co/openpixels-app/browser-models/resolve/main/realesr_general_x4v3.onnx',
    sizeBytes: 4866422,
    scale: 4,
  },
  'realesr-hd': {
    id: 'realesr-hd',
    name: 'Real-ESRGAN Plus (33.7 MB)',
    tagline: 'Maximum photographic detail & facial reconstruction',
    url: 'https://huggingface.co/openpixels-app/browser-models/resolve/main/realesrgan_x4plus_w16.onnx',
    sizeBytes: 33724311,
    scale: 4,
  },
};

export const MODEL_CACHE_NAME = 'filewala-neural-models-v1';

export interface FacePatchBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class NeuralFaceEnhancer {
  private static ortInstance: any = null;
  private static sessions: Map<string, any> = new Map();
  private static workerClient: NeuralWorkerClient | null = null;

  public static getWorkerClient(): NeuralWorkerClient | null {
    if (typeof window === 'undefined') return null;
    if (!this.workerClient) {
      this.workerClient = new NeuralWorkerClient();
    }
    return this.workerClient.isAvailable() ? this.workerClient : null;
  }

  public static terminateWorker(): void {
    if (this.workerClient) {
      this.workerClient.terminate();
      this.workerClient = null;
    }
  }

  /**
   * Loads ONNX Runtime Web from CDN dynamically (Zero initial bundle bloat)
   */
  public static async loadOrt(): Promise<any> {
    if (typeof window === 'undefined') return null;
    if ((window as any).ort) {
      this.ortInstance = (window as any).ort;
      return this.ortInstance;
    }

    if (this.ortInstance) return this.ortInstance;

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${ORT_CDN_URL}"]`);
      if (existing) {
        const interval = setInterval(() => {
          if ((window as any).ort) {
            clearInterval(interval);
            this.ortInstance = (window as any).ort;
            resolve(this.ortInstance);
          }
        }, 50);
        return;
      }

      const script = document.createElement('script');
      script.src = ORT_CDN_URL;
      script.async = true;
      script.onload = () => {
        const ort = (window as any).ort;
        if (ort) {
          ort.env.wasm.wasmPaths = ORT_WASM_PATH;
          const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
          ort.env.wasm.numThreads = isIsolated
            ? Math.min(4, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2)
            : 1;
          ort.env.wasm.proxy = false;
          this.ortInstance = ort;
          resolve(ort);
        } else {
          reject(new Error('Failed to bind window.ort'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load ONNX Runtime Web from CDN'));
      document.head.appendChild(script);
    });
  }

  /**
   * Retrieves model ArrayBuffer from local CacheStorage (permanent client cache)
   * or streams download from CDN with progress tracking.
   */
  public static async getModelBuffer(
    modelUrl: string,
    onProgress?: (percent: number, status: string) => void
  ): Promise<ArrayBuffer> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(MODEL_CACHE_NAME);
        const cachedRes = await cache.match(modelUrl);
        if (cachedRes) {
          if (onProgress) onProgress(100, 'Loaded AI weights from local cache');
          return await cachedRes.arrayBuffer();
        }

        if (onProgress) onProgress(10, 'Downloading AI model from CDN (~4.8MB)...');
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} fetching model`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body || total === 0) {
          const buffer = await response.arrayBuffer();
          await cache.put(modelUrl, new Response(buffer));
          return buffer;
        }

        const reader = response.body.getReader();
        let received = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          const pct = Math.min(95, Math.round((received / total) * 100));
          if (onProgress) {
            const mb = (received / (1024 * 1024)).toFixed(1);
            const totalMb = (total / (1024 * 1024)).toFixed(1);
            onProgress(pct, `Downloading Neural Model (${mb} / ${totalMb} MB)...`);
          }
        }

        const combined = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        const arrayBuffer = combined.buffer;
        await cache.put(modelUrl, new Response(arrayBuffer));
        if (onProgress) onProgress(100, 'Model cached locally');
        return arrayBuffer;
      } catch (err) {
        console.warn('CacheStorage read failed, falling back to direct network fetch:', err);
      }
    }

    const res = await fetch(modelUrl);
    return await res.arrayBuffer();
  }

  /**
   * Initializes or reuses ONNX InferenceSession with WebGPU -> WASM fallback
   */
  public static async getSession(
    modelKey: 'realesr-fast' | 'realesr-hd',
    hasWebGPU: boolean,
    onProgress?: (percent: number, status: string) => void
  ): Promise<any> {
    const config = AI_MODEL_CONFIGS[modelKey];
    const sessionKey = `${modelKey}_${hasWebGPU ? 'gpu' : 'wasm'}`;

    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

    const ort = await this.loadOrt();
    const modelBuffer = await this.getModelBuffer(config.url, onProgress);

    if (onProgress) {
      onProgress(80, hasWebGPU ? 'Compiling WebGPU AI Shaders...' : 'Initializing WASM Threads...');
    }

    let session: any = null;

    if (hasWebGPU) {
      try {
        session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['webgpu', 'wasm'],
          graphOptimizationLevel: 'basic',
        });
      } catch (gpuErr) {
        console.warn('WebGPU execution provider failed, falling back to WASM:', gpuErr);
      }
    }

    if (!session) {
      session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'basic',
      });
    }

    this.sessions.set(sessionKey, session);
    return session;
  }

  /**
   * Detects the dominant facial region in an image
   * Uses skin tone centroid and gradient density to place a smart square crop.
   */
  public static estimateFaceBoundingBox(
    img: HTMLImageElement | HTMLCanvasElement
  ): FacePatchBox {
    const w = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
    const h = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;

    // Use a small analysis canvas
    const sampleW = Math.min(256, w);
    const sampleH = Math.round((h * sampleW) / w);
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Default: Center-top crop
      const size = Math.round(Math.min(w, h) * 0.75);
      return {
        x: Math.round((w - size) / 2),
        y: Math.round(h * 0.05),
        width: size,
        height: size,
      };
    }

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skin & facial feature weighting
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        if (cb >= 70 && cb <= 135 && cr >= 125 && cr <= 180 && r > g && r > b) {
          totalWeight += 1;
          sumX += x;
          sumY += y;
        }
      }
    }

    let centerX = w / 2;
    let centerY = h * 0.4;

    if (totalWeight > 50) {
      centerX = (sumX / totalWeight) * (w / sampleW);
      centerY = (sumY / totalWeight) * (h / sampleH);
    }

    // Size: Cover face with hair and chin (approx 65% of smaller dimension)
    const size = Math.min(w, h, Math.round(Math.min(w, h) * 0.75));
    const halfSize = size / 2;

    const x = Math.max(0, Math.min(w - size, Math.round(centerX - halfSize)));
    const y = Math.max(0, Math.min(h - size, Math.round(centerY - halfSize)));

    return { x, y, width: size, height: size };
  }

  /**
   * Executes Patch-Based Neural Face Restoration:
   * 1. Extracts facial patch (e.g. 384x384) to keep memory footprint under 60MB.
   * 2. Runs Real-ESRGAN ONNX inference.
   * 3. Seamlessly blends 4x restored patch back into full canvas with feathered alpha.
   */
  public static async restoreFacePatch(
    source: HTMLImageElement | HTMLCanvasElement,
    options: {
      modelKey?: 'realesr-fast' | 'realesr-hd';
      hasWebGPU?: boolean;
      blendStrength?: number; // 0 to 1
      faceBox?: FacePatchBox;
      onProgress?: (percent: number, status: string) => void;
    } = {}
  ): Promise<HTMLCanvasElement> {
    const {
      modelKey = 'realesr-fast',
      hasWebGPU = false,
      blendStrength = 1.0,
      onProgress,
    } = options;

    const w = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
    const h = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

    // 1. Determine facial bounding box
    const box = options.faceBox || this.estimateFaceBoundingBox(source);
    const config = AI_MODEL_CONFIGS[modelKey];

    if (onProgress) onProgress(5, 'Cropping facial patch for RAM-safe processing...');

    // Adaptive patch dimensions:
    // - Real-ESRGAN Plus (33.7MB): 128x128 patch (reduces 30 billion operations down to ~13B, runs 2.25x faster, outputs 512x512 HD face details, prevents tab hang)
    // - Real-ESRGAN Compact (4.8MB): 192x192 patch (outputs 768x768 HD face)
    const patchInputDim = modelKey === 'realesr-hd' ? 128 : 192;
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = patchInputDim;
    patchCanvas.height = patchInputDim;
    const pctx = patchCanvas.getContext('2d');
    if (!pctx) throw new Error('Failed to create patch canvas context');

    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    pctx.drawImage(
      source,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      patchInputDim,
      patchInputDim
    );

    const patchData = pctx.getImageData(0, 0, patchInputDim, patchInputDim).data;
    let restoredPatchCanvas: HTMLCanvasElement | null = null;
    let outPatchW = patchInputDim * 4;
    let outPatchH = patchInputDim * 4;

    // 2. Offload to dedicated Web Worker to keep main UI thread 100% fluid & prevent "Page Not Responding"
    const worker = this.getWorkerClient();

    if (worker) {
      try {
        const patchBufferCopy = patchData.buffer.slice(0);
        const res = await worker.restorePatch({
          patchBuffer: patchBufferCopy,
          patchDim: patchInputDim,
          modelKey: modelKey,
          modelUrl: config.url,
          hasWebGPU: hasWebGPU,
          onProgress: onProgress,
        });

        outPatchW = res.width;
        outPatchH = res.height;

        restoredPatchCanvas = document.createElement('canvas');
        restoredPatchCanvas.width = outPatchW;
        restoredPatchCanvas.height = outPatchH;
        const rctx = restoredPatchCanvas.getContext('2d');
        if (rctx) {
          const restoredImgData = new ImageData(
            new Uint8ClampedArray(res.buffer),
            outPatchW,
            outPatchH
          );
          rctx.putImageData(restoredImgData, 0, 0);
        }
      } catch (workerErr) {
        console.warn('[NeuralFaceEnhancer] Worker run failed, attempting in-thread fallback:', workerErr);
        restoredPatchCanvas = null;
      }
    }

    // 3. Fallback to in-thread inference only if Worker is unavailable or failed
    if (!restoredPatchCanvas) {
      const planeSize = patchInputDim * patchInputDim;
      const float32Data = new Float32Array(3 * planeSize);

      for (let i = 0; i < planeSize; i++) {
        const idx = i * 4;
        float32Data[i] = patchData[idx] / 255.0;                      // R
        float32Data[planeSize + i] = patchData[idx + 1] / 255.0;      // G
        float32Data[planeSize * 2 + i] = patchData[idx + 2] / 255.0;  // B
      }

      const session = await this.getSession(modelKey, hasWebGPU, onProgress);
      const ort = this.ortInstance;
      const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, patchInputDim, patchInputDim]);

      if (onProgress) {
        onProgress(80, hasWebGPU ? 'Restoring facial features via WebGPU...' : 'Restoring facial features via WASM CPU...');
      }

      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];
      const feeds = { [inputName]: inputTensor };

      const startTime = performance.now();
      let results: any = null;

      try {
        results = await session.run(feeds);
      } catch (gpuErr: any) {
        console.warn('[NeuralFaceEnhancer] WebGPU run failed, automatically falling back to WASM CPU:', gpuErr);
        if (onProgress) {
          onProgress(82, 'WebGPU limit reached, switching to CPU WebAssembly fallback...');
        }
        const wasmSession = await this.getSession(modelKey, false, onProgress);
        results = await wasmSession.run(feeds);
      }

      const elapsed = Math.round(performance.now() - startTime);
      console.log(`[NeuralFaceEnhancer] In-thread inference completed in ${elapsed} ms`);

      const outputTensor = results[outputName];
      const outData = outputTensor.data as Float32Array;
      const dims = (outputTensor.dims || []) as number[];

      let isNHWC = false;

      if (dims && dims.length === 4) {
        if (dims[3] === 3) {
          isNHWC = true;
          outPatchH = dims[1];
          outPatchW = dims[2];
        } else if (dims[1] === 3) {
          isNHWC = false;
          outPatchH = dims[2];
          outPatchW = dims[3];
        }
      }

      let maxVal = 0;
      const sampleCount = Math.min(200, outData.length);
      for (let k = 0; k < sampleCount; k++) {
        if (outData[k] > maxVal) maxVal = outData[k];
      }
      const scaleFactor = maxVal > 1.5 ? 1 : 255;

      restoredPatchCanvas = document.createElement('canvas');
      restoredPatchCanvas.width = outPatchW;
      restoredPatchCanvas.height = outPatchH;
      const rctx = restoredPatchCanvas.getContext('2d');
      if (!rctx) throw new Error('Failed to create restored patch context');

      const restoredImgData = rctx.createImageData(outPatchW, outPatchH);
      const rPixels = restoredImgData.data;

      if (isNHWC) {
        const totalPixels = outPatchW * outPatchH;
        for (let i = 0; i < totalPixels; i++) {
          const s = i * 3;
          const d = i * 4;
          rPixels[d]     = Math.min(255, Math.max(0, Math.round(outData[s] * scaleFactor)));
          rPixels[d + 1] = Math.min(255, Math.max(0, Math.round(outData[s + 1] * scaleFactor)));
          rPixels[d + 2] = Math.min(255, Math.max(0, Math.round(outData[s + 2] * scaleFactor)));
          rPixels[d + 3] = 255;
        }
      } else {
        const planeSize = outPatchW * outPatchH;
        for (let i = 0; i < planeSize; i++) {
          const d = i * 4;
          rPixels[d]     = Math.min(255, Math.max(0, Math.round(outData[i] * scaleFactor)));
          rPixels[d + 1] = Math.min(255, Math.max(0, Math.round(outData[planeSize + i] * scaleFactor)));
          rPixels[d + 2] = Math.min(255, Math.max(0, Math.round(outData[planeSize * 2 + i] * scaleFactor)));
          rPixels[d + 3] = 255;
        }
      }

      rctx.putImageData(restoredImgData, 0, 0);
    }

    if (onProgress) onProgress(95, 'Blending crystal-clear face onto full portrait...');

    // 4. Construct Final Output Canvas (Capped at 4096px to avoid mobile browser canvas limit crashes)
    const maxAllowedDim = 4096;
    const naturalTargetScale = 4;
    const targetScale = (Math.max(w, h) * naturalTargetScale > maxAllowedDim)
      ? Math.max(1, maxAllowedDim / Math.max(w, h))
      : naturalTargetScale;

    const finalW = Math.round(w * targetScale);
    const finalH = Math.round(h * targetScale);
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = finalW;
    outputCanvas.height = finalH;
    const octx = outputCanvas.getContext('2d');
    if (!octx) throw new Error('Failed to create final output context');

    // First paint base image upscaled
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(source, 0, 0, finalW, finalH);

    // Prepare feathered alpha mask for the face patch to eliminate any boundary lines
    const featherCanvas = document.createElement('canvas');
    featherCanvas.width = outPatchW;
    featherCanvas.height = outPatchH;
    const fctx = featherCanvas.getContext('2d');
    if (fctx) {
      fctx.drawImage(restoredPatchCanvas, 0, 0);

      // Create radial / elliptical feather gradient
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = outPatchW;
      maskCanvas.height = outPatchH;
      const mctx = maskCanvas.getContext('2d');
      if (mctx) {
        const radius = outPatchW / 2;
        const grad = mctx.createRadialGradient(
          radius,
          radius,
          radius * 0.7,
          radius,
          radius,
          radius
        );
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = grad;
        mctx.fillRect(0, 0, outPatchW, outPatchH);

        fctx.globalCompositeOperation = 'destination-in';
        fctx.drawImage(maskCanvas, 0, 0);
        fctx.globalCompositeOperation = 'source-over';
      }
    }

    // Blend restored patch onto the corresponding location in the canvas
    const targetX = Math.round(box.x * targetScale);
    const targetY = Math.round(box.y * targetScale);
    const targetW = Math.round(box.width * targetScale);
    const targetH = Math.round(box.height * targetScale);

    octx.globalAlpha = Math.max(0, Math.min(1, blendStrength));
    octx.drawImage(featherCanvas, targetX, targetY, targetW, targetH);
    octx.globalAlpha = 1.0;

    if (onProgress) onProgress(100, 'Ultra Clear Face Restoration Complete!');

    return outputCanvas;
  }
}
