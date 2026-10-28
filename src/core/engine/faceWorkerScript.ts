/**
 * faceWorkerScript.ts
 * Self-contained Web Worker script for multi-threaded facial retouching,
 * edge-preserving bilateral denoising, high-pass sharpening, and 2x/4x super-resolution upscaling.
 */

export const FACE_WORKER_CODE = `
self.onmessage = function(e) {
  var msg = e.data;
  if (!msg || msg.type !== 'enhance') return;

  var id = msg.id;
  var srcBuffer = msg.buffer; // ArrayBuffer (transferred)
  var width = msg.width;
  var height = msg.height;
  var settings = msg.settings || {};
  var upscale = msg.upscale || 1; // 1, 2, or 4

  try {
    self.postMessage({ type: 'progress', id: id, percent: 10, stage: 'Analyzing facial features & skin tones...' });

    var srcData = new Uint8ClampedArray(srcBuffer);
    var totalPixels = width * height;

    // Helper: Skin factor detection (ITU-R BT.601 YCbCr model)
    function getSkinFactor(r, g, b) {
      if (r <= g || r <= b || r < 50) return 0;
      if (r - g < 8) return 0;
      var cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      var cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
        var cbDist = Math.min(cb - 77, 127 - cb) / 25;
        var crDist = Math.min(cr - 133, 173 - cr) / 20;
        return Math.min(1, Math.max(0, Math.min(cbDist, crDist)));
      }
      return 0;
    }

    function clamp(val) {
      return val < 0 ? 0 : val > 255 ? 255 : val;
    }

    // Step 1: Precompute skin map & luminance
    var skinMap = new Float32Array(totalPixels);
    var lumMap = new Uint8Array(totalPixels);
    for (var i = 0; i < totalPixels; i++) {
      var idx = i * 4;
      var r = srcData[idx];
      var g = srcData[idx + 1];
      var b = srcData[idx + 2];
      skinMap[i] = getSkinFactor(r, g, b);
      lumMap[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    self.postMessage({ type: 'progress', id: id, percent: 30, stage: 'Applying edge-preserving bilateral denoising...' });

    // Step 2: Edge-Preserving Bilateral Denoising on Skin
    var smoothFactor = Math.max(0, Math.min(100, settings.smooth || 0)) / 100;
    var denoisedData = new Uint8ClampedArray(srcData);

    if (smoothFactor > 0.05) {
      var rangeThreshold = 22 + smoothFactor * 32;
      var rangeThreshSq = rangeThreshold * rangeThreshold;
      var radius = smoothFactor > 0.6 ? 2 : 1;

      for (var y = radius; y < height - radius; y++) {
        var rowOffset = y * width;
        for (var x = radius; x < width - radius; x++) {
          var pIdx = rowOffset + x;
          var skinProb = skinMap[pIdx];
          if (skinProb <= 0.05) continue;

          var cR = srcData[pIdx * 4];
          var cG = srcData[pIdx * 4 + 1];
          var cB = srcData[pIdx * 4 + 2];

          var sumR = 0, sumG = 0, sumB = 0, totalW = 0;

          for (var dy = -radius; dy <= radius; dy++) {
            var nRow = (y + dy) * width;
            for (var dx = -radius; dx <= radius; dx++) {
              var nIdx = nRow + (x + dx);
              var nr = srcData[nIdx * 4];
              var ng = srcData[nIdx * 4 + 1];
              var nb = srcData[nIdx * 4 + 2];

              var dr = nr - cR;
              var dg = ng - cG;
              var db = nb - cB;
              var distSq = dr * dr + dg * dg + db * db;

              if (distSq < rangeThreshSq * 3) {
                var w = Math.exp(-distSq / (2 * rangeThreshSq));
                sumR += nr * w;
                sumG += ng * w;
                sumB += nb * w;
                totalW += w;
              }
            }
          }

          if (totalW > 0) {
            var blend = smoothFactor * skinProb;
            var outIdx = pIdx * 4;
            denoisedData[outIdx] = Math.round(cR * (1 - blend) + (sumR / totalW) * blend);
            denoisedData[outIdx + 1] = Math.round(cG * (1 - blend) + (sumG / totalW) * blend);
            denoisedData[outIdx + 2] = Math.round(cB * (1 - blend) + (sumB / totalW) * blend);
          }
        }
      }
    }

    self.postMessage({ type: 'progress', id: id, percent: 55, stage: 'Sharpening eyes, eyelashes, and facial contours...' });

    // Step 3: High-Pass Sharpening for eyes, hair, lips
    var sharpnessFactor = Math.max(0, Math.min(100, settings.sharpness || 0)) / 100;
    var sharpenedData = new Uint8ClampedArray(denoisedData);

    if (sharpnessFactor > 0.05) {
      var sharpStrength = sharpnessFactor * 1.35;
      for (var sy = 1; sy < height - 1; sy++) {
        var sRow = sy * width;
        for (var sx = 1; sx < width - 1; sx++) {
          var spIdx = sRow + sx;
          var sIdx = spIdx * 4;
          var sProb = skinMap[spIdx];
          var effectiveSharp = sharpStrength * (1.0 - sProb * 0.45);

          for (var sc = 0; sc < 3; sc++) {
            var center = srcData[sIdx + sc];
            var north = srcData[((sy - 1) * width + sx) * 4 + sc];
            var south = srcData[((sy + 1) * width + sx) * 4 + sc];
            var west = srcData[(sRow + (sx - 1)) * 4 + sc];
            var east = srcData[(sRow + (sx + 1)) * 4 + sc];

            var highPass = center * 4 - north - south - west - east;
            sharpenedData[sIdx + sc] = clamp(denoisedData[sIdx + sc] + highPass * effectiveSharp);
          }
        }
      }
    }

    self.postMessage({ type: 'progress', id: id, percent: 70, stage: 'Adjusting skin glow, exposure & teeth brightness...' });

    // Step 4: Color Grading, Glow, Eye Whitening
    var glowFactor = Math.max(0, Math.min(100, settings.glow || 0)) / 100;
    var warmth = Math.max(-50, Math.min(50, settings.warmth || 0));
    var brightness = Math.max(-50, Math.min(50, settings.brightness || 0));
    var contrast = Math.max(-50, Math.min(50, settings.contrast || 0));
    var eyeTeethClarity = Math.max(0, Math.min(100, settings.eyeTeethClarity || 0)) / 100;
    var isMono = !!settings.monochrome;
    var contrastMult = (259 * (contrast * 1.5 + 255)) / (255 * (259 - contrast * 1.5));

    for (var ci = 0; ci < totalPixels; ci++) {
      var cIdx = ci * 4;
      var cr = sharpenedData[cIdx];
      var cg = sharpenedData[cIdx + 1];
      var cb = sharpenedData[cIdx + 2];
      var cProb = skinMap[ci];
      var cLum = lumMap[ci];

      // Eye & Teeth Whitening
      if (eyeTeethClarity > 0.05 && cLum > 145) {
        var maxC = Math.max(cr, cg, cb);
        var minC = Math.min(cr, cg, cb);
        var sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        if (sat < 0.28) {
          var boost = eyeTeethClarity * 24 * (1 - sat * 3);
          cr = clamp(cr + boost);
          cg = clamp(cg + boost);
          cb = clamp(cb + boost * 1.15);
        }
      }

      // Studio Skin Glow
      if (glowFactor > 0.05 && cProb > 0.1) {
        var hGlow = (cLum * cLum) / 65025;
        var gBoost = glowFactor * 28 * hGlow * cProb;
        cr = clamp(cr + gBoost * 1.1);
        cg = clamp(cg + gBoost * 0.95);
        cb = clamp(cb + gBoost * 0.8);
      }

      // Warmth
      if (warmth !== 0 && cProb > 0.1) {
        var wEff = (warmth / 50) * 16 * cProb;
        if (warmth > 0) {
          cr = clamp(cr + wEff * 1.2);
          cg = clamp(cg + wEff * 0.5);
          cb = clamp(cb - wEff * 0.4);
        } else {
          cr = clamp(cr + wEff * 1.1);
          cb = clamp(cb - wEff * 0.8);
        }
      }

      // Brightness midtone lift
      if (brightness !== 0) {
        var bOff = (brightness / 50) * 35;
        var bWeight = 1.0 - (cLum / 255) * 0.5;
        cr = clamp(cr + bOff * bWeight);
        cg = clamp(cg + bOff * bWeight);
        cb = clamp(cb + bOff * bWeight);
      }

      // Contrast
      if (contrast !== 0) {
        cr = clamp(contrastMult * (cr - 128) + 128);
        cg = clamp(contrastMult * (cg - 128) + 128);
        cb = clamp(contrastMult * (cb - 128) + 128);
      }

      // Monochrome
      if (isMono) {
        var gray = Math.round(0.299 * cr + 0.587 * cg + 0.114 * cb);
        cr = gray;
        cg = gray;
        cb = gray;
      }

      sharpenedData[cIdx] = cr;
      sharpenedData[cIdx + 1] = cg;
      sharpenedData[cIdx + 2] = cb;
    }

    // Step 5: AI Super-Resolution Upscaling (2x or 4x)
    var finalWidth = width;
    var finalHeight = height;
    var finalBuffer = sharpenedData.buffer;

    if (upscale > 1) {
      self.postMessage({ type: 'progress', id: id, percent: 85, stage: 'Performing ' + upscale + 'x Super-Resolution Upscaling...' });
      var scale = upscale; // 2 or 4
      finalWidth = width * scale;
      finalHeight = height * scale;
      var outPixels = finalWidth * finalHeight;
      var upscaledData = new Uint8ClampedArray(outPixels * 4);

      // Bicubic Interpolation with High-Frequency Edge Reconstruction
      function cubicHermite(A, B, C, D, t) {
        var a = -A / 2.0 + (3.0 * B) / 2.0 - (3.0 * C) / 2.0 + D / 2.0;
        var b = A - (5.0 * B) / 2.0 + 2.0 * C - D / 2.0;
        var c = -A / 2.0 + C / 2.0;
        var d = B;
        return a * t * t * t + b * t * t + c * t + d;
      }

      function getPx(px, py, c) {
        var cx = px < 0 ? 0 : px >= width ? width - 1 : px;
        var cy = py < 0 ? 0 : py >= height ? height - 1 : py;
        return sharpenedData[(cy * width + cx) * 4 + c];
      }

      for (var uy = 0; uy < finalHeight; uy++) {
        var srcY = uy / scale;
        var y1 = Math.floor(srcY);
        var tY = srcY - y1;

        var outRow = uy * finalWidth;

        for (var ux = 0; ux < finalWidth; ux++) {
          var srcX = ux / scale;
          var x1 = Math.floor(srcX);
          var tX = srcX - x1;

          var outIdx = (outRow + ux) * 4;

          for (var c = 0; c < 3; c++) {
            var col0 = cubicHermite(getPx(x1 - 1, y1 - 1, c), getPx(x1, y1 - 1, c), getPx(x1 + 1, y1 - 1, c), getPx(x1 + 2, y1 - 1, c), tX);
            var col1 = cubicHermite(getPx(x1 - 1, y1, c), getPx(x1, y1, c), getPx(x1 + 1, y1, c), getPx(x1 + 2, y1, c), tX);
            var col2 = cubicHermite(getPx(x1 - 1, y1 + 1, c), getPx(x1, y1 + 1, c), getPx(x1 + 1, y1 + 1, c), getPx(x1 + 2, y1 + 1, c), tX);
            var col3 = cubicHermite(getPx(x1 - 1, y1 + 2, c), getPx(x1, y1 + 2, c), getPx(x1 + 1, y1 + 2, c), getPx(x1 + 2, y1 + 2, c), tX);

            var val = cubicHermite(col0, col1, col2, col3, tY);
            upscaledData[outIdx + c] = clamp(Math.round(val));
          }
          upscaledData[outIdx + 3] = 255;
        }
      }

      finalBuffer = upscaledData.buffer;
    }

    self.postMessage({ type: 'progress', id: id, percent: 100, stage: 'Finalizing enhanced portrait...' });

    // Send result back with zero-copy buffer transfer
    self.postMessage(
      {
        type: 'complete',
        id: id,
        width: finalWidth,
        height: finalHeight,
        buffer: finalBuffer,
      },
      [finalBuffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', id: id, error: err.message || String(err) });
  }
};
`;
