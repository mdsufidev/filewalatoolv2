/**
 * FaceEnhancerEngine.ts
 * High-Performance 100% Client-Side Facial Retouch & Enhancement Engine
 * Runs completely in-browser via HTML5 Canvas 2D and TypedArrays. Zero server uploads.
 */

export interface FaceEnhanceSettings {
  smooth: number;          // 0 to 100 (Skin smoothing & blemish soften)
  sharpness: number;       // 0 to 100 (Eye, hair, eyelashes, facial contours clarity)
  glow: number;            // 0 to 100 (Studio skin radiance / highlight bloom)
  warmth: number;          // -50 to +50 (Skin temperature: cool porcelain vs warm sun-kissed)
  brightness: number;      // -50 to +50 (Facial exposure lift)
  contrast: number;        // -50 to +50 (Dynamic contrast & pop)
  eyeTeethClarity: number; // 0 to 100 (Eye whitening & teeth brightening)
  monochrome?: boolean;    // Black & White portrait mode
}

export const DEFAULT_ENHANCE_SETTINGS: FaceEnhanceSettings = {
  smooth: 50,
  sharpness: 50,
  glow: 25,
  warmth: 10,
  brightness: 10,
  contrast: 15,
  eyeTeethClarity: 40,
  monochrome: false,
};

export interface FacePreset {
  id: string;
  name: string;
  tagline: string;
  iconName: string;
  badge?: string;
  settings: FaceEnhanceSettings;
}

export const FACE_ENHANCER_PRESETS: FacePreset[] = [
  {
    id: 'smart-auto',
    name: 'Smart Auto AI',
    tagline: 'Balanced natural glow, silky skin & crystal-clear eyes',
    iconName: 'Sparkles',
    badge: 'Popular',
    settings: {
      smooth: 55,
      sharpness: 50,
      glow: 30,
      warmth: 10,
      brightness: 12,
      contrast: 15,
      eyeTeethClarity: 45,
      monochrome: false,
    },
  },
  {
    id: 'studio-glamour',
    name: 'Studio Glamour',
    tagline: 'Porcelain skin finish, radiant highlight bloom & vivid lips',
    iconName: 'Wand2',
    badge: 'Pro Beauty',
    settings: {
      smooth: 80,
      sharpness: 45,
      glow: 50,
      warmth: 15,
      brightness: 18,
      contrast: 20,
      eyeTeethClarity: 65,
      monochrome: false,
    },
  },
  {
    id: 'passport-id',
    name: 'ID & Passport Clear',
    tagline: 'Sharp facial contours, formal natural tones & zero glare',
    iconName: 'ShieldCheck',
    badge: 'Official Presets',
    settings: {
      smooth: 25,
      sharpness: 70,
      glow: 10,
      warmth: 0,
      brightness: 15,
      contrast: 25,
      eyeTeethClarity: 40,
      monochrome: false,
    },
  },
  {
    id: 'golden-hour',
    name: 'Sun-Kissed Glow',
    tagline: 'Warm golden skin tone, soft sunset bloom & lively eyes',
    iconName: 'Sun',
    settings: {
      smooth: 50,
      sharpness: 40,
      glow: 40,
      warmth: 35,
      brightness: 10,
      contrast: 15,
      eyeTeethClarity: 35,
      monochrome: false,
    },
  },
  {
    id: 'dramatic-bw',
    name: 'Fine-Art Monochrome',
    tagline: 'Deep studio shadows, crisp eye specular highlights & smooth skin',
    iconName: 'Film',
    settings: {
      smooth: 65,
      sharpness: 75,
      glow: 20,
      warmth: 0,
      brightness: 0,
      contrast: 40,
      eyeTeethClarity: 50,
      monochrome: true,
    },
  },
  {
    id: 'natural-soft',
    name: 'Subtle & Natural',
    tagline: 'Gentle touch-up preserving original skin texture',
    iconName: 'Feather',
    settings: {
      smooth: 35,
      sharpness: 35,
      glow: 15,
      warmth: 5,
      brightness: 8,
      contrast: 10,
      eyeTeethClarity: 25,
      monochrome: false,
    },
  },
];

export class FaceEnhancerEngine {
  /**
   * Helper function: Computes normalized skin probability [0, 1]
   * Uses peer-reviewed ITU-R BT.601 YCbCr locus with smooth falloff.
   */
  public static calculateSkinFactor(r: number, g: number, b: number): number {
    // Basic RGB thresholds
    if (r <= g || r <= b || r < 50) return 0;
    if (r - g < 8) return 0;

    // YCbCr transformation
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    // Standard human skin bounding box: Cb [77, 127], Cr [133, 173]
    if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
      // Hermite smoothstep falloff near borders
      const cbDist = Math.min(cb - 77, 127 - cb) / 25;
      const crDist = Math.min(cr - 133, 173 - cr) / 20;
      const factor = Math.min(1, Math.max(0, Math.min(cbDist, crDist)));
      return factor;
    }

