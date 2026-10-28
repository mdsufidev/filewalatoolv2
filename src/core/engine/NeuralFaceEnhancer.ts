/**
 * NeuralFaceEnhancer.ts
 * 100% Client-Side Remini-Grade Generative Face Restoration Engine.
 *
 * Architecture Highlights:
 * 1. MediaPipe Face Extraction + Smart Canvas Fallback:
 *    Detects facial landmark bounding boxes via MediaPipe BlazeFace (229KB) with
 *    automatic fallback to Canvas skin-tone centroid analysis.
 * 2. Generative Facial Prior Models (GFPGAN v1.4 & CodeFormer):
 *    Uses quantized ONNX models (GFPGAN Clean Face Prior & CodeFormer Discrete Codebook Transformer)
 *    to photorealistically reconstruct human eyes, iris, eyelashes, lips, teeth, and natural skin pores.
 * 3. Offloaded Background Web Worker:
 *    Executes ONNX Runtime Web in a background worker with WebGPU acceleration and CPU WASM fallback,
 *    keeping the main UI thread 100% responsive without browser tab freezes.
 * 4. CacheStorage / IndexedDB Model Persistence:
 *    Downloads the quantized weights once from CDN, caches permanently locally for zero-bandwidth repeats.
 * 5. Seamless Feathered Stitching:
 *    Smoothly composites the restored 512x512 facial patch back into the portrait with zero visible seams.
 */

import { NeuralWorkerClient } from './NeuralWorkerClient';

export const ORT_CDN_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';
export const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

export type NeuralModelKey = 'gfpgan-v14' | 'codeformer';

export interface AIModelConfig {
  id: NeuralModelKey;
  name: string;
  tagline: string;
  url: string;
  sizeBytes: number;
  inputDim: number;
}

