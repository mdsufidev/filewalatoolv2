/**
 * neuralWorkerScript.ts
 * Background Web Worker script for non-blocking neural face restoration.
 * Runs ONNX Runtime Web (Real-ESRGAN Compact & Real-ESRGAN Plus) in an isolated
 * worker thread so the main UI thread never freezes and the browser never shows
 * "Page Not Responding" warnings.
 */

export const NEURAL_WORKER_CODE = `
var ortInstance = null;
var modelSessions = {};

var CACHE_NAME = 'filewala-neural-models-v1';
var ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';
var WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

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
  var isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  ort.env.wasm.numThreads = isIsolated ? Math.min(4, (self.navigator && self.navigator.hardwareConcurrency) || 2) : 1;
  ort.env.wasm.proxy = false;
  ortInstance = ort;
  return ortInstance;
}

async function getModelBufferInWorker(url, onProgress) {
  if (typeof self.caches !== 'undefined') {
    try {
      var cache = await self.caches.open(CACHE_NAME);
      var matched = await cache.match(url);
      if (matched) {
        onProgress(30, 'Loaded AI weights from local cache');
        return await matched.arrayBuffer();
      }
      onProgress(10, 'Downloading AI weights from CDN...');
      var response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status + ' fetching model');

      var total = parseInt(response.headers.get('content-length') || '0', 10);
      if (!response.body || total === 0) {
        var buf = await response.arrayBuffer();
        await cache.put(url, new Response(buf));
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
        var pct = Math.min(55, 10 + Math.round((received / total) * 45));
        var mb = (received / (1024 * 1024)).toFixed(1);
        var totalMb = (total / (1024 * 1024)).toFixed(1);
        onProgress(pct, 'Downloading AI Model (' + mb + ' / ' + totalMb + ' MB)...');
      }
      var combined = new Uint8Array(received);
      var offset = 0;
      for (var c of chunks) {
        combined.set(c, offset);
        offset += c.length;
      }
      var finalBuf = combined.buffer;
      await cache.put(url, new Response(finalBuf));
      return finalBuf;
    } catch (e) {
      console.warn('Cache error in worker, falling back to direct fetch', e);
    }
  }
  var r = await fetch(url);
  return await r.arrayBuffer();
}

async function getSessionInWorker(modelKey, modelUrl, hasWebGPU, onProgress) {
  var key = modelKey + '_' + (hasWebGPU ? 'gpu' : 'wasm');
  if (modelSessions[key]) return modelSessions[key];

  var ort = await loadOrtInWorker();
  var buffer = await getModelBufferInWorker(modelUrl, onProgress);

  onProgress(60, hasWebGPU ? 'Compiling WebGPU AI Shaders...' : 'Initializing AI WASM Engine...');

  var session = null;
  if (hasWebGPU && typeof self.navigator !== 'undefined' && self.navigator.gpu) {
    try {
      session = await ort.InferenceSession.create(buffer, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'basic'
      });
    } catch (err) {
      console.warn('Worker WebGPU session init failed, falling back to WASM:', err);
    }
  }

  if (!session) {
    session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'basic'
    });
  }

  modelSessions[key] = session;
  return session;
}

self.onmessage = async function(e) {
  var msg = e.data;
  if (!msg || msg.type !== 'restore_patch') return;

  var id = msg.id;
  var patchBuffer = msg.patchBuffer;
  var patchDim = msg.patchDim;
  var modelKey = msg.modelKey;
  var modelUrl = msg.modelUrl;
  var hasWebGPU = !!msg.hasWebGPU;

  function sendProgress(pct, stage) {
    self.postMessage({ type: 'progress', id: id, percent: pct, stage: stage });
  }

  try {
    sendProgress(12, 'Preparing neural tensor in background thread...');

    var patchData = new Uint8ClampedArray(patchBuffer);
    var planeSize = patchDim * patchDim;
    var float32Data = new Float32Array(3 * planeSize);

    for (var i = 0; i < planeSize; i++) {
      var idx = i * 4;
      float32Data[i] = patchData[idx] / 255.0;
      float32Data[planeSize + i] = patchData[idx + 1] / 255.0;
      float32Data[planeSize * 2 + i] = patchData[idx + 2] / 255.0;
    }

    var session = await getSessionInWorker(modelKey, modelUrl, hasWebGPU, sendProgress);
    var ort = ortInstance;
    var inputTensor = new ort.Tensor('float32', float32Data, [1, 3, patchDim, patchDim]);

    sendProgress(70, 'Running Remini-grade AI feature restoration...');

    var inputName = session.inputNames[0];
    var outputName = session.outputNames[0];
    var feeds = {};
    feeds[inputName] = inputTensor;

    var results = null;
    try {
      results = await session.run(feeds);
    } catch (runErr) {
      console.warn('Worker WebGPU run failed, falling back to CPU WASM:', runErr);
      sendProgress(75, 'Switching to CPU WebAssembly in background...');
      var wasmSession = await getSessionInWorker(modelKey, modelUrl, false, sendProgress);
      results = await wasmSession.run(feeds);
    }

    sendProgress(90, 'Unpacking super-resolved facial pixels...');

    var outputTensor = results[outputName];
    var outData = outputTensor.data;
    var dims = outputTensor.dims || [];

    var outPatchW = patchDim * 4;
    var outPatchH = patchDim * 4;
    var isNHWC = false;

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

    var maxVal = 0;
    var testCount = Math.min(200, outData.length);
    for (var k = 0; k < testCount; k++) {
      if (outData[k] > maxVal) maxVal = outData[k];
    }
    var scale = maxVal > 1.5 ? 1 : 255;

    var totalPixels = outPatchW * outPatchH;
    var outRgba = new Uint8ClampedArray(totalPixels * 4);

    if (isNHWC) {
      for (var p = 0; p < totalPixels; p++) {
        var s = p * 3;
        var d = p * 4;
        var r = Math.round(outData[s] * scale);
        var g = Math.round(outData[s + 1] * scale);
        var b = Math.round(outData[s + 2] * scale);
        outRgba[d] = r < 0 ? 0 : r > 255 ? 255 : r;
        outRgba[d + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        outRgba[d + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        outRgba[d + 3] = 255;
      }
    } else {
      var pSize = totalPixels;
      for (var p = 0; p < pSize; p++) {
        var d = p * 4;
        var r = Math.round(outData[p] * scale);
        var g = Math.round(outData[pSize + p] * scale);
        var b = Math.round(outData[pSize * 2 + p] * scale);
        outRgba[d] = r < 0 ? 0 : r > 255 ? 255 : r;
        outRgba[d + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        outRgba[d + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        outRgba[d + 3] = 255;
      }
    }

    sendProgress(96, 'Finalizing enhanced facial features...');

    self.postMessage(
      {
        type: 'complete',
        id: id,
        buffer: outRgba.buffer,
        width: outPatchW,
        height: outPatchH
      },
      [outRgba.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', id: id, error: (err && err.message) || String(err) });
  }
};
`;
