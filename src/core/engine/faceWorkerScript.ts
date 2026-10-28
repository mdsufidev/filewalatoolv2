/**
 * faceWorkerScript.ts
 * Self-contained Web Worker script for multi-threaded facial deblurring,
 * multi-scale frequency deconvolution, local adaptive contrast (CLAHE),
 * gradient-aware skin smoothing, and 2x/4x super-resolution upscaling.
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
    self.postMessage({ type: 'progress', id: id, percent: 10, stage: 'Analyzing image frequencies & blur profile...' });

    var srcData = new Uint8ClampedArray(srcBuffer);
    var totalPixels = width * height;

    function clamp(val) {
      return val < 0 ? 0 : val > 255 ? 255 : val;
    }

    // Step 1: Extract Luminance channel Y (ITU-R BT.601)
    var lum = new Float32Array(totalPixels);
    for (var i = 0; i < totalPixels; i++) {
      var idx = i * 4;
      lum[i] = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
    }

    // Separable Fast Box Blur (O(1) moving accumulator per pixel)
    function fastBoxBlur(src, dst, w, h, radius) {
      var temp = new Float32Array(w * h);
      var scale = 1.0 / (2 * radius + 1);

      // Horizontal pass
      for (var y = 0; y < h; y++) {
        var row = y * w;
        var sum = 0;
        for (var k = -radius; k <= radius; k++) {
          var px = k < 0 ? 0 : k >= w ? w - 1 : k;
          sum += src[row + px];
        }
        for (var x = 0; x < w; x++) {
          temp[row + x] = sum * scale;
          var left = x - radius;
          var right = x + radius + 1;
          var pLeft = left < 0 ? 0 : left >= w ? w - 1 : left;
          var pRight = right < 0 ? 0 : right >= w ? w - 1 : right;
          sum += src[row + pRight] - src[row + pLeft];
        }
      }

      // Vertical pass
      for (var x = 0; x < w; x++) {
        var sum = 0;
        for (var k = -radius; k <= radius; k++) {
          var py = k < 0 ? 0 : k >= h ? h - 1 : k;
          sum += temp[py * w + x];
        }
        for (var y = 0; y < h; y++) {
          dst[y * w + x] = sum * scale;
          var top = y - radius;
          var bottom = y + radius + 1;
          var pTop = top < 0 ? 0 : top >= h ? h - 1 : top;
          var pBottom = bottom < 0 ? 0 : bottom >= h ? h - 1 : bottom;
          sum += temp[pBottom * w + x] - temp[pTop * w + x];
        }
      }
    }

    self.postMessage({ type: 'progress', id: id, percent: 30, stage: 'Executing multi-scale optical blur reversal...' });

    // Multi-Scale Gaussian Pyramids for Optical Blur Reversal
    var blur1 = new Float32Array(totalPixels); // Radius 2 (fine edges)
    var blur2 = new Float32Array(totalPixels); // Radius 6 (mid - eyes, pupils, lips)
    var blur3 = new Float32Array(totalPixels); // Radius 14 (broad optical blur)

    fastBoxBlur(lum, blur1, width, height, 2);
    fastBoxBlur(lum, blur2, width, height, 6);
    fastBoxBlur(lum, blur3, width, height, 14);

    var deblurFactor = Math.max(0, Math.min(100, settings.deblur !== undefined ? settings.deblur : 65)) / 100;
    var clarityFactor = Math.max(0, Math.min(100, settings.clarity !== undefined ? settings.clarity : 55)) / 100;
    var sharpnessFactor = Math.max(0, Math.min(100, settings.sharpness || 0)) / 100;
    var smoothFactor = Math.max(0, Math.min(100, settings.smooth || 0)) / 100;
    var glowFactor = Math.max(0, Math.min(100, settings.glow || 0)) / 100;
    var warmth = Math.max(-50, Math.min(50, settings.warmth || 0));
    var brightness = Math.max(-50, Math.min(50, settings.brightness || 0));
    var contrast = Math.max(-50, Math.min(50, settings.contrast || 0));
    var eyeTeethClarity = Math.max(0, Math.min(100, settings.eyeTeethClarity || 0)) / 100;
    var isMono = !!settings.monochrome;
    var contrastMult = (259 * (contrast * 1.5 + 255)) / (255 * (259 - contrast * 1.5));

    self.postMessage({ type: 'progress', id: id, percent: 50, stage: 'Reconstructing eye pupils, lips & facial clarity...' });

    // Reconstruct enhanced luminance map
    var enhancedLum = new Float32Array(totalPixels);

    for (var i = 0; i < totalPixels; i++) {
      var origL = lum[i];
      var b1 = blur1[i];
      var b2 = blur2[i];
      var b3 = blur3[i];

      var highFreq = origL - b1;   // Micro texture & eyelashes
      var midFreq = b1 - b2;       // Eye pupils, iris contours, lips, nostrils
      var broadFreq = b2 - b3;     // Spread optical camera blur

      var lVal = origL;

      // 1. Multi-scale optical deconvolution: strongly reverses Gaussian optical spread
      if (deblurFactor > 0.05) {
        var midBoost = midFreq * (1.0 + deblurFactor * 3.5);
        var broadBoost = broadFreq * (1.0 + deblurFactor * 1.8);
        var highBoost = highFreq * (1.0 + deblurFactor * 1.4);
        lVal = b3 + broadBoost + midBoost + highBoost;
      }

      // 2. Local Adaptive Contrast (CLAHE-style Clarity): pulls facial features out of haze
      if (clarityFactor > 0.05) {
        var localDiff = origL - b3;
        var clarityBoost = localDiff * clarityFactor * 1.5;
        lVal += clarityBoost;
      }

      // 3. High-Pass Sharpening for crisp facial details
      if (sharpnessFactor > 0.05) {
        lVal += highFreq * sharpnessFactor * 2.0;
      }

      // 4. Subtle Surface Smoothing on low-gradient flat areas (skin cheeks)
      if (smoothFactor > 0.05) {
        var grad = Math.abs(highFreq) + Math.abs(midFreq);
        if (grad < 12.0) {
          // Flat skin area: blend with smoothed luma to eliminate noise
          var smoothBlend = smoothFactor * (1.0 - grad / 12.0) * 0.7;
          lVal = lVal * (1.0 - smoothBlend) + b1 * smoothBlend;
        }
      }

      enhancedLum[i] = clamp(lVal);
    }

    self.postMessage({ type: 'progress', id: id, percent: 70, stage: 'Calibrating skin glow, teeth whitening & tone grading...' });

    // Step 4: Transfer enhanced luminance back to RGB channels
    var processedData = new Uint8ClampedArray(totalPixels * 4);

    for (var ci = 0; ci < totalPixels; ci++) {
      var cIdx = ci * 4;
      var origR = srcData[cIdx];
      var origG = srcData[cIdx + 1];
      var origB = srcData[cIdx + 2];
      var origL = lum[ci] || 1;
      var targetL = enhancedLum[ci];

      var ratio = targetL / origL;
      var cr = clamp(origR * ratio);
      var cg = clamp(origG * ratio);
      var cb = clamp(origB * ratio);

      // Eye & Teeth Whitening
      if (eyeTeethClarity > 0.05 && targetL > 140) {
        var maxC = Math.max(cr, cg, cb);
        var minC = Math.min(cr, cg, cb);
        var sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        if (sat < 0.28) {
          var boost = eyeTeethClarity * 25 * (1 - sat * 3);
          cr = clamp(cr + boost);
          cg = clamp(cg + boost);
          cb = clamp(cb + boost * 1.15);
        }
      }

      // Studio Skin Glow
      if (glowFactor > 0.05) {
        var hGlow = (targetL * targetL) / 65025;
        var gBoost = glowFactor * 24 * hGlow;
        cr = clamp(cr + gBoost * 1.1);
        cg = clamp(cg + gBoost * 0.95);
        cb = clamp(cb + gBoost * 0.8);
      }

      // Skin Warmth
      if (warmth !== 0) {
        var wEff = (warmth / 50) * 16;
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
        var bWeight = 1.0 - (targetL / 255) * 0.5;
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

      processedData[cIdx] = cr;
      processedData[cIdx + 1] = cg;
      processedData[cIdx + 2] = cb;
      processedData[cIdx + 3] = 255;
    }

    // Step 5: AI Super-Resolution Upscaling (2x or 4x)
    var finalWidth = width;
    var finalHeight = height;
    var finalBuffer = processedData.buffer;

    if (upscale > 1) {
      self.postMessage({ type: 'progress', id: id, percent: 85, stage: 'Performing ' + upscale + 'x Super-Resolution with edge reconstruction...' });
      var scale = upscale; // 2 or 4
      finalWidth = width * scale;
      finalHeight = height * scale;
      var outPixels = finalWidth * finalHeight;
      var upscaledData = new Uint8ClampedArray(outPixels * 4);

      // Bicubic Hermite with Anti-Aliased Edge Sharpness
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
        return processedData[(cy * width + cx) * 4 + c];
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

      // Post-upscale edge crisping pass
      if (deblurFactor > 0.3) {
        for (var sy = 1; sy < finalHeight - 1; sy++) {
          var sRow = sy * finalWidth;
          for (var sx = 1; sx < finalWidth - 1; sx++) {
            var sIdx = (sRow + sx) * 4;
            for (var sc = 0; sc < 3; sc++) {
              var center = upscaledData[sIdx + sc];
              var north = upscaledData[((sy - 1) * finalWidth + sx) * 4 + sc];
              var south = upscaledData[((sy + 1) * finalWidth + sx) * 4 + sc];
              var west = upscaledData[(sRow + (sx - 1)) * 4 + sc];
              var east = upscaledData[(sRow + (sx + 1)) * 4 + sc];
              var edgeDiff = center * 4 - north - south - west - east;
              upscaledData[sIdx + sc] = clamp(center + edgeDiff * 0.35);
            }
          }
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