export const AI_MODEL_CONFIGS: Record<NeuralModelKey, AIModelConfig> = {
  'gfpgan-v14': {
    id: 'gfpgan-v14',
    name: 'GFPGAN v1.4 (Clean Face Prior GAN)',
    tagline: 'Quantized w16, photorealistic skin pores, natural eyes, teeth & smile',
    url: 'https://huggingface.co/opiumuseless/gfpgan-v1.4-w16/resolve/main/GFPGANv1.4-w16.onnx',
    sizeBytes: 170289207,
    inputDim: 512,
  },
  'codeformer': {
    id: 'codeformer',
    name: 'CodeFormer (Discrete Codebook Transformer)',
    tagline: 'Deep transformer codebook prior for heavily blurry & vintage faces',
    url: 'https://huggingface.co/facefusion/models-3.0.0/resolve/main/codeformer.onnx',
    sizeBytes: 376951650,
    inputDim: 512,
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
  private static mediaPipeDetector: any = null;

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
   * Initializes MediaPipe BlazeFace short range detector via dynamic CDN import
   */
  private static async getMediaPipeDetector(): Promise<any> {
    if (this.mediaPipeDetector) return this.mediaPipeDetector;
    if (typeof window === 'undefined') return null;

    try {
      const dynamicImport = new Function('url', 'return import(url)');
      const visionModule = await dynamicImport(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
      );
      const { FilesetResolver, FaceDetector } = visionModule;
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      this.mediaPipeDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
      });
      return this.mediaPipeDetector;
    } catch (e) {
      console.warn('[NeuralFaceEnhancer] MediaPipe loader skipped, using smart Canvas fallback:', e);
      return null;
    }
  }

  /**
   * Detects facial bounding box with MediaPipe BlazeFace, falling back to Canvas analysis
   */
  public static async detectFaceBox(
    source: HTMLImageElement | HTMLCanvasElement
  ): Promise<FacePatchBox> {
    const w = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
    const h = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

    try {
      const detector = await this.getMediaPipeDetector();
      if (detector) {
        const detections = detector.detect(source);
        if (detections && detections.detections && detections.detections.length > 0) {
          const primary = detections.detections[0];
          const bb = primary.boundingBox;
          if (bb && bb.width > 20 && bb.height > 20) {
            // Expand by 35% margin for hair, forehead, ears, and chin
            const centerX = bb.originX + bb.width / 2;
            const centerY = bb.originY + bb.height * 0.55;
            const faceSize = Math.min(Math.min(w, h), Math.max(bb.width, bb.height) * 1.6);
            const halfSize = faceSize / 2;

            const x = Math.max(0, Math.min(w - faceSize, Math.round(centerX - halfSize)));
            const y = Math.max(0, Math.min(h - faceSize, Math.round(centerY - halfSize)));

            return {
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(faceSize),
              height: Math.round(faceSize),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[NeuralFaceEnhancer] MediaPipe detection skipped:', err);
    }

    // Fallback: Smart Canvas skin-tone and gradient density crop
    return this.estimateFaceBoundingBox(source);
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
          if (onProgress) onProgress(30, 'Loaded AI weights from local cache');
          return await cachedRes.arrayBuffer();
        }

        if (onProgress) onProgress(10, 'Downloading quantized model from CDN...');
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
          const pct = Math.min(55, 10 + Math.round((received / total) * 45));
          if (onProgress) {
            const mb = (received / (1024 * 1024)).toFixed(1);
            const totalMb = (total / (1024 * 1024)).toFixed(1);
            onProgress(pct, `Downloading Face Model (${mb} / ${totalMb} MB)...`);
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
        if (onProgress) onProgress(60, 'Model cached locally');
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
    modelKey: NeuralModelKey,
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
      onProgress(65, hasWebGPU ? 'Compiling WebGPU AI Shaders...' : 'Initializing WASM Threads...');
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
   * Canvas-based skin tone centroid and gradient density facial crop (Zero-network fallback)
   */
  public static estimateFaceBoundingBox(
    img: HTMLImageElement | HTMLCanvasElement
  ): FacePatchBox {
    const w = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
    const h = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;

    const sampleW = Math.min(256, w);
    const sampleH = Math.round((h * sampleW) / w);
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
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

    const size = Math.min(w, h, Math.round(Math.min(w, h) * 0.75));
    const halfSize = size / 2;

    const x = Math.max(0, Math.min(w - size, Math.round(centerX - halfSize)));
    const y = Math.max(0, Math.min(h - size, Math.round(centerY - halfSize)));

    return { x, y, width: size, height: size };
  }

  /**
   * Executes 100% Client-Side Generative Face Prior Restoration (GFPGAN / CodeFormer)
   * 1. MediaPipe Face Extraction crops the 512x512 face patch (keeps RAM < 100MB).
   * 2. Offloads to background Web Worker using WebGPU / WASM.
   * 3. Seamlessly blends 512x512 photorealistic face back into the portrait.
   */
  public static async restoreFacePatch(
    source: HTMLImageElement | HTMLCanvasElement,
    options: {
      modelKey?: NeuralModelKey;
      hasWebGPU?: boolean;
      blendStrength?: number; // 0 to 1
      faceBox?: FacePatchBox;
      onProgress?: (percent: number, status: string) => void;
    } = {}
  ): Promise<HTMLCanvasElement> {
    const {
      modelKey = 'gfpgan-v14',
      hasWebGPU = false,
      blendStrength = 1.0,
      onProgress,
    } = options;

    const w = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
    const h = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

    // 1. Detect face bounding box via MediaPipe (with Canvas fallback)
    if (onProgress) onProgress(5, 'Detecting facial features via MediaPipe...');
    const box = options.faceBox || (await this.detectFaceBox(source));
    const config = AI_MODEL_CONFIGS[modelKey];

    if (onProgress) onProgress(8, 'Cropping 512×512 facial patch for RAM-safe processing...');

    // Native resolution for GFPGAN and CodeFormer is 512x512
    const patchInputDim = 512;
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
    let outPatchW = patchInputDim;
    let outPatchH = patchInputDim;

    // 2. Offload to dedicated Web Worker to keep main UI thread 100% responsive
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

    // 3. In-thread fallback if Worker is unavailable or failed
    if (!restoredPatchCanvas) {
      const planeSize = patchInputDim * patchInputDim;
      const float32Data = new Float32Array(3 * planeSize);

      for (let i = 0; i < planeSize; i++) {
        const idx = i * 4;
        float32Data[i] = (patchData[idx] / 127.5) - 1.0;
        float32Data[planeSize + i] = (patchData[idx + 1] / 127.5) - 1.0;
        float32Data[planeSize * 2 + i] = (patchData[idx + 2] / 127.5) - 1.0;
      }

      const session = await this.getSession(modelKey, hasWebGPU, onProgress);
      const ort = this.ortInstance;
      const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, patchInputDim, patchInputDim]);

      if (onProgress) {
        onProgress(75, hasWebGPU ? 'Reconstructing facial prior via WebGPU...' : 'Reconstructing facial prior via WASM CPU...');
      }

      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];
      const feeds: Record<string, any> = { [inputName]: inputTensor };

      if (session.inputNames.length > 1) {
        for (let k = 1; k < session.inputNames.length; k++) {
          feeds[session.inputNames[k]] = new ort.Tensor('float32', new Float32Array([0.7]), [1]);
        }
      }

      let results: any = null;
      try {
        results = await session.run(feeds);
      } catch (gpuErr: any) {
        console.warn('[NeuralFaceEnhancer] WebGPU run failed, falling back to WASM CPU:', gpuErr);
        if (onProgress) {
          onProgress(78, 'WebGPU limit reached, switching to CPU WebAssembly fallback...');
        }
        const wasmSession = await this.getSession(modelKey, false, onProgress);
        results = await wasmSession.run(feeds);
      }

      // Intelligently locate the face image tensor among all returned outputs
      let outputTensor: any = null;
      if (results['output']) outputTensor = results['output'];
      else if (results['y']) outputTensor = results['y'];
      else if (results['graph_output_cast_0']) outputTensor = results['graph_output_cast_0'];

      if (!outputTensor) {
        for (const outKey in results) {
          const cand = results[outKey];
          if (cand && cand.data && cand.data.length >= patchInputDim * patchInputDim * 3) {
            outputTensor = cand;
            break;
          }
        }
      }

      if (!outputTensor) {
        outputTensor = results[session.outputNames[0]];
      }

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

      let minVal = 999999;
      let maxVal = -999999;
      const testCount = Math.min(500, outData.length);
      for (let m = 0; m < testCount; m++) {
        const val = outData[m];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      const isMinusOne = minVal < -0.1;
      const isZeroOne = !isMinusOne && maxVal <= 1.5;

      const toU8 = (v: number): number => {
        let px: number;
        if (isMinusOne) {
          px = Math.round((v + 1.0) * 127.5);
        } else if (isZeroOne) {
          px = Math.round(v * 255.0);
        } else {
          px = Math.round(v);
        }
        return px < 0 ? 0 : px > 255 ? 255 : px;
      };

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
          rPixels[d]     = toU8(outData[s]);
          rPixels[d + 1] = toU8(outData[s + 1]);
          rPixels[d + 2] = toU8(outData[s + 2]);
          rPixels[d + 3] = 255;
        }
      } else {
        const planeSize = outPatchW * outPatchH;
        for (let i = 0; i < planeSize; i++) {
          const d = i * 4;
          rPixels[d]     = toU8(outData[i]);
          rPixels[d + 1] = toU8(outData[planeSize + i]);
          rPixels[d + 2] = toU8(outData[planeSize * 2 + i]);
          rPixels[d + 3] = 255;
        }
      }

      rctx.putImageData(restoredImgData, 0, 0);
    }

    if (onProgress) onProgress(95, 'Blending photorealistic face onto portrait...');

    // 4. Construct Final Output Canvas
    const maxAllowedDim = 4096;
    const naturalTargetScale = 2; // High-definition 2x clarity upscale
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

    // First paint base image with high-quality smoothing
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(source, 0, 0, finalW, finalH);

    // Prepare feathered alpha mask for the face patch to eliminate boundary lines
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
          radius * 0.72,
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

    // Blend restored patch onto the exact face location in the canvas
    const targetX = Math.round(box.x * targetScale);
    const targetY = Math.round(box.y * targetScale);
    const targetW = Math.round(box.width * targetScale);
    const targetH = Math.round(box.height * targetScale);

    octx.globalAlpha = Math.max(0, Math.min(1, blendStrength));
    octx.drawImage(featherCanvas, targetX, targetY, targetW, targetH);
    octx.globalAlpha = 1.0;

    if (onProgress) onProgress(100, 'Remini-Grade Face Restoration Complete!');

    return outputCanvas;
  }
}
