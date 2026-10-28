/**
 * worker.ts
 * Dedicated Background Web Worker for FileWalaTool's 100% In-Browser AI Face Enhancer.
 *
 * Responsibilities:
 * 1. Offloads heavy generative AI execution completely off the main UI thread.
 * 2. Uses OffscreenCanvas for patch processing (crops face, feeds AI, and stitches back).
 * 3. Smart hardware fallback: WebGPU first, graceful try-catch fallback to WASM.
 * 4. Zero-copy transfer using Transferable Objects (ImageBitmap).
 */

// Global Worker declarations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any;
declare function importScripts(...urls: string[]): void;

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkerInferenceRequest {
  type: 'process_patch';
  id: string;
  imageBitmap: ImageBitmap;
  faceBox: FaceBoundingBox;
  modelUrl: string;
  blendStrength?: number; // 0.0 to 1.0 (default 1.0)
}

export type WorkerMessage = WorkerInferenceRequest;

export interface WorkerProgressResponse {
  type: 'progress';
  id: string;
  percent: number;
  stage: string;
}

export interface WorkerSuccessResponse {
  type: 'success';
  id: string;
  resultBitmap: ImageBitmap;
}

export interface WorkerErrorResponse {
  type: 'error';
  id: string;
  error: string;
}

// Lightweight ONNX runtime types
export interface OrtTensor {
  data: Float32Array | Float64Array | Uint8Array;
  dims: readonly number[];
  type: string;
}

export interface OrtInferenceSession {
  inputNames: readonly string[];
  outputNames: readonly string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(feeds: Record<string, any>): Promise<Record<string, OrtTensor>>;
}

