/**
 * FastPortraitSegmenter.ts
 * Ultra-Fast 100% Client-Side AI Portrait & Selfie Segmentation Engine.
 * 
 * Architecture:
 * 1. Google MediaPipe Tasks Vision (ImageSegmenter, 1.7MB float16 model).
 * 2. Real-time GPU execution (~30ms - 60ms inference latency).
 * 3. FastGuidedFilter alpha matting refinement for sub-pixel hair strand preservation.
 * 4. Total processing time: Under 100ms.
 */

import { FastGuidedFilter } from './FastGuidedFilter';

export const MEDIAPIPE_VISION_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
export const MEDIAPIPE_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
export const SELFIE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

export class FastPortraitSegmenter {
  private static segmenterInstance: any = null;
  private static isInitializing = false;
  private static initPromise: Promise<any> | null = null;

  /**
   * Preload the 1.7MB segmenter model during idle time.
   */
  public static preload(): void {
    if (typeof window === 'undefined') return;
    this.getSegmenter().catch(() => {});
  }

  /**
   * Lazy initializes the MediaPipe ImageSegmenter instance.
   */
  public static async getSegmenter(): Promise<any> {
    if (this.segmenterInstance) return this.segmenterInstance;
    if (this.initPromise) return this.initPromise;

    if (typeof window === 'undefined') return null;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const dynamicImport = new Function('url', 'return import(url)');
        const visionModule = await dynamicImport(MEDIAPIPE_VISION_BUNDLE);
        const { FilesetResolver, ImageSegmenter } = visionModule;

        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

        let segmenter: any = null;
        try {
          // Attempt GPU delegate (WebGL/WebGPU)
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: SELFIE_MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'IMAGE',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        } catch (gpuErr) {
          console.warn('[FastPortraitSegmenter] GPU delegate failed, falling back to CPU:', gpuErr);
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: SELFIE_MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'IMAGE',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        }

        this.segmenterInstance = segmenter;
        this.isInitializing = false;
        return segmenter;
      } catch (err) {
        this.isInitializing = false;
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Segments the portrait/person in the image and returns a refined high-resolution alpha mask canvas.
   * 
   * @param source HTMLImageElement or HTMLCanvasElement
   * @param onProgress Optional progress callback
   * @returns HTMLCanvasElement containing the 8-bit continuous refined alpha mask
   */
  public static async segment(
    source: HTMLImageElement | HTMLCanvasElement,
    onProgress?: (pct: number, stage: string) => void
  ): Promise<HTMLCanvasElement> {
    const w = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
    const h = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

    onProgress?.(15, 'Initializing Ultra-Fast Portrait AI...');
    const segmenter = await this.getSegmenter();
    if (!segmenter) throw new Error('Could not initialize Fast Portrait Segmenter');

    onProgress?.(45, 'Running neural portrait matting (<50ms)...');

    // Make sure source is drawn on an intermediate canvas if necessary
    let inputSource: HTMLImageElement | HTMLCanvasElement = source;
    if ('naturalWidth' in source && !source.complete) {
      throw new Error('Image source is not fully loaded');
    }

    const segmentationResult = await new Promise<any>((resolve, reject) => {
      try {
        if (typeof segmenter.segment === 'function') {
          // Callback-based or direct return based on MediaPipe version
          const directRes = segmenter.segment(inputSource, (res: any) => {
            resolve(res);
          });
          if (directRes && directRes.confidenceMasks) {
            resolve(directRes);
          }
        } else {
          reject(new Error('Segmenter segment method not found'));
        }
      } catch (e) {
        reject(e);
      }
    });

    if (!segmentationResult || !segmentationResult.confidenceMasks || segmentationResult.confidenceMasks.length === 0) {
      throw new Error('No confidence mask returned by portrait segmenter');
    }

    onProgress?.(80, 'Refining hair strands with Fast Guided Filter...');

    const masks = segmentationResult.confidenceMasks;
    // In selfie segmenter:
    // When 2 masks are returned: index 1 is foreground person, index 0 is background.
    // When 1 mask is returned: index 0 is foreground person.
    const targetMask = masks.length > 1 ? masks[1] : masks[0];
    const maskW = targetMask.width;
    const maskH = targetMask.height;

    let maskData: Float32Array;
    if (typeof targetMask.getAsFloat32Array === 'function') {
      maskData = targetMask.getAsFloat32Array();
    } else if (typeof targetMask.getAsUint8Array === 'function') {
      const u8 = targetMask.getAsUint8Array();
      maskData = new Float32Array(u8.length);
      const inv255 = 1.0 / 255.0;
      for (let i = 0; i < u8.length; i++) {
        maskData[i] = u8[i] * inv255;
      }
    } else {
      throw new Error('Unsupported MediaPipe mask buffer type');
    }

    // Polarity verification: in portraits, center pixel is person and corners are background.
    // If center confidence is lower than corner, the mask is inverted.
    const centerIdx = Math.floor(maskH / 2) * maskW + Math.floor(maskW / 2);
    const cornerIdx = 2 * maskW + 2;
    if (maskData[centerIdx] < maskData[cornerIdx]) {
      for (let i = 0; i < maskData.length; i++) {
        maskData[i] = 1.0 - maskData[i];
      }
    }

    // Apply Fast Guided Filter for sub-pixel hair strand and edge preservation
    const refinedMask = FastGuidedFilter.refine(
      source,
      maskData,
      maskW,
      maskH,
      w,
      h,
      4,
      1e-3
    );

    onProgress?.(100, 'Portrait Cutout Complete');
    return refinedMask;
  }
}
