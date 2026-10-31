/**
 * briaRmbgWorkerScript.ts
 * Isolated Web Worker script for 100% Client-Side BRIA RMBG-1.4 Background Removal.
 * Offloads heavy ONNX Runtime Web neural network inference to a background worker thread
 * using WebGPU acceleration with seamless CPU WASM fallback.
 * Keeps the main React UI thread 100% responsive without browser tab freezes.
 */

export const BRIA_RMBG_WORKER_CODE = `
var ortInstance = null;
var rmbgSession = null;

var CACHE_NAME = 'filewala-rmbg-cache-v1';
var ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';
var WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

var PRIMARY_MODEL_URL = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx';
var MIRROR_MODEL_URL = 'https://hf-mirror.com/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx';

async function loadOrtInWorker() {
  if (ortInstance) return ortInstance;
  if (typeof self.ort !== 'undefined') {
    ortInstance = self.ort;
    return ortInstance;
  }
  importScripts(ORT_CDN);
  var ort = self.ort;
  if (!ort) throw new Error('Failed to bind self.ort in Worker');
  ort.env.wasm.wasmPaths = WASM_PATH;
  ort.env.wasm.simd = true;
  var isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  ort.env.wasm.numThreads = isIsolated ? Math.min(4, (self.navigator && self.navigator.hardwareConcurrency) || 2) : 1;
  ort.env.wasm.proxy = false;
  ortInstance = ort;
  return ortInstance;
}

async function fetchWithProgress(url, cache, onProgress, timeoutMs) {
  var controller = null;
  var timer = null;
  if (timeoutMs && typeof AbortController !== 'undefined') {
    controller = new AbortController();
    timer = setTimeout(function() { controller.abort(); }, timeoutMs);
  }

  try {
    var response = await fetch(url, controller ? { signal: controller.signal } : {});
    if (timer) clearTimeout(timer);
    if (!response.ok) throw new Error('HTTP ' + response.status + ' fetching ' + url);

    var total = parseInt(response.headers.get('content-length') || '44403226', 10);
    if (!response.body) {
      var buf = await response.arrayBuffer();
      try { await cache.put(url, new Response(buf.slice(0))); } catch (e) {}
      return buf;
    }

    var reader = response.body.getReader();
    var received = 0;
    var chunks = [];

    while (true) {
      var res = await reader.read();
      if (res.done) break;
      chunks.push(res.value);
      received += res.value.length;
      var pct = Math.min(65, 5 + Math.round((received / total) * 60));
      var mb = (received / (1024 * 1024)).toFixed(1);
      var totalMb = (total / (1024 * 1024)).toFixed(1);
      onProgress(pct, 'Downloading BRIA RMBG-1.4 AI (' + mb + ' / ' + totalMb + ' MB)...');
    }

    var combined = new Uint8Array(received);
    var offset = 0;
    for (var i = 0; i < chunks.length; i++) {
      combined.set(chunks[i], offset);
      offset += chunks[i].length;
    }
    var finalBuf = combined.buffer;
    try {
      await cache.put(url, new Response(finalBuf.slice(0)));
    } catch (e) {
      console.warn('Failed to cache model buffer:', e);
    }
    return finalBuf;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getRmbgModelBuffer(onProgress) {
  if (typeof self.caches !== 'undefined') {
    try {
      var cache = await self.caches.open(CACHE_NAME);
      var matched = await cache.match(PRIMARY_MODEL_URL);
      if (!matched) matched = await cache.match(MIRROR_MODEL_URL);
      if (matched) {
        onProgress(35, 'Loaded BRIA RMBG-1.4 weights from local device cache');
        return await matched.arrayBuffer();
      }

      try {
        onProgress(5, 'Connecting to BRIA RMBG-1.4 Neural Model (44.4 MB)...');
        // Fast 8-second connection timeout for Hugging Face primary, fallback to mirror if throttled
        return await fetchWithProgress(PRIMARY_MODEL_URL, cache, onProgress, 8000);
      } catch (errPrimary) {
        console.warn('Primary Hugging Face download failed, trying mirror:', errPrimary);
        onProgress(10, 'Connecting to high-speed backup AI mirror...');
        return await fetchWithProgress(MIRROR_MODEL_URL, cache, onProgress, 30000);
      }
    } catch (e) {
      console.warn('Cache error in worker, falling back to direct fetch', e);
    }
  }

  // Fallback if CacheStorage not available
  var r = await fetch(PRIMARY_MODEL_URL);
  if (!r.ok) r = await fetch(MIRROR_MODEL_URL);
  return await r.arrayBuffer();
}

async function getRmbgSession(hasWebGPU, onProgress) {
  if (rmbgSession) return rmbgSession;

  var ort = await loadOrtInWorker();
  var buffer = await getRmbgModelBuffer(onProgress);

  onProgress(70, hasWebGPU ? 'Compiling WebGPU Neural Shaders...' : 'Initializing WASM CPU Pipeline...');

  var session = null;
  // Preserve an un-detached buffer copy in case WebGPU session creation neuters the original buffer
  var wasmBackupBuffer = buffer.slice(0);

  if (hasWebGPU && typeof self.navigator !== 'undefined' && self.navigator.gpu) {
    try {
      session = await ort.InferenceSession.create(buffer, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'all'
      });
    } catch (err) {
      console.warn('Worker WebGPU session init failed, falling back to WASM:', err);
    }
  }

  if (!session) {
    session = await ort.InferenceSession.create(wasmBackupBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });
  }

  rmbgSession = session;
  return session;
}

async function warmupRmbg(hasWebGPU) {
  try {
    await getRmbgSession(hasWebGPU, function() {});
    return true;
  } catch (err) {
    return false;
  }
}

self.onmessage = async function(e) {
  var msg = e.data;
  if (!msg) return;

  if (msg.type === 'warmup') {
    warmupRmbg(!!msg.hasWebGPU).then(function(ready) {
      self.postMessage({ type: 'warmed_up', ready: ready });
    });
    return;
  }

  if (msg.type !== 'remove_background') return;

  var id = msg.id;
  var imageBuffer = msg.imageBuffer; // 1024x1024 RGBA Uint8ClampedArray buffer
  var hasWebGPU = !!msg.hasWebGPU;

  function sendProgress(pct, stage) {
    self.postMessage({ type: 'progress', id: id, percent: pct, stage: stage });
  }

  try {
    sendProgress(10, 'Preparing 1024x1024 RGB tensor in background...');

    var INPUT_SIZE = 1024;
    var planeSize = INPUT_SIZE * INPUT_SIZE;
    var plane2 = planeSize * 2;
    var pixelBytes = new Uint8ClampedArray(imageBuffer);
    var float32Data = new Float32Array(3 * planeSize);
    var inv255 = 1.0 / 255.0;

    // Official RMBG-1.4 normalization: (pixel / 255.0 - 0.5) / 1.0 -> [-0.5, 0.5]
    for (var i = 0; i < planeSize; i++) {
      var idx = i * 4;
      float32Data[i] = pixelBytes[idx] * inv255 - 0.5;
      float32Data[planeSize + i] = pixelBytes[idx + 1] * inv255 - 0.5;
      float32Data[plane2 + i] = pixelBytes[idx + 2] * inv255 - 0.5;
    }

    var session = await getRmbgSession(hasWebGPU, sendProgress);
    var ort = ortInstance;
    var inputTensor = new ort.Tensor('float32', float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);

    sendProgress(75, 'Running BRIA RMBG-1.4 neural inference...');

    var inputName = session.inputNames[0];
    var outputName = session.outputNames[0];
    var feeds = {};
    feeds[inputName] = inputTensor;

    var startTime = performance.now();
    var results = null;
    try {
      results = await session.run(feeds);
    } catch (runErr) {
      console.warn('Worker WebGPU execution failed, retrying on WASM:', runErr);
      sendProgress(80, 'Switching to WASM CPU in background...');
      var ortWasm = await loadOrtInWorker();
      var wasmBuffer = await getRmbgModelBuffer(sendProgress);
      var wasmSession = await ortWasm.InferenceSession.create(wasmBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      rmbgSession = wasmSession;
      results = await wasmSession.run(feeds);
    }

    var elapsed = Math.round(performance.now() - startTime);

    sendProgress(92, 'Generating continuous 8-bit soft alpha matte...');

    var outputTensor = results[outputName];
    if (!outputTensor) {
      for (var k in results) {
        if (results[k] && results[k].data) {
          outputTensor = results[k];
          break;
        }
      }
    }

    var maskFloat = outputTensor.data;
    var minVal = Infinity;
    var maxVal = -Infinity;
    for (var i = 0; i < maskFloat.length; i++) {
      var v = maskFloat[i];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    var alpha8 = new Uint8Array(INPUT_SIZE * INPUT_SIZE);
    // Official BRIA RMBG-1.4 outputs already sigmoided [0, 1] probability map
    var isSigmoid = minVal >= -0.05 && maxVal <= 1.05;

    if (isSigmoid) {
      for (var i = 0; i < maskFloat.length; i++) {
        var val = maskFloat[i];
        // Clean cut below 0.02 threshold to prevent floating point background noise
        alpha8[i] = val <= 0.02 ? 0 : val >= 0.98 ? 255 : (val * 255 + 0.5) | 0;
      }
    } else {
      var range = (maxVal - minVal) > 0.00001 ? (maxVal - minVal) : 1.0;
      var invRange = 255.0 / range;
      for (var i = 0; i < maskFloat.length; i++) {
        var norm = (maskFloat[i] - minVal) * invRange;
        alpha8[i] = norm <= 0 ? 0 : norm >= 255 ? 255 : (norm + 0.5) | 0;
      }
    }

    sendProgress(100, 'Complete');

    self.postMessage(
      {
        type: 'result',
        id: id,
        alphaBuffer: alpha8.buffer,
        maskDim: INPUT_SIZE,
        elapsedMs: elapsed
      },
      [alpha8.buffer]
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      id: id,
      error: (err && err.message) || String(err)
    });
  }
};
`;
