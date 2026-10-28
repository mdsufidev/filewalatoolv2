/**
 * neuralWorkerScript.ts
 * Background Web Worker script for 100% client-side GFPGAN & CodeFormer face restoration.
 * Offloads heavy generative neural networks to an isolated worker thread using WebGPU / WASM,
 * ensuring the main UI thread never freezes.
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
      onProgress(10, 'Downloading quantized model from CDN...');
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
        onProgress(pct, 'Downloading Face Model (' + mb + ' / ' + totalMb + ' MB)...');
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

  onProgress(60, hasWebGPU ? 'Compiling WebGPU AI Shaders...' : 'Initializing WASM CPU Engine...');

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
  var patchDim = msg.patchDim || 512;
  var modelKey = msg.modelKey;
  var modelUrl = msg.modelUrl;
  var hasWebGPU = !!msg.hasWebGPU;

  function sendProgress(pct, stage) {
    self.postMessage({ type: 'progress', id: id, percent: pct, stage: stage });
  }

  try {
    sendProgress(12, 'Preparing facial patch tensor in background...');

    var patchData = new Uint8ClampedArray(patchBuffer);
    var planeSize = patchDim * patchDim;
    var float32Data = new Float32Array(3 * planeSize);

    // GFPGAN & CodeFormer expect [-1.0, 1.0] range
    for (var i = 0; i < planeSize; i++) {
      var idx = i * 4;
      float32Data[i] = (patchData[idx] / 127.5) - 1.0;
      float32Data[planeSize + i] = (patchData[idx + 1] / 127.5) - 1.0;
      float32Data[planeSize * 2 + i] = (patchData[idx + 2] / 127.5) - 1.0;
    }

    var session = await getSessionInWorker(modelKey, modelUrl, hasWebGPU, sendProgress);
    var ort = ortInstance;
    var inputTensor = new ort.Tensor('float32', float32Data, [1, 3, patchDim, patchDim]);

    sendProgress(70, 'Running Generative Face Prior reconstruction...');

    var inputName = session.inputNames[0];
    var outputName = session.outputNames[0];
    var feeds = {};
    feeds[inputName] = inputTensor;

    // Handle extra inputs (e.g. CodeFormer fidelity weight w)
    // CodeFormer PyTorch export requires tensor(double) [float64]
    if (session.inputNames.length > 1) {
      for (var k = 1; k < session.inputNames.length; k++) {
        var extraName = session.inputNames[k];
        feeds[extraName] = new ort.Tensor('float64', new Float64Array([0.7]), [1]);
      }
    }

    async function executeWorkerInference(targetSession, targetFeeds) {
      try {
        return await targetSession.run(targetFeeds);
      } catch (runErr) {
        var errMsg = (runErr && runErr.message) || String(runErr);
        // Automatic type rectification if model expects float instead of double or vice versa
        if (errMsg.indexOf('expected: (tensor(double))') !== -1 || errMsg.indexOf('expected: (tensor(float))') !== -1) {
          var useDouble = errMsg.indexOf('expected: (tensor(double))') !== -1;
          for (var j = 1; j < targetSession.inputNames.length; j++) {
            var extraInput = targetSession.inputNames[j];
            targetFeeds[extraInput] = useDouble
              ? new ort.Tensor('float64', new Float64Array([0.7]), [1])
              : new ort.Tensor('float32', new Float32Array([0.7]), [1]);
          }
          return await targetSession.run(targetFeeds);
        }
        throw runErr;
      }
    }

    var results = null;
    try {
      results = await executeWorkerInference(session, feeds);
    } catch (runErr) {
      console.warn('Worker WebGPU run failed, falling back to CPU WASM:', runErr);
      sendProgress(75, 'Switching to CPU WebAssembly in background...');
      var wasmSession = await getSessionInWorker(modelKey, modelUrl, false, sendProgress);
      results = await executeWorkerInference(wasmSession, feeds);
    }

    sendProgress(90, 'Unpacking photorealistic facial features...');

    // Intelligently locate the face image tensor among all returned outputs
    var outputTensor = null;
    if (results['output']) outputTensor = results['output'];
    else if (results['y']) outputTensor = results['y'];
    else if (results['graph_output_cast_0']) outputTensor = results['graph_output_cast_0'];

    if (!outputTensor) {
      for (var outKey in results) {
        var cand = results[outKey];
        if (cand && cand.data && cand.data.length >= patchDim * patchDim * 3) {
          outputTensor = cand;
          break;
        }
      }
    }

    if (!outputTensor) {
      outputTensor = results[session.outputNames[0]];
    }

    var outData = outputTensor.data;
    var dims = outputTensor.dims || [];

    var outPatchW = patchDim;
    var outPatchH = patchDim;
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

    // Dynamic output range detection (handles [-1, 1], [0, 1] and [0, 255])
    var minVal = 999999;
    var maxVal = -999999;
    var testCount = Math.min(500, outData.length);
    for (var m = 0; m < testCount; m++) {
      var val = outData[m];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    var isMinusOne = minVal < -0.1;
    var isZeroOne = !isMinusOne && maxVal <= 1.5;

    function toU8(v) {
      var px;
      if (isMinusOne) {
        px = Math.round((v + 1.0) * 127.5);
      } else if (isZeroOne) {
        px = Math.round(v * 255.0);
      } else {
        px = Math.round(v);
      }
      return px < 0 ? 0 : px > 255 ? 255 : px;
    }

    var totalPixels = outPatchW * outPatchH;
    var outRgba = new Uint8ClampedArray(totalPixels * 4);

    if (isNHWC) {
      for (var p = 0; p < totalPixels; p++) {
        var s = p * 3;
        var d = p * 4;
        outRgba[d] = toU8(outData[s]);
        outRgba[d + 1] = toU8(outData[s + 1]);
        outRgba[d + 2] = toU8(outData[s + 2]);
        outRgba[d + 3] = 255;
      }
    } else {
      var pSize = totalPixels;
      for (var p = 0; p < pSize; p++) {
        var d = p * 4;
        outRgba[d] = toU8(outData[p]);
        outRgba[d + 1] = toU8(outData[pSize + p]);
        outRgba[d + 2] = toU8(outData[pSize * 2 + p]);
        outRgba[d + 3] = 255;
      }
    }

    sendProgress(96, 'Finalizing Studio-grade restored face...');

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