export interface OrtNamespace {
  env: {
    wasm: {
      wasmPaths?: string;
      numThreads?: number;
      proxy?: boolean;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Tensor: new (type: string, data: any, dims?: number[]) => OrtTensor;
  InferenceSession: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(buffer: ArrayBuffer, options?: any): Promise<OrtInferenceSession>;
  };
}

// Module-level caches inside worker
let ortInstance: OrtNamespace | null = null;
let cachedSession: OrtInferenceSession | null = null;
let activeSessionUrl: string | null = null;

const CACHE_NAME = 'filewalatool-face-models-v1';
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

/**
 * 1. Dynamically load ONNX Runtime Web in Worker
 */
async function getOrt(): Promise<OrtNamespace> {
  if (ortInstance) return ortInstance;
  if (typeof self.ort !== 'undefined') {
    ortInstance = self.ort;
    return ortInstance!;
  }

  // Import via CDN in worker thread
  importScripts(ORT_CDN);
  if (!self.ort) {
    throw new Error('Failed to load ONNX Runtime Web in Worker environment.');
  }

  self.ort.env.wasm.wasmPaths = WASM_PATH;
  const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  self.ort.env.wasm.numThreads = isIsolated
    ? Math.min(4, (self.navigator && self.navigator.hardwareConcurrency) || 2)
    : 1;
  self.ort.env.wasm.proxy = false;

  ortInstance = self.ort;
  return ortInstance!;
}

/**
 * 2. Download or fetch ONNX model with IndexedDB/Cache API
 */
async function fetchModelBuffer(
  url: string,
  onProgress: (pct: number, stage: string) => void
): Promise<ArrayBuffer> {
  if (typeof self.caches !== 'undefined') {
    try {
      const cache = await self.caches.open(CACHE_NAME);
      const matched = await cache.match(url);
      if (matched) {
        onProgress(25, 'Loaded AI model from local cache');
        return await matched.arrayBuffer();
      }

      onProgress(10, 'Downloading AI model from CDN...');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} fetching model`);

      const total = parseInt(response.headers.get('content-length') || '0', 10);
      if (!response.body || total === 0) {
        const buf = await response.arrayBuffer();
        await cache.put(url, new Response(buf));
        return buf;
      }

      const reader = response.body.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const pct = Math.min(50, 10 + Math.round((received / total) * 40));
          const mb = (received / (1024 * 1024)).toFixed(1);
          const totalMb = (total / (1024 * 1024)).toFixed(1);
          onProgress(pct, `Downloading Face Model (${mb} / ${totalMb} MB)...`);
        }
      }

      const combined = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.length;
      }
      const finalBuf = combined.buffer;
      await cache.put(url, new Response(finalBuf));
      return finalBuf;
    } catch (cacheErr) {
      console.warn('Worker Cache API error, falling back to direct fetch', cacheErr);
    }
  }

  const res = await fetch(url);
  return await res.arrayBuffer();
}

/**
 * 3. Smart Hardware Fallback Session Initialization (WebGPU -> WASM)
 */
async function getInferenceSession(
  modelUrl: string,
  onProgress: (pct: number, stage: string) => void
): Promise<OrtInferenceSession> {
  if (cachedSession && activeSessionUrl === modelUrl) {
    return cachedSession;
  }

  const ort = await getOrt();
  const buffer = await fetchModelBuffer(modelUrl, onProgress);

  onProgress(55, 'Initializing AI Hardware Accelerator...');

  let session: OrtInferenceSession | null = null;

  // Step A: Attempt WebGPU Primary Execution Provider
  const hasWebGPU = typeof self.navigator !== 'undefined' && 'gpu' in self.navigator;
  if (hasWebGPU) {
    try {
      onProgress(60, 'Compiling WebGPU AI Shaders...');
      session = await ort.InferenceSession.create(buffer, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'basic',
      });
    } catch (webgpuError) {
      console.warn('WebGPU init failed, falling back to WASM CPU:', webgpuError);
    }
  }

  // Step B: Graceful WASM Fallback
  if (!session) {
    onProgress(65, 'Falling back to WASM CPU Engine...');
    session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'basic',
    });
  }

  cachedSession = session;
  activeSessionUrl = modelUrl;
  return session;
}

/**
 * 4. Patch Processing: Extract 512x512 Face Patch using OffscreenCanvas
 */
function extractFacePatch(
  imageBitmap: ImageBitmap,
  faceBox: FaceBoundingBox,
  patchDim = 512
): ImageData {
  const patchCanvas = new OffscreenCanvas(patchDim, patchDim);
  const patchCtx = patchCanvas.getContext('2d', { willReadFrequently: true });
  if (!patchCtx) throw new Error('Failed to create OffscreenCanvas 2D context for patch extraction');

  patchCtx.drawImage(
    imageBitmap,
    faceBox.x,
    faceBox.y,
    faceBox.width,
    faceBox.height,
    0,
    0,
    patchDim,
    patchDim
  );

  return patchCtx.getImageData(0, 0, patchDim, patchDim);
}

/**
 * 5. Preprocess ImageData to Tensor (CHW Normalized [-1.0, 1.0])
 */
function preprocessPatchToTensor(imageData: ImageData, patchDim = 512): Float32Array {
  const { data } = imageData;
  const planeSize = patchDim * patchDim;
  const float32Data = new Float32Array(3 * planeSize);

  for (let i = 0; i < planeSize; i++) {
    const idx = i * 4;
    // GFPGAN / CodeFormer standard: [-1.0, 1.0]
    float32Data[i] = data[idx] / 127.5 - 1.0; // R
    float32Data[planeSize + i] = data[idx + 1] / 127.5 - 1.0; // G
    float32Data[planeSize * 2 + i] = data[idx + 2] / 127.5 - 1.0; // B
  }

  return float32Data;
}

/**
 * 6. Postprocess Output Tensor Data to ImageData ([0, 255] RGBA)
 */
function postprocessTensorToImageData(
  outData: Float32Array | Float64Array,
  patchDim = 512
): ImageData {
  const patchCanvas = new OffscreenCanvas(patchDim, patchDim);
  const patchCtx = patchCanvas.getContext('2d');
  if (!patchCtx) throw new Error('OffscreenCanvas unavailable');

  const imgData = patchCtx.createImageData(patchDim, patchDim);
  const dst = imgData.data;
  const planeSize = patchDim * patchDim;

  for (let i = 0; i < planeSize; i++) {
    const rRaw = outData[i];
    const gRaw = outData[planeSize + i];
    const bRaw = outData[planeSize * 2 + i];

    // Denormalize [-1.0, 1.0] -> [0, 255]
    const r = Math.max(0, Math.min(255, Math.round((rRaw + 1.0) * 127.5)));
    const g = Math.max(0, Math.min(255, Math.round((gRaw + 1.0) * 127.5)));
    const b = Math.max(0, Math.min(255, Math.round((bRaw + 1.0) * 127.5)));

    const idx = i * 4;
    dst[idx] = r;
    dst[idx + 1] = g;
    dst[idx + 2] = b;
    dst[idx + 3] = 255;
  }

  return imgData;
}

/**
 * 7. Seamless Stitching: Blends Restored Face Patch back into Full Image
 * Uses an elliptical / radial feathered alpha mask on OffscreenCanvas
 * so boundaries blend invisibly without sharp seams.
 */
async function stitchPatchBack(
  originalBitmap: ImageBitmap,
  enhancedPatchData: ImageData,
  faceBox: FaceBoundingBox,
  blendStrength = 1.0
): Promise<ImageBitmap> {
  const width = originalBitmap.width;
  const height = originalBitmap.height;
  const patchDim = enhancedPatchData.width;

  // Canvas A: Full Original Image
  const fullCanvas = new OffscreenCanvas(width, height);
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) throw new Error('Failed to create full OffscreenCanvas');

  fullCtx.drawImage(originalBitmap, 0, 0);

  // Canvas B: Enhanced Patch
  const patchCanvas = new OffscreenCanvas(patchDim, patchDim);
  const patchCtx = patchCanvas.getContext('2d');
  if (!patchCtx) throw new Error('Failed to create patch OffscreenCanvas');
  patchCtx.putImageData(enhancedPatchData, 0, 0);

  // Canvas C: Feathered Alpha Mask for seamless boundary blending
  const maskCanvas = new OffscreenCanvas(patchDim, patchDim);
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Failed to create mask OffscreenCanvas');

  const half = patchDim / 2;
  const innerRadius = half * 0.7;
  const outerRadius = half * 0.98;

  const gradient = maskCtx.createRadialGradient(
    half,
    half,
    innerRadius,
    half,
    half,
    outerRadius
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  maskCtx.fillStyle = gradient;
  maskCtx.fillRect(0, 0, patchDim, patchDim);

  // Apply Feathered Mask to Enhanced Patch using 'destination-in'
  patchCtx.globalCompositeOperation = 'destination-in';
  patchCtx.drawImage(maskCanvas, 0, 0);

  // Blend Enhanced Patch back onto original Full Image
  fullCtx.save();
  fullCtx.globalAlpha = Math.max(0, Math.min(1.0, blendStrength));
  fullCtx.drawImage(
    patchCanvas,
    0,
    0,
    patchDim,
    patchDim,
    faceBox.x,
    faceBox.y,
    faceBox.width,
    faceBox.height
  );
  fullCtx.restore();

  // Return zero-copy ImageBitmap
  return fullCanvas.transferToImageBitmap();
}

/**
 * 8. Main Worker Message Listener
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (!msg || msg.type !== 'process_patch') return;

  const { id, imageBitmap, faceBox, modelUrl, blendStrength = 1.0 } = msg;

  const sendProgress = (percent: number, stage: string) => {
    const res: WorkerProgressResponse = { type: 'progress', id, percent, stage };
    self.postMessage(res);
  };

  try {
    sendProgress(5, 'Extracting facial patch in background...');
    const patchDim = 512;
    const patchImageData = extractFacePatch(imageBitmap, faceBox, patchDim);

    sendProgress(15, 'Preparing neural tensor...');
    const float32Data = preprocessPatchToTensor(patchImageData, patchDim);

    // Initialize session with WebGPU and WASM fallback
    const session = await getInferenceSession(modelUrl, sendProgress);
    const ort = await getOrt();

    const inputName = session.inputNames[0];
    const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, patchDim, patchDim]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feeds: Record<string, any> = {
      [inputName]: inputTensor,
    };

    // Handle CodeFormer fidelity weight if required
    if (session.inputNames.length > 1) {
      for (let k = 1; k < session.inputNames.length; k++) {
        const extraName = session.inputNames[k];
        feeds[extraName] = new ort.Tensor('float64', new Float64Array([0.7]), [1]);
      }
    }

    sendProgress(70, 'Enhancing Face with Generative AI...');
    let results: Record<string, OrtTensor>;

    try {
      results = await session.run(feeds);
    } catch (runErr) {
      console.warn('Worker inference error, retrying with fallback tensor types:', runErr);
      // Auto-rectify float vs double if needed
      for (let k = 1; k < session.inputNames.length; k++) {
        const extraName = session.inputNames[k];
        feeds[extraName] = new ort.Tensor('float32', new Float32Array([0.7]), [1]);
      }
      results = await session.run(feeds);
    }

    sendProgress(88, 'Unpacking photorealistic features...');
    const outputName = session.outputNames[0];
    const outputTensor = results[outputName] || Object.values(results)[0];
    const outData = outputTensor.data as Float32Array;

    const enhancedPatchData = postprocessTensorToImageData(outData, patchDim);

    sendProgress(94, 'Seamlessly stitching facial patch...');
    const resultBitmap = await stitchPatchBack(
      imageBitmap,
      enhancedPatchData,
      faceBox,
      blendStrength
    );

    sendProgress(100, 'Complete!');
    const successRes: WorkerSuccessResponse = {
      type: 'success',
      id,
      resultBitmap,
    };

    // Transfer resultBitmap with zero memory duplication
    self.postMessage(successRes, [resultBitmap]);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Worker processing error:', err);
    const errRes: WorkerErrorResponse = {
      type: 'error',
      id,
      error: errorMsg,
    };
    self.postMessage(errRes);
  }
};