    return 0;
  }

  /**
   * Helper: Clamps a value into [0, 255]
   */
  private static clamp(val: number): number {
    return val < 0 ? 0 : val > 255 ? 255 : val;
  }

  /**
   * Primary processing method:
   * Takes a source image or canvas, applies the multi-pass facial retouching pipeline,
   * and returns the enhanced HTMLCanvasElement.
   */
  public static processImage(
    source: HTMLImageElement | HTMLCanvasElement,
    settings: FaceEnhanceSettings,
    maxDimension?: number
  ): HTMLCanvasElement {
    const origW = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
    const origH = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

    let targetW = origW;
    let targetH = origH;

    if (maxDimension && (origW > maxDimension || origH > maxDimension)) {
      if (origW > origH) {
        targetW = maxDimension;
        targetH = Math.round((origH * maxDimension) / origW);
      } else {
        targetH = maxDimension;
        targetW = Math.round((origW * maxDimension) / origH);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to acquire 2D canvas context');

    // High quality downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetW, targetH);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const len = data.length;
    const totalPixels = targetW * targetH;

    // Working buffer for fast convolution and edge-preserving bilateral filtering
    const srcCopy = new Uint8ClampedArray(data);

    // Extract parameters
    const smoothFactor = Math.max(0, Math.min(100, settings.smooth)) / 100;
    const sharpnessFactor = Math.max(0, Math.min(100, settings.sharpness)) / 100;
    const glowFactor = Math.max(0, Math.min(100, settings.glow)) / 100;
    const warmth = Math.max(-50, Math.min(50, settings.warmth));
    const brightness = Math.max(-50, Math.min(50, settings.brightness));
    const contrast = Math.max(-50, Math.min(50, settings.contrast));
    const eyeTeethClarity = Math.max(0, Math.min(100, settings.eyeTeethClarity)) / 100;
    const isMono = !!settings.monochrome;

    // Precalculate contrast factor
    const contrastMult = (259 * (contrast * 1.5 + 255)) / (255 * (259 - contrast * 1.5));

    // Precompute skin probability map and luminance
    const skinMap = new Float32Array(totalPixels);
    const lumMap = new Uint8Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = srcCopy[idx];
      const g = srcCopy[idx + 1];
      const b = srcCopy[idx + 2];

      skinMap[i] = this.calculateSkinFactor(r, g, b);
      lumMap[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    // Step 1: Edge-Preserving Bilateral Surface Smoothing on Skin Pixels
    // Smooths skin blemishes & rough pore noise while strictly preserving sharp contours (eyes, lips, nostrils)
    if (smoothFactor > 0.05) {
      const rangeThreshold = 22 + smoothFactor * 32; // Higher smooth = wider intensity tolerance
      const rangeThreshSq = rangeThreshold * rangeThreshold;
      const radius = smoothFactor > 0.6 ? 2 : 1; // 3x3 or 5x5 neighborhood

      for (let y = radius; y < targetH - radius; y++) {
        const rowOffset = y * targetW;
        for (let x = radius; x < targetW - radius; x++) {
          const pixelIdx = rowOffset + x;
          const skinProb = skinMap[pixelIdx];

          if (skinProb <= 0.05) continue; // Skip non-skin pixels for high-performance speed

          const centerR = srcCopy[pixelIdx * 4];
          const centerG = srcCopy[pixelIdx * 4 + 1];
          const centerB = srcCopy[pixelIdx * 4 + 2];

          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let totalWeight = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            const nRowOffset = (y + dy) * targetW;
            for (let dx = -radius; dx <= radius; dx++) {
              const nIdx = nRowOffset + (x + dx);
              const nr = srcCopy[nIdx * 4];
              const ng = srcCopy[nIdx * 4 + 1];
              const nb = srcCopy[nIdx * 4 + 2];

              // Color range difference
              const dr = nr - centerR;
              const dg = ng - centerG;
              const db = nb - centerB;
              const distSq = dr * dr + dg * dg + db * db;

              // Bilateral weight: Gaussian falloff when difference exceeds threshold
              if (distSq < rangeThreshSq * 3) {
                const w = Math.exp(-distSq / (2 * rangeThreshSq));
                sumR += nr * w;
                sumG += ng * w;
                sumB += nb * w;
                totalWeight += w;
              }
            }
          }

          if (totalWeight > 0) {
            const blend = smoothFactor * skinProb;
            const avgR = sumR / totalWeight;
            const avgG = sumG / totalWeight;
            const avgB = sumB / totalWeight;

            const idx = pixelIdx * 4;
            data[idx] = Math.round(centerR * (1 - blend) + avgR * blend);
            data[idx + 1] = Math.round(centerG * (1 - blend) + avgG * blend);
            data[idx + 2] = Math.round(centerB * (1 - blend) + avgB * blend);
          }
        }
      }
    }

    // Step 2: High-Pass Sharpening for Eyes, Eyelashes, Hair & Facial Contours
    if (sharpnessFactor > 0.05) {
      const sharpStrength = sharpnessFactor * 1.35;
      for (let y = 1; y < targetH - 1; y++) {
        const rowOffset = y * targetW;
        for (let x = 1; x < targetW - 1; x++) {
          const pixelIdx = rowOffset + x;
          const idx = pixelIdx * 4;
          const skinProb = skinMap[pixelIdx];

          // Sharpen non-skin details fully (eyes, eyebrows, pupils, hair)
          // On skin areas, apply subtle micro-contrast so skin still has natural depth
          const effectiveSharp = sharpStrength * (1.0 - skinProb * 0.45);

          // 3x3 Laplacian edge extraction
          for (let c = 0; c < 3; c++) {
            const center = srcCopy[idx + c];
            const north = srcCopy[((y - 1) * targetW + x) * 4 + c];
            const south = srcCopy[((y + 1) * targetW + x) * 4 + c];
            const west = srcCopy[(rowOffset + (x - 1)) * 4 + c];
            const east = srcCopy[(rowOffset + (x + 1)) * 4 + c];

            const highPass = center * 4 - north - south - west - east;
            const sharpened = data[idx + c] + highPass * effectiveSharp;
            data[idx + c] = this.clamp(sharpened);
          }
        }
      }
    }

    // Step 3: Color Grading, Studio Skin Glow, Teeth/Eye Brightening & Exposure
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];
      const skinProb = skinMap[i];
      const lum = lumMap[i];

      // A. Teeth & Eye Sclera Whitening / Clarity
      // Light pixels with low saturation (eyes whites, teeth)
      if (eyeTeethClarity > 0.05 && lum > 145) {
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

        if (sat < 0.28) {
          const boost = eyeTeethClarity * 24 * (1 - sat * 3);
          r = this.clamp(r + boost);
          g = this.clamp(g + boost);
          // Balance out yellow cast on teeth and eyes by gently lifting blue
          b = this.clamp(b + boost * 1.15);
        }
      }

      // B. Studio Skin Radiance / Glow
      if (glowFactor > 0.05 && skinProb > 0.1) {
        const highlightGlow = (lum * lum) / 65025; // Quadratic highlight emphasis
        const glowBoost = glowFactor * 28 * highlightGlow * skinProb;
        r = this.clamp(r + glowBoost * 1.1);
        g = this.clamp(g + glowBoost * 0.95);
        b = this.clamp(b + glowBoost * 0.8);
      }

      // C. Skin Tone Temperature / Warmth
      if (warmth !== 0 && skinProb > 0.1) {
        const wEffect = (warmth / 50) * 16 * skinProb;
        if (warmth > 0) {
          // Warm sun-kissed tone (golden peach)
          r = this.clamp(r + wEffect * 1.2);
          g = this.clamp(g + wEffect * 0.5);
          b = this.clamp(b - wEffect * 0.4);
        } else {
          // Cool porcelain tone (reduce flushed redness)
          r = this.clamp(r + wEffect * 1.1);
          b = this.clamp(b - wEffect * 0.8);
        }
      }

      // D. Facial Exposure / Brightness Lift
      if (brightness !== 0) {
        const bOffset = (brightness / 50) * 35;
        // Lift midtones smoothly without crushing highlights
        const weight = 1.0 - (lum / 255) * 0.5;
        r = this.clamp(r + bOffset * weight);
        g = this.clamp(g + bOffset * weight);
        b = this.clamp(b + bOffset * weight);
      }

      // E. Dynamic Contrast
      if (contrast !== 0) {
        r = this.clamp(contrastMult * (r - 128) + 128);
        g = this.clamp(contrastMult * (g - 128) + 128);
        b = this.clamp(contrastMult * (b - 128) + 128);
      }

      // F. Optional Monochrome Portrait
      if (isMono) {
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        r = gray;
        g = gray;
        b = gray;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
}
