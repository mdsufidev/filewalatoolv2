import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  RefreshCw,
  Sparkles,
  Eraser,
  Paintbrush,
  Eye,
  Check,
  ShieldCheck,
  Copy,
  Share2,
  Wand2,
  RotateCcw,
  Zap,
  Cpu,
  Sliders,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { Dropzone } from '../../ui/Dropzone';
import { ImageToolGuideSection } from './ImageToolGuideSection';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { triggerFileDownload, formatBytes } from '../../../utils/memory';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../../utils/clipboardAndShare';
import { useTheme } from '../../../core/themeContext';

interface BackgroundRemoverToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFiles?: File[] | null;
}

export type RemovalEngine = 'fast' | 'ai';
export type BgReplacement = 'transparent' | 'white' | 'blue' | 'grey' | 'custom' | 'blur';
export type ToolMode = 'wand' | 'erase' | 'restore';

// Dynamic CDN configurations for Zero-Vercel-Bundle-Bloat
const ORT_CDN_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';
const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const AI_MODEL_URL = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx';
const MODEL_CACHE_NAME = 'filewala-ai-model-cache-v1';
const AI_INPUT_SIZE = 1024;

export const BackgroundRemoverTool: React.FC<BackgroundRemoverToolProps> = ({
  onNotify,
  initialFiles,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  // Dual-Engine Mode: Fast (Canvas 2D + BFS) vs AI Smart (WebGPU + ONNX RMBG-1.4)
  const [engineMode, setEngineMode] = useState<RemovalEngine>('fast');
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Active Tool Mode (Manual Brush / Wand)
  const [activeToolMode, setActiveToolMode] = useState<ToolMode>('wand');

  // Fast Algorithm Settings
  const [tolerance, setTolerance] = useState<number>(28); // 5 to 75%
  const [brushSize, setBrushSize] = useState<number>(28); // 5 to 80px

  // Background Replacement
  const [bgMode, setBgMode] = useState<BgReplacement>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [removedObjectCount, setRemovedObjectCount] = useState<number>(0);

  // AI Pipeline State
  const [aiStatus, setAiStatus] = useState<string>('Ready');
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiInferenceTimeMs, setAiInferenceTimeMs] = useState<number | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const aiSessionRef = useRef<any>(null);

  // Detect WebGPU hardware availability on mount
  useEffect(() => {
    async function checkWebGPU() {
      if (typeof window !== 'undefined' && 'navigator' in window && 'gpu' in navigator && (navigator as any).gpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setHasWebGPU(!!adapter);
        } catch {
          setHasWebGPU(false);
        }
      } else {
        setHasWebGPU(false);
      }
    }
    checkWebGPU();
  }, []);

  // Load initial file if provided
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !currentImage) {
      loadFile(initialFiles[0]);
    }
  }, [initialFiles, loadFile, currentImage]);

  /* -------------------------------------------------------------
     DYNAMIC ONNX RUNTIME CDN LOADER & CACHESTORAGE MANAGER
  ------------------------------------------------------------- */
  const loadOrtFromCDN = useCallback(async (): Promise<any> => {
    if (typeof window === 'undefined') return null;
    if ((window as any).ort) return (window as any).ort;

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${ORT_CDN_URL}"]`);
      if (existingScript) {
        const checkInterval = setInterval(() => {
          if ((window as any).ort) {
            clearInterval(checkInterval);
            resolve((window as any).ort);
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
          ort.env.wasm.numThreads = Math.min(4, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2);
          resolve(ort);
        } else {
          reject(new Error('Failed to bind window.ort'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load ONNX Runtime Web from CDN'));
      document.head.appendChild(script);
    });
  }, []);

  const getCachedModelBuffer = useCallback(async (url: string): Promise<ArrayBuffer> => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(MODEL_CACHE_NAME);
        const cachedRes = await cache.match(url);
        if (cachedRes) {
          return await cachedRes.arrayBuffer();
        }
        setAiStatus('Downloading Neural Weights (~40MB, cached locally)...');
        const fetchRes = await fetch(url);
        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);

        await cache.put(url, fetchRes.clone());
        return await fetchRes.arrayBuffer();
      } catch (err) {
        console.warn('CacheStorage read failed, falling back to direct network fetch:', err);
      }
    }
    const res = await fetch(url);
    return await res.arrayBuffer();
  }, []);

  /* -------------------------------------------------------------
     COMPOSITING RENDER PIPELINE
  ------------------------------------------------------------- */
  const renderCompositedResult = useCallback(() => {
    if (!currentImage || !canvasRef.current) return;
    const img = currentImage.imageElement;
    const canvas = canvasRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw source image onto offscreen canvas
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    if (!fgCtx) return;

    fgCtx.drawImage(img, 0, 0, w, h);
    const fgImgData = fgCtx.getImageData(0, 0, w, h);
    const data = fgImgData.data;

    // 2. Apply Mask if present
    if (maskCanvasRef.current) {
      const mctx = maskCanvasRef.current.getContext('2d');
      if (mctx) {
        const maskData = mctx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < data.length; i += 4) {
          if (maskData[i + 3] > 0) {
            if (maskData[i] > 200) {
              // Red = Erased -> Transparent
              data[i + 3] = 0;
            } else if (maskData[i + 2] > 200) {
              // Blue = Restored -> Full opacity
              data[i + 3] = 255;
            }
          }
        }
      }
    }

    fgCtx.putImageData(fgImgData, 0, 0);

    // 3. Clear base canvas
    ctx.clearRect(0, 0, w, h);

    // 4. Render Background Layer
    if (bgMode === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === 'blue') {
      ctx.fillStyle = '#0077cc';
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === 'grey') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === 'custom') {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === 'blur') {
      ctx.save();
      ctx.filter = 'blur(14px)';
      ctx.drawImage(img, -20, -20, w + 40, h + 40);
      ctx.restore();
    }

    // 5. Draw transparent cutout foreground
    ctx.drawImage(fgCanvas, 0, 0);

    // 6. Generate output Blob
    canvas.toBlob((blob) => {
      setResultBlob(blob);
    }, 'image/png');
  }, [currentImage, bgMode, customBgColor]);

  /* -------------------------------------------------------------
     FAST MODE: BFS FLOOD-FILL PERIMETER CLEAN
  ------------------------------------------------------------- */
  const autoCleanBorderBackground = useCallback((
    img: HTMLImageElement,
    mask: HTMLCanvasElement,
    tol: number
  ) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;

    const ctx = tempCanvas.getContext('2d');
    const mctx = mask.getContext('2d');
    if (!ctx || !mctx) return;

    ctx.drawImage(img, 0, 0, w, h);
    const srcData = ctx.getImageData(0, 0, w, h).data;
    const maskData = mctx.getImageData(0, 0, w, h);

    const seedPoints = [
      [2, 2],
      [w - 3, 2],
      [2, h - 3],
      [w - 3, h - 3],
      [Math.floor(w / 2), 2],
      [Math.floor(w / 2), h - 3],
      [2, Math.floor(h / 2)],
      [w - 3, Math.floor(h / 2)],
    ];

    const visited = new Uint8Array(w * h);
    const maxDist = (tol / 100) * 441.67;

    for (const [sx, sy] of seedPoints) {
      const startIdx = (sy * w + sx) * 4;
      const targetR = srcData[startIdx];
      const targetG = srcData[startIdx + 1];
      const targetB = srcData[startIdx + 2];

      const queueX: number[] = [sx];
      const queueY: number[] = [sy];
      visited[sy * w + sx] = 1;

      let head = 0;
      while (head < queueX.length && head < 400000) {
        const x = queueX[head];
        const y = queueY[head];
        head++;

        const idx = (y * w + x) * 4;
        maskData.data[idx] = 255; // Red = Erased
        maskData.data[idx + 1] = 0;
        maskData.data[idx + 2] = 0;
        maskData.data[idx + 3] = 255;

        const nbrs = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ];

        for (let i = 0; i < 4; i++) {
          const nx = nbrs[i][0];
          const ny = nbrs[i][1];
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nPos = ny * w + nx;
            if (!visited[nPos]) {
              visited[nPos] = 1;
              const nIdx = nPos * 4;
              const dr = srcData[nIdx] - targetR;
              const dg = srcData[nIdx + 1] - targetG;
              const db = srcData[nIdx + 2] - targetB;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist <= maxDist) {
                queueX.push(nx);
                queueY.push(ny);
              }
            }
          }
        }
      }
    }

    mctx.putImageData(maskData, 0, 0);
    renderCompositedResult();
  }, [renderCompositedResult]);

  /* -------------------------------------------------------------
     AI SMART MODE: ONNX RUNTIME WEBGPU INFERENCE PIPELINE
  ------------------------------------------------------------- */
  const runAiInference = useCallback(async () => {
    if (!currentImage || !maskCanvasRef.current) return;
    setIsAiProcessing(true);
    setAiProgress(15);
    setAiStatus('Loading ONNX Engine from CDN...');

    try {
      const ort = await loadOrtFromCDN();
      setAiProgress(35);

      if (!aiSessionRef.current) {
        setAiStatus('Loading RMBG-1.4 Neural Model...');
        const modelBuffer = await getCachedModelBuffer(AI_MODEL_URL);
        setAiProgress(60);

        setAiStatus(hasWebGPU ? 'Compiling WebGPU Shaders...' : 'Initializing WASM Threads...');
        const ep = hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];

        aiSessionRef.current = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ep,
          graphOptimizationLevel: 'all',
        });
      }

      setAiProgress(75);
      setAiStatus(hasWebGPU ? 'Running Inference via WebGPU...' : 'Running Inference via CPU WASM...');

      // 1. Prepare CHW Float32 Normalized Tensor
      const img = currentImage.imageElement;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = AI_INPUT_SIZE;
      tempCanvas.height = AI_INPUT_SIZE;
      const tctx = tempCanvas.getContext('2d');
      if (!tctx) throw new Error('Failed to create intermediate AI canvas context');

      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(img, 0, 0, AI_INPUT_SIZE, AI_INPUT_SIZE);

      const imgData = tctx.getImageData(0, 0, AI_INPUT_SIZE, AI_INPUT_SIZE);
      const { data } = imgData;

      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];
      const planeSize = AI_INPUT_SIZE * AI_INPUT_SIZE;
      const float32Data = new Float32Array(3 * planeSize);

      for (let i = 0; i < planeSize; i++) {
        const r = data[i * 4] / 255.0;
        const g = data[i * 4 + 1] / 255.0;
        const b = data[i * 4 + 2] / 255.0;

        float32Data[i] = (r - mean[0]) / std[0];
        float32Data[planeSize + i] = (g - mean[1]) / std[1];
        float32Data[planeSize * 2 + i] = (b - mean[2]) / std[2];
      }

      const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, AI_INPUT_SIZE, AI_INPUT_SIZE]);
      const startTime = performance.now();

      const inputName = aiSessionRef.current.inputNames[0];
      const outputName = aiSessionRef.current.outputNames[0];
      const feeds = { [inputName]: inputTensor };

      const results = await aiSessionRef.current.run(feeds);
      const elapsed = Math.round(performance.now() - startTime);
      setAiInferenceTimeMs(elapsed);

      setAiProgress(90);
      setAiStatus('Compositing Neural Alpha Mask...');

      const outputTensor = results[outputName];
      const maskFloat = outputTensor.data as Float32Array;

      // 2. Upsample Mask to Full Resolution onto maskCanvasRef
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const maskCanvas = maskCanvasRef.current;
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext('2d');
      if (!mctx) return;

      // Create low-res mask image data
      const lowResMaskCanvas = document.createElement('canvas');
      lowResMaskCanvas.width = AI_INPUT_SIZE;
      lowResMaskCanvas.height = AI_INPUT_SIZE;
      const lctx = lowResMaskCanvas.getContext('2d');
      if (!lctx) return;

      const lowResImgData = lctx.createImageData(AI_INPUT_SIZE, AI_INPUT_SIZE);
      const lData = lowResImgData.data;

      for (let i = 0; i < maskFloat.length; i++) {
        const alpha = Math.min(255, Math.max(0, Math.round(maskFloat[i] * 255)));
        const idx = i * 4;
        // In our mask schema: Red = Erased (background), so background is where alpha < 128
        if (alpha < 128) {
          lData[idx] = 255; // Red = Erased
          lData[idx + 1] = 0;
          lData[idx + 2] = 0;
          lData[idx + 3] = 255;
        } else {
          lData[idx] = 0;
          lData[idx + 1] = 0;
          lData[idx + 2] = 0;
          lData[idx + 3] = 0; // Transparent mask = keep foreground
        }
      }
      lctx.putImageData(lowResImgData, 0, 0);

      // Upsample to full resolution using canvas bilinear scaling
      mctx.clearRect(0, 0, w, h);
      mctx.imageSmoothingEnabled = true;
      mctx.imageSmoothingQuality = 'high';
      mctx.drawImage(lowResMaskCanvas, 0, 0, w, h);

      setAiProgress(100);
      setAiStatus('Complete');
      renderCompositedResult();
      onNotify('AI Cutout Complete', `Processed via ${hasWebGPU ? 'WebGPU' : 'WASM'} in ${elapsed}ms.`, 'success');
    } catch (err: any) {
      console.error('AI Smart Mode Inference failed:', err);
      setAiStatus('Neural processing failed. Switched to Fast Mode.');
      setEngineMode('fast');
      onNotify('AI Notice', 'Model execution could not finish on this device. Switched to Fast Form Mode.', 'info');
      if (currentImage && maskCanvasRef.current) {
        autoCleanBorderBackground(currentImage.imageElement, maskCanvasRef.current, tolerance);
      }
    } finally {
      setIsAiProcessing(false);
    }
  }, [currentImage, loadOrtFromCDN, getCachedModelBuffer, hasWebGPU, renderCompositedResult, autoCleanBorderBackground, tolerance, onNotify]);

  /* -------------------------------------------------------------
     INITIALIZE ON IMAGE LOAD OR ENGINE SWITCH
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!currentImage) {
      maskCanvasRef.current = null;
      setResultBlob(null);
      setRemovedObjectCount(0);
      return;
    }

    const img = currentImage.imageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mctx = mask.getContext('2d');
    if (mctx) mctx.clearRect(0, 0, w, h);
    maskCanvasRef.current = mask;

    if (engineMode === 'fast') {
      autoCleanBorderBackground(img, mask, tolerance);
    } else {
      runAiInference();
    }
  }, [currentImage, engineMode]);

  /* -------------------------------------------------------------
     MANUAL TOOLS (MAGIC WAND & ERASER BRUSH)
  ------------------------------------------------------------- */
  const runMagicWandAt = (clickX: number, clickY: number) => {
    if (!currentImage || !maskCanvasRef.current) return;
    const img = currentImage.imageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d');
    const mctx = maskCanvasRef.current.getContext('2d');
    if (!ctx || !mctx) return;

    ctx.drawImage(img, 0, 0, w, h);
    const srcData = ctx.getImageData(0, 0, w, h).data;
    const maskImgData = mctx.getImageData(0, 0, w, h);
    const maskData = maskImgData.data;

    const startIdx = (clickY * w + clickX) * 4;
    const targetR = srcData[startIdx];
    const targetG = srcData[startIdx + 1];
    const targetB = srcData[startIdx + 2];
    const maxDist = (tolerance / 100) * 441.67;

    const visited = new Uint8Array(w * h);
    const queueX: number[] = [clickX];
    const queueY: number[] = [clickY];
    visited[clickY * w + clickX] = 1;

    let head = 0;
    while (head < queueX.length && head < 500000) {
      const x = queueX[head];
      const y = queueY[head];
      head++;

      const idx = (y * w + x) * 4;
      maskData[idx] = 255; // Red channel = Erase
      maskData[idx + 1] = 0;
      maskData[idx + 2] = 0;
      maskData[idx + 3] = 255;

      const nbrs = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (let i = 0; i < 4; i++) {
        const nx = nbrs[i][0];
        const ny = nbrs[i][1];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nPos = ny * w + nx;
          if (!visited[nPos]) {
            visited[nPos] = 1;
            const nIdx = nPos * 4;
            const dr = srcData[nIdx] - targetR;
            const dg = srcData[nIdx + 1] - targetG;
            const db = srcData[nIdx + 2] - targetB;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);

            if (dist <= maxDist) {
              queueX.push(nx);
              queueY.push(ny);
            }
          }
        }
      }
    }

    mctx.putImageData(maskImgData, 0, 0);
    setRemovedObjectCount((prev) => prev + 1);
    onNotify('Object Erased', 'Selected background region removed.', 'info');
    renderCompositedResult();
  };

  const paintManualBrush = (x: number, y: number) => {
    if (!maskCanvasRef.current) return;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (!mctx) return;

    mctx.save();
    mctx.beginPath();
    mctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);

    if (activeToolMode === 'erase') {
      mctx.fillStyle = 'rgba(255, 0, 0, 1)'; // Red = Erase
    } else if (activeToolMode === 'restore') {
      mctx.fillStyle = 'rgba(0, 0, 255, 1)'; // Blue = Restore
    }
    mctx.fill();
    mctx.restore();
    renderCompositedResult();
  };

  // Re-composite when background mode changes without touching the mask
  useEffect(() => {
    renderCompositedResult();
  }, [bgMode, customBgColor, renderCompositedResult]);

  // Canvas Mouse Interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (activeToolMode === 'wand') {
      runMagicWandAt(x, y);
    } else {
      isDrawingRef.current = true;
      paintManualBrush(x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activeToolMode === 'wand') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    paintManualBrush(x, y);
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      renderCompositedResult();
    }
  };

  const handleResetMask = () => {
    if (!maskCanvasRef.current) return;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (mctx) {
      mctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setRemovedObjectCount(0);
    renderCompositedResult();
    onNotify('Reset', 'All erased areas restored to original image.', 'info');
  };

  // Export handlers
  const handleDownload = useCallback(() => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}-cutout.png`;
    triggerFileDownload(resultBlob, outName);
    onNotify('Download Started', `Saved "${outName}" with transparent background.`, 'success');
  }, [resultBlob, currentImage, onNotify]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Cutout image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [resultBlob, onNotify]);

  const handleShare = useCallback(async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}-cutout.png`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename: outName,
      title: 'Background Cutout',
      text: 'Background removed with FileWala.',
    });
    if (shared) {
      onNotify('Shared', 'Cutout shared successfully.', 'success');
    }
  }, [resultBlob, currentImage, onNotify]);

  // Global Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (currentImage) {
          e.preventDefault();
          resetImage();
          onNotify('Reset', 'Cleared image.', 'info');
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (resultBlob) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (engineMode === 'ai' && !isAiProcessing) {
          e.preventDefault();
          runAiInference();
          return;
        } else if (resultBlob) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentImage, resultBlob, engineMode, isAiProcessing, handleDownload, resetImage, runAiInference, onNotify]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header Section */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Client-Side Engine · Zero Uploads</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Instant Background Remover
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Remove backgrounds with 0ms flood-fill or WebGPU neural AI directly in browser RAM.
        </p>
      </div>

      {/* Dual-Model Engine Mode Toggle Switch */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setEngineMode('fast')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              engineMode === 'fast'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Fast Form Mode</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-750 text-zinc-700 dark:text-zinc-300">
              0ms
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEngineMode('ai')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              engineMode === 'ai'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>AI Smart Mode</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              WebGPU
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 px-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>Hardware: {hasWebGPU ? 'WebGPU Accelerated ⚡' : 'WASM CPU Fallback'}</span>
        </div>
      </div>

      {/* Upload Zone (Unboxed 2D Flat Dropzone) */}
      {!currentImage ? (
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={(files) => {
              if (files.length > 0) loadFile(files[0]);
            }}
            accept="image/*"
            title="Drop image here for instant background removal"
            description="100% Client-Side Engine · Instant 0ms BFS or WebGPU Neural AI · Supports PNG, JPG, WebP"
          />
        </div>
      ) : (
        /* Active Workspace */
        <div className="space-y-6">
          {/* Active Workspace Top Header Bar */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 border rounded-xl ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                }`}
              >
                <img
                  src={currentImage.previewUrl}
                  alt="Source"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xs sm:text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {currentImage.name}
                </h3>
                <div className={`flex items-center gap-2 text-[11px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <span>{currentImage.width} × {currentImage.height} px</span>
                  {engineMode === 'ai' && aiInferenceTimeMs !== null && (
                    <>
                      <span>·</span>
                      <span className="text-blue-500 dark:text-blue-400">Neural: {aiInferenceTimeMs}ms</span>
                    </>
                  )}
                  {engineMode === 'fast' && removedObjectCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500">{removedObjectCount} erased</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetImage}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Photo</span>
              </button>

              <button
                disabled={!resultBlob}
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>

              {isShareSupported() && (
                <button
                  disabled={!resultBlob}
                  onClick={handleShare}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              )}

              <button
                disabled={!resultBlob}
                onClick={handleDownload}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Canvas View (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              {/* Canvas Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-900 dark:text-white">Canvas:</span>
                  <span className="font-mono text-zinc-500 text-[11px]">
                    {currentImage.width}×{currentImage.height}px
                  </span>
                  {engineMode === 'ai' && aiInferenceTimeMs !== null && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                        Neural Run: {aiInferenceTimeMs}ms
                      </span>
                    </>
                  )}
                  {engineMode === 'fast' && removedObjectCount > 0 && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        {removedObjectCount} object{removedObjectCount > 1 ? 's' : ''} erased
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {engineMode === 'ai' ? (
                    <button
                      type="button"
                      disabled={isAiProcessing}
                      onClick={runAiInference}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors disabled:opacity-50"
                      title="Re-run AI Neural Segmentation"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAiProcessing ? 'animate-spin' : ''}`} />
                      <span>Re-run AI</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentImage || !maskCanvasRef.current) return;
                        const mctx = maskCanvasRef.current.getContext('2d');
                        if (mctx) mctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
                        setRemovedObjectCount(0);
                        autoCleanBorderBackground(currentImage.imageElement, maskCanvasRef.current, tolerance);
                        onNotify('Auto Clean Re-run', 'Perimeter background cleaned with updated tolerance.', 'success');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                      title="Re-run border flood fill with current tolerance"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Auto Re-Clean</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowOriginal((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                      showOriginal
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showOriginal ? 'Showing Original' : 'Hold / View Original'}</span>
                  </button>
                </div>
              </div>

              {/* AI Processing Bar */}
              {engineMode === 'ai' && isAiProcessing && (
                <div className="space-y-1.5 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{aiStatus}</span>
                    </div>
                    <span>{aiProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-200"
                      style={{ width: `${aiProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Viewport with Checkerboard Background */}
              <div
                className="relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center min-h-[350px] max-h-[580px] p-2"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#ffffff',
                }}
              >
                {showOriginal ? (
                  <img
                    src={currentImage.previewUrl}
                    alt="Original"
                    className="max-h-[550px] max-w-full object-contain rounded"
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className={`max-h-[550px] max-w-full object-contain ${
                      activeToolMode === 'wand'
                        ? 'cursor-crosshair'
                        : activeToolMode === 'erase'
                        ? 'cursor-cell'
                        : 'cursor-pointer'
                    }`}
                    title={
                      activeToolMode === 'wand'
                        ? 'Magic Wand: Click any background object to erase it completely'
                        : `Drawing with ${activeToolMode} brush`
                    }
                  />
                )}
              </div>

              {/* Canvas Action Hint Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-zinc-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {activeToolMode === 'wand'
                      ? 'Magic Wand Active: Click any background spot to erase it'
                      : activeToolMode === 'erase'
                      ? 'Erase Brush Active: Click & drag to erase stray spots'
                      : 'Restore Brush Active: Click & drag to restore subjects'}
                  </span>
                </div>
                <span>
                  {engineMode === 'ai'
                    ? `AI RMBG-1.4 Neural Engine (${hasWebGPU ? 'WebGPU' : 'WASM'})`
                    : 'Fast BFS Flood-Fill (0ms Latency)'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Controls & Settings (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Interactive Eraser / Touch-up Tools */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
                  Manual Refinement Tools
                </span>
                <button
                  type="button"
                  onClick={handleResetMask}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveToolMode('wand')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-colors cursor-pointer ${
                    activeToolMode === 'wand'
                      ? 'bg-amber-500/10 text-amber-600 font-semibold dark:text-amber-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                  title="Click on any background object to erase it"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Magic Wand</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveToolMode('erase')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-colors cursor-pointer ${
                    activeToolMode === 'erase'
                      ? 'bg-rose-500/10 text-rose-600 font-semibold dark:text-rose-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                  title="Swipe freehand to erase objects"
                >
                  <Eraser className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px]">Erase Brush</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveToolMode('restore')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-colors cursor-pointer ${
                    activeToolMode === 'restore'
                      ? 'bg-blue-500/10 text-blue-600 font-semibold dark:text-blue-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                  title="Swipe freehand to restore masked details"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[11px]">Restore</span>
                </button>
              </div>

              {activeToolMode !== 'wand' && (
                <div className="space-y-1.5 pt-1">
                  <Slider
                    label="Brush Size"
                    min={5}
                    max={80}
                    step={1}
                    value={brushSize}
                    onChange={setBrushSize}
                    unit="px"
                  />
                </div>
              )}
            </div>

            {/* Tolerance & Sensitivity Controls (Fast Mode & Wand) */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
                  {engineMode === 'fast' ? 'Flood-Fill Tolerance' : 'Magic Wand Tolerance'}
                </span>
                <span className="text-[11px] font-mono text-zinc-500">{tolerance}%</span>
              </div>

              <div className="space-y-1.5">
                <Slider
                  label="Color Distance Threshold"
                  min={5}
                  max={75}
                  step={1}
                  value={tolerance}
                  onChange={setTolerance}
                  unit="%"
                />
                <p className="text-[10px] text-zinc-400">
                  Higher tolerance removes larger color variations and soft edge shadows.
                </p>
              </div>
            </div>

            {/* Background Output Mode */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono block pb-2 border-b border-zinc-100 dark:border-zinc-800">
                Replace Background
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBgMode('transparent')}
                  className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'transparent'
                      ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                >
                  Transparent PNG
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('white')}
                  className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'white'
                      ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                >
                  Solid White
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('blue')}
                  className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'blue'
                      ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                >
                  Passport Blue
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('blur')}
                  className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'blur'
                      ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                >
                  Blur Bokeh BG
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('grey')}
                  className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'grey'
                      ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  }`}
                >
                  Studio Grey
                </button>

                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => {
                      setCustomBgColor(e.target.value);
                      setBgMode('custom');
                    }}
                    className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-600 cursor-pointer p-0"
                    title="Pick custom color"
                  />
                  <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">Custom</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 space-y-2">
              <Button
                variant="primary"
                onClick={handleDownload}
                disabled={!resultBlob}
                className="w-full justify-center py-2.5 text-xs font-semibold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Download Background-Free PNG</span>
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!resultBlob}
                  className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Image</span>
                </button>
                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!resultBlob}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Standardized Schema-Matched Guide & Knowledge Base */}
      <ImageToolGuideSection toolId="bg-remover" />
    </div>
  );
};
