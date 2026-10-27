import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  RefreshCw,
  Sparkles,
  Eraser,
  Paintbrush,
  Eye,
  ShieldCheck,
  Copy,
  Share2,
  Wand2,
  RotateCcw,
  Zap,
  Cpu,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Undo2,
  Redo2,
  Upload,
  Image as ImageIcon,
  Columns2,
  Check,
  SlidersHorizontal,
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
import { CanvasEngine } from '../../../core/engine/CanvasEngine';

interface BackgroundRemoverToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFiles?: File[] | null;
}

export type RemovalEngine = 'ai' | 'fast';
export type ToolMode = 'wand' | 'erase' | 'restore' | 'hand';
export type BgReplacement =
  | 'transparent'
  | 'white'
  | 'passport-blue'
  | 'visa-grey'
  | 'portrait-beige'
  | 'custom-color'
  | 'gradient-vignette'
  | 'gradient-soft'
  | 'gradient-warm'
  | 'gradient-cool'
  | 'custom-image'
  | 'blur';

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

  // Engine Mode
  const [engineMode, setEngineMode] = useState<RemovalEngine>('ai');
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Active Tool Mode
  const [activeToolMode, setActiveToolMode] = useState<ToolMode>('erase');
  const [prevToolBeforeHand, setPrevToolBeforeHand] = useState<ToolMode>('erase');

  // Brush & Wand Settings
  const [brushSize, setBrushSize] = useState<number>(36); // 5 to 120px
  const [brushHardness, setBrushHardness] = useState<number>(75); // 0 to 100%
  const [tolerance, setTolerance] = useState<number>(28); // 5 to 75%

  // Edge Refinement Controls
  const [feather, setFeather] = useState<number>(0); // 0 to 10px
  const [shiftEdge, setShiftEdge] = useState<number>(0); // -5 to +5px

  // Background Replacement Settings
  const [bgMode, setBgMode] = useState<BgReplacement>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [customBackdropImg, setCustomBackdropImg] = useState<HTMLImageElement | null>(null);

  // Realistic Drop Shadow
  const [dropShadow, setDropShadow] = useState<boolean>(false);
  const [shadowBlur, setShadowBlur] = useState<number>(14);
  const [shadowOpacity, setShadowOpacity] = useState<number>(35);
  const [shadowOffsetY, setShadowOffsetY] = useState<number>(8);

  // Comparison & View Modes
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50); // 0 to 100%
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Viewport Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating Cursor Ring
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Undo / Redo History State
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Result & AI State
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [aiStatus, setAiStatus] = useState<string>('Ready');
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiInferenceTimeMs, setAiInferenceTimeMs] = useState<number | null>(null);

  // Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastDrawPosRef = useRef<{ x: number; y: number } | null>(null);
  const aiSessionRef = useRef<any>(null);
  const isSpacePressedRef = useRef<boolean>(false);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const splitDragRef = useRef<boolean>(false);

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
     HISTORY STACK MANAGER (20-Step Undo / Redo)
  ------------------------------------------------------------- */
  const pushHistorySnapshot = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (!mctx) return;
    const w = maskCanvasRef.current.width;
    const h = maskCanvasRef.current.height;
    const snapshot = mctx.getImageData(0, 0, w, h);

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  /* -------------------------------------------------------------
     COMPOSITING RENDER PIPELINE (Hardware 8-bit Alpha Destination-In)
  ------------------------------------------------------------- */
  const renderCompositedResult = useCallback(() => {
    if (!currentImage || !canvasRef.current || !maskCanvasRef.current) return;
    const img = currentImage.imageElement;
    const canvas = canvasRef.current;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Prepare Refined Mask (Feather and Shift Edge if active)
    let activeMask: HTMLCanvasElement = maskCanvasRef.current;
    if (feather > 0 || shiftEdge !== 0) {
      const refinedCanvas = document.createElement('canvas');
      refinedCanvas.width = w;
      refinedCanvas.height = h;
      const rctx = refinedCanvas.getContext('2d');
      if (rctx) {
        if (feather > 0) {
          rctx.filter = `blur(${feather}px)`;
        }
        rctx.drawImage(maskCanvasRef.current, 0, 0);
        rctx.filter = 'none';

        if (shiftEdge !== 0) {
          const imgData = rctx.getImageData(0, 0, w, h);
          const { data } = imgData;
          const shiftDelta = shiftEdge * 22;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) {
              data[i] = Math.min(255, Math.max(0, data[i] + shiftDelta));
            }
          }
          rctx.putImageData(imgData, 0, 0);
        }
        activeMask = refinedCanvas;
      }
    }

    // 2. Foreground Cutout via Hardware Destination-In Blending
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    if (!fgCtx) return;

    fgCtx.drawImage(img, 0, 0, w, h);
    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(activeMask, 0, 0, w, h);
    fgCtx.globalCompositeOperation = 'source-over';

    // 3. Clear Base Canvas
    ctx.clearRect(0, 0, w, h);

    // 4. Split Comparison View Rendering
    if (isSplitView) {
      const splitX = Math.round((splitPos / 100) * w);

      // Left: Original image
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, h);
      ctx.clip();
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();

      // Right: Cutout with background
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, w - splitX, h);
      ctx.clip();

      drawBackgroundToContext(ctx, w, h, img, bgMode, customBgColor, customBackdropImg);

      if (dropShadow && bgMode !== 'transparent') {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity / 100})`;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
        ctx.drawImage(fgCanvas, 0, 0);
        ctx.restore();
      }
      ctx.drawImage(fgCanvas, 0, 0);
      ctx.restore();

      // Divider line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.lineWidth = Math.max(2, Math.round(w / 400));
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();
    } else {
      // Standard composited render
      drawBackgroundToContext(ctx, w, h, img, bgMode, customBgColor, customBackdropImg);

      if (dropShadow && bgMode !== 'transparent') {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity / 100})`;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
        ctx.drawImage(fgCanvas, 0, 0);
        ctx.restore();
      }

      ctx.drawImage(fgCanvas, 0, 0);
    }

    // 5. Generate high-res Blob
    canvas.toBlob((blob) => {
      setResultBlob(blob);
    }, 'image/png');
  }, [
    currentImage,
    bgMode,
    customBgColor,
    customBackdropImg,
    feather,
    shiftEdge,
    dropShadow,
    shadowBlur,
    shadowOpacity,
    shadowOffsetY,
    isSplitView,
    splitPos,
  ]);

  // Helper: Draw Background onto 2D Context
  function drawBackgroundToContext(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement,
    mode: BgReplacement,
    color: string,
    backdrop: HTMLImageElement | null
  ) {
    if (mode === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'passport-blue') {
      ctx.fillStyle = '#0077cc';
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'visa-grey') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'portrait-beige') {
      ctx.fillStyle = '#f5ebe0';
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'custom-color') {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'gradient-vignette') {
      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'gradient-soft') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'gradient-warm') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(1, '#fed7aa');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'gradient-cool') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#e0f2fe');
      grad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'custom-image' && backdrop) {
      const bRatio = backdrop.naturalWidth / backdrop.naturalHeight;
      const cRatio = w / h;
      let bw = w, bh = h, bx = 0, by = 0;
      if (bRatio > cRatio) {
        bh = h;
        bw = h * bRatio;
        bx = (w - bw) / 2;
      } else {
        bw = w;
        bh = w / bRatio;
        by = (h - bh) / 2;
      }
      ctx.drawImage(backdrop, bx, by, bw, bh);
    } else if (mode === 'blur') {
      ctx.save();
      ctx.filter = 'blur(16px)';
      ctx.drawImage(img, -20, -20, w + 40, h + 40);
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------
     FAST MODE: BFS FLOOD-FILL PERIMETER CLEAN
  ------------------------------------------------------------- */
  const runFastPerimeterClean = useCallback((
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

    // Initialize mask to fully opaque white (255)
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(0, 0, w, h);
    const maskImgData = mctx.getImageData(0, 0, w, h);
    const maskData = maskImgData.data;

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

        // Set erased background to transparent alpha (0)
        const idx = (y * w + x) * 4;
        maskData[idx + 3] = 0;

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
              const dist = Math.hypot(dr, dg, db);

              if (dist <= maxDist) {
                queueX.push(nx);
                queueY.push(ny);
              }
            }
          }
        }
      }
    }

    mctx.putImageData(maskImgData, 0, 0);
    pushHistorySnapshot();
    renderCompositedResult();
  }, [renderCompositedResult, pushHistorySnapshot]);

  /* -------------------------------------------------------------
     AI SMART MODE: ONNX RMBG-1.4 8-BIT CONTINUOUS ALPHA INFERENCE
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
      setAiStatus('Compositing 8-Bit Soft Neural Alpha...');

      const outputTensor = results[outputName];
      const maskFloat = outputTensor.data as Float32Array;

      // 2. Continuous 8-bit Alpha Upsampling (Preserving Hair & Translucent Edges)
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const maskCanvas = maskCanvasRef.current;
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext('2d');
      if (!mctx) return;

      const lowResMaskCanvas = document.createElement('canvas');
      lowResMaskCanvas.width = AI_INPUT_SIZE;
      lowResMaskCanvas.height = AI_INPUT_SIZE;
      const lctx = lowResMaskCanvas.getContext('2d');
      if (!lctx) return;

      const lowResImgData = lctx.createImageData(AI_INPUT_SIZE, AI_INPUT_SIZE);
      const lData = lowResImgData.data;

      // Map continuous Float32 [0.0, 1.0] to 8-bit Alpha [0, 255]
      for (let i = 0; i < maskFloat.length; i++) {
        const alpha = Math.min(255, Math.max(0, Math.round(maskFloat[i] * 255)));
        const idx = i * 4;
        lData[idx] = 255;
        lData[idx + 1] = 255;
        lData[idx + 2] = 255;
        lData[idx + 3] = alpha; // Full 8-bit anti-aliased hair transparency!
      }
      lctx.putImageData(lowResImgData, 0, 0);

      // Upsample to full resolution via hardware bilinear interpolation
      mctx.clearRect(0, 0, w, h);
      mctx.imageSmoothingEnabled = true;
      mctx.imageSmoothingQuality = 'high';
      mctx.drawImage(lowResMaskCanvas, 0, 0, w, h);

      pushHistorySnapshot();
      setAiProgress(100);
      setAiStatus('Complete');
      renderCompositedResult();
      onNotify('AI Cutout Complete', `Processed via ${hasWebGPU ? 'WebGPU' : 'WASM'} in ${elapsed}ms.`, 'success');
    } catch (err: any) {
      console.error('AI Smart Mode Inference failed:', err);
      setAiStatus('Neural processing failed. Switched to Fast Mode.');
      setEngineMode('fast');
      onNotify('AI Notice', 'Model execution fell back to Fast Form Mode.', 'info');
      if (currentImage && maskCanvasRef.current) {
        runFastPerimeterClean(currentImage.imageElement, maskCanvasRef.current, tolerance);
      }
    } finally {
      setIsAiProcessing(false);
    }
  }, [
    currentImage,
    loadOrtFromCDN,
    getCachedModelBuffer,
    hasWebGPU,
    pushHistorySnapshot,
    renderCompositedResult,
    runFastPerimeterClean,
    tolerance,
    onNotify,
  ]);

  /* -------------------------------------------------------------
     INITIALIZE ON IMAGE LOAD OR ENGINE SWITCH
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!currentImage) {
      maskCanvasRef.current = null;
      setResultBlob(null);
      historyRef.current = [];
      historyIndexRef.current = -1;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const img = currentImage.imageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mctx = mask.getContext('2d');
    if (mctx) {
      mctx.fillStyle = '#ffffff';
      mctx.fillRect(0, 0, w, h);
    }
    maskCanvasRef.current = mask;

    // Reset Zoom & Pan to Fit Viewport
    if (viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect();
      const scaleX = (vRect.width - 32) / w;
      const scaleY = (vRect.height - 32) / h;
      const fitZoom = Math.min(1.0, Math.max(0.2, Math.min(scaleX, scaleY)));
      setZoom(+fitZoom.toFixed(2));
      setPan({
        x: Math.round((vRect.width - w * fitZoom) / 2),
        y: Math.round((vRect.height - h * fitZoom) / 2),
      });
    }

    if (engineMode === 'fast') {
      runFastPerimeterClean(img, mask, tolerance);
    } else {
      runAiInference();
    }
  }, [currentImage, engineMode]);

  /* -------------------------------------------------------------
     INTERACTIVE BRUSH ENGINE: CONTINUOUS PATH INTERPOLATION
  ------------------------------------------------------------- */
  const stampBrushAt = (
    x: number,
    y: number,
    size: number,
    hardness: number,
    isErase: boolean
  ) => {
    if (!maskCanvasRef.current) return;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (!mctx) return;

    const r = size / 2;
    mctx.save();
    mctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';

    const hFactor = hardness / 100;
    if (hFactor >= 0.95) {
      mctx.beginPath();
      mctx.arc(x, y, r, 0, Math.PI * 2);
      mctx.fillStyle = '#ffffff';
      mctx.fill();
    } else {
      const innerRadius = Math.max(0, r * hFactor);
      const grad = mctx.createRadialGradient(x, y, innerRadius, x, y, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      mctx.beginPath();
      mctx.arc(x, y, r, 0, Math.PI * 2);
      mctx.fillStyle = grad;
      mctx.fill();
    }
    mctx.restore();
  };

  const paintInterpolatedStroke = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    size: number,
    hardness: number,
    isErase: boolean
  ) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1, size * 0.2); // Smooth stamping every 20% of brush diameter
    const numSteps = Math.ceil(dist / step);

    for (let s = 1; s <= numSteps; s++) {
      const t = s / numSteps;
      const x = startX + dx * t;
      const y = startY + dy * t;
      stampBrushAt(x, y, size, hardness, isErase);
    }
  };

  /* -------------------------------------------------------------
     MAGIC WAND: COLOR-SIMILARITY FLOOD FILL
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
      maskData[idx + 3] = 0; // Cut alpha

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
            const dist = Math.hypot(dr, dg, db);

            if (dist <= maxDist) {
              queueX.push(nx);
              queueY.push(ny);
            }
          }
        }
      }
    }

    mctx.putImageData(maskImgData, 0, 0);
    pushHistorySnapshot();
    renderCompositedResult();
    onNotify('Region Erased', 'Magic Wand removed matching background color.', 'info');
  };

  /* -------------------------------------------------------------
     CANVAS & VIEWPORT MOUSE INTERACTION HANDLERS
  ------------------------------------------------------------- */
  const getImageCoordinates = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)));
    return { x, y };
  };

  // Mouse wheel zoom centered at cursor
  const handleViewportWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(5.0, Math.max(0.25, +(zoom * zoomFactor).toFixed(2)));

    const ix = (cx - pan.x) / zoom;
    const iy = (cy - pan.y) / zoom;

    setPan({
      x: Math.round(cx - ix * newZoom),
      y: Math.round(cy - iy * newZoom),
    });
    setZoom(newZoom);
  };

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // 1. Hand / Pan tool or Spacebar drag
    if (activeToolMode === 'hand' || isSpacePressedRef.current || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    // 2. Split Slider divider drag
    if (isSplitView && viewportRef.current && canvasRef.current) {
      const cRect = canvasRef.current.getBoundingClientRect();
      const currentSplitX = cRect.left + (splitPos / 100) * cRect.width;
      if (Math.abs(e.clientX - currentSplitX) < 16) {
        splitDragRef.current = true;
        return;
      }
    }

    // 3. Canvas Painting / Magic Wand
    const coords = getImageCoordinates(e);
    if (!coords) return;

    if (activeToolMode === 'wand') {
      runMagicWandAt(coords.x, coords.y);
    } else if (activeToolMode === 'erase' || activeToolMode === 'restore') {
      isDrawingRef.current = true;
      lastDrawPosRef.current = coords;
      stampBrushAt(coords.x, coords.y, brushSize, brushHardness, activeToolMode === 'erase');
      renderCompositedResult();
    }
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    // Track cursor ring position in viewport coordinates
    if (viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - vRect.left,
        y: e.clientY - vRect.top,
        visible: true,
      });
    }

    // Pan execution
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // Split slider drag execution
    if (splitDragRef.current && canvasRef.current) {
      const cRect = canvasRef.current.getBoundingClientRect();
      const relX = Math.min(cRect.width, Math.max(0, e.clientX - cRect.left));
      const newPos = Math.round((relX / cRect.width) * 100);
      setSplitPos(newPos);
      return;
    }

    // Continuous brush stroke interpolation
    if (isDrawingRef.current && lastDrawPosRef.current) {
      const coords = getImageCoordinates(e);
      if (!coords) return;

      paintInterpolatedStroke(
        lastDrawPosRef.current.x,
        lastDrawPosRef.current.y,
        coords.x,
        coords.y,
        brushSize,
        brushHardness,
        activeToolMode === 'erase'
      );
      lastDrawPosRef.current = coords;
      renderCompositedResult();
    }
  };

  const handleViewportMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (splitDragRef.current) {
      splitDragRef.current = false;
    }
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPosRef.current = null;
      pushHistorySnapshot();
      renderCompositedResult();
    }
  };

  const handleViewportMouseLeave = () => {
    setCursorPos((prev) => ({ ...prev, visible: false }));
    if (isPanning) setIsPanning(false);
    if (splitDragRef.current) splitDragRef.current = false;
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPosRef.current = null;
      pushHistorySnapshot();
      renderCompositedResult();
    }
  };

  /* -------------------------------------------------------------
     ZOOM UTILITIES: FIT TO SCREEN & 100%
  ------------------------------------------------------------- */
  const handleZoomStep = (delta: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = Math.min(5.0, Math.max(0.25, +(zoom + delta).toFixed(2)));
    const ix = (cx - pan.x) / zoom;
    const iy = (cy - pan.y) / zoom;
    setPan({
      x: Math.round(cx - ix * newZoom),
      y: Math.round(cy - iy * newZoom),
    });
    setZoom(newZoom);
  };

  const handleFitToScreen = useCallback(() => {
    if (!viewportRef.current || !currentImage) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const w = currentImage.width;
    const h = currentImage.height;
    const padding = 36;
    const scaleX = (rect.width - padding) / w;
    const scaleY = (rect.height - padding) / h;
    const fitZoom = Math.min(1.0, Math.max(0.2, Math.min(scaleX, scaleY)));
    setZoom(+fitZoom.toFixed(2));
    setPan({
      x: Math.round((rect.width - w * fitZoom) / 2),
      y: Math.round((rect.height - h * fitZoom) / 2),
    });
  }, [currentImage]);

  const handle100Percent = () => {
    if (!viewportRef.current || !currentImage) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const w = currentImage.width;
    const h = currentImage.height;
    setZoom(1.0);
    setPan({
      x: Math.round((rect.width - w) / 2),
      y: Math.round((rect.height - h) / 2),
    });
  };

  /* -------------------------------------------------------------
     UNDO / REDO ACTIONS
  ------------------------------------------------------------- */
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !maskCanvasRef.current) return;
    historyIndexRef.current--;
    const prevSnapshot = historyRef.current[historyIndexRef.current];
    const mctx = maskCanvasRef.current.getContext('2d');
    if (mctx && prevSnapshot) {
      mctx.putImageData(prevSnapshot, 0, 0);
      renderCompositedResult();
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
      onNotify('Undo', 'Reverted last edit.', 'info');
    }
  }, [renderCompositedResult, onNotify]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !maskCanvasRef.current) return;
    historyIndexRef.current++;
    const nextSnapshot = historyRef.current[historyIndexRef.current];
    const mctx = maskCanvasRef.current.getContext('2d');
    if (mctx && nextSnapshot) {
      mctx.putImageData(nextSnapshot, 0, 0);
      renderCompositedResult();
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      onNotify('Redo', 'Restored edit.', 'info');
    }
  }, [renderCompositedResult, onNotify]);

  /* -------------------------------------------------------------
     CUSTOM BACKDROP IMAGE UPLOAD
  ------------------------------------------------------------- */
  const handleCustomBackdropSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = await CanvasEngine.loadImage(file);
      setCustomBackdropImg(img);
      setBgMode('custom-image');
      onNotify('Backdrop Loaded', `Applied "${file.name}" as backdrop.`, 'success');
    } catch {
      onNotify('Backdrop Error', 'Could not load custom backdrop image.', 'error');
    }
  };

  /* -------------------------------------------------------------
     KEYBOARD NAVIGATION & SHORTCUTS
  ------------------------------------------------------------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Spacebar temporary hand pan mode
      if (e.code === 'Space' && !isSpacePressedRef.current) {
        isSpacePressedRef.current = true;
        setPrevToolBeforeHand(activeToolMode);
        setActiveToolMode('hand');
        return;
      }

      // Tool switches
      if (e.key === 'e' || e.key === 'E') {
        setActiveToolMode('erase');
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        setActiveToolMode('restore');
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        setActiveToolMode('wand');
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setActiveToolMode('hand');
        return;
      }

      // Brush size adjustments: [ to decrease, ] to increase
      if (e.key === '[') {
        setBrushSize((s) => Math.max(5, s - 6));
        return;
      }
      if (e.key === ']') {
        setBrushSize((s) => Math.min(120, s + 6));
        return;
      }

      // Zoom reset: 0 = Fit, 1 = 100%
      if (e.key === '0') {
        handleFitToScreen();
        return;
      }
      if (e.key === '1') {
        handle100Percent();
        return;
      }

      // Download shortcut: D
      if (e.key === 'd' || e.key === 'D') {
        if (resultBlob) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setActiveToolMode(prevToolBeforeHand);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleUndo, handleRedo, activeToolMode, prevToolBeforeHand, handleFitToScreen, resultBlob]);

  // Download & Share Handlers
  const handleDownload = useCallback(() => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}-filewala-cutout.png`;
    triggerFileDownload(resultBlob, outName);
    onNotify('Download Started', `Saved "${outName}".`, 'success');
  }, [resultBlob, currentImage, onNotify]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Cutout image copied (Ctrl+V anywhere).', 'success');
    } else {
      onNotify('Copy Failed', 'Clipboard access was blocked by browser permissions.', 'error');
    }
  }, [resultBlob, onNotify]);

  const handleShare = useCallback(async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}-filewala-cutout.png`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename: outName,
      title: 'Background Cutout',
      text: 'Background removed with FileWala BG Studio.',
    });
    if (shared) {
      onNotify('Shared', 'Cutout shared successfully.', 'success');
    }
  }, [resultBlob, currentImage, onNotify]);

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
          Desktop-grade cutout studio with WebGPU AI, tactile Zoom & Pan, undo history, and 8-bit soft alpha.
        </p>
      </div>

      {/* Dual-Model Engine Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setEngineMode('ai')}
            className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              engineMode === 'ai'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>AI Smart Mode</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              RMBG-1.4
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEngineMode('fast')}
            className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 px-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>Hardware: {hasWebGPU ? 'WebGPU Accelerated ⚡' : 'WASM CPU Threads'}</span>
        </div>
      </div>

      {/* Upload Zone (When no image is loaded) */}
      {!currentImage ? (
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={(files) => {
              if (files.length > 0) loadFile(files[0]);
            }}
            accept="image/*"
            title="Drop image here for background removal"
            description="100% In-Browser Engine · Zero Uploads · Supports PNG, JPG, WebP, HEIC"
          />
        </div>
      ) : (
        /* =========================================================================
           ACTIVE DESKTOP-GRADE WORKSPACE
        ========================================================================= */
        <div className="space-y-4">
          {/* Top Control Bar: File Details + Export Actions */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3.5 border rounded-xl ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                }`}
              >
                <img src={currentImage.previewUrl} alt="Source" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {currentImage.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 mt-0.5">
                  <span>
                    {currentImage.width} × {currentImage.height} px
                  </span>
                  {aiInferenceTimeMs !== null && (
                    <>
                      <span>·</span>
                      <span className="text-blue-500">Neural: {aiInferenceTimeMs}ms</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Undo / Redo */}
              <button
                type="button"
                disabled={!canUndo}
                onClick={handleUndo}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={!canRedo}
                onClick={handleRedo}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />

              {/* Reset Photo */}
              <button
                type="button"
                onClick={resetImage}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Photo</span>
              </button>

              {/* Copy */}
              <button
                type="button"
                disabled={!resultBlob}
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </button>

              {/* Share */}
              {isShareSupported() && (
                <button
                  type="button"
                  disabled={!resultBlob}
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}

              {/* Download PNG */}
              <button
                type="button"
                disabled={!resultBlob}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Cutout</span>
              </button>
            </div>
          </div>

          {/* Main Studio Layout: 8 cols Viewport + 4 cols Studio Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ========================================================= */}
            {/* Left 8 Cols: Interactive Zoom & Pan Studio Viewport       */}
            {/* ========================================================= */}
            <div className="lg:col-span-8 space-y-3">
              <div className="p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                {/* Viewport Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                  {/* Tool Modes (Erase, Restore, Wand, Hand) */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActiveToolMode('erase')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        activeToolMode === 'erase'
                          ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Erase Brush (E)"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Erase</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveToolMode('restore')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        activeToolMode === 'restore'
                          ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Restore Subject Brush (R)"
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveToolMode('wand')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        activeToolMode === 'wand'
                          ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Magic Wand Flood Fill (W)"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Wand</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveToolMode('hand')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        activeToolMode === 'hand'
                          ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Hand Pan Tool (H / Hold Space)"
                    >
                      <Hand className="w-3.5 h-3.5" />
                      <span>Pan</span>
                    </button>
                  </div>

                  {/* Zoom Controls & Comparison View */}
                  <div className="flex items-center gap-1.5">
                    {/* Before / After Split Slider Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsSplitView((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isSplitView
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                      }`}
                      title="Toggle Before/After Split Comparison"
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Split View</span>
                    </button>

                    {/* View Original */}
                    <button
                      type="button"
                      onClick={() => setShowOriginal((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        showOriginal
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                      }`}
                      title="View original unedited image"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Original</span>
                    </button>

                    <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                    {/* Zoom In / Out Buttons */}
                    <button
                      type="button"
                      onClick={() => handleZoomStep(-0.2)}
                      className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] font-mono text-zinc-500 w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>

                    <button
                      type="button"
                      onClick={() => handleZoomStep(0.2)}
                      className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleFitToScreen}
                      className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Fit to Screen (0)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI Progress Banner */}
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
                      <div className="bg-blue-600 h-full transition-all duration-200" style={{ width: `${aiProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Interactive Zoom/Pan Canvas Viewport */}
                <div
                  ref={viewportRef}
                  onWheel={handleViewportWheel}
                  onMouseDown={handleViewportMouseDown}
                  onMouseMove={handleViewportMouseMove}
                  onMouseUp={handleViewportMouseUp}
                  onMouseLeave={handleViewportMouseLeave}
                  className={`relative rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-[380px] max-h-[580px] sm:min-h-[460px] h-[520px] select-none ${
                    activeToolMode === 'hand' || isPanning
                      ? isPanning
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                      : activeToolMode === 'wand'
                      ? 'cursor-crosshair'
                      : 'cursor-none'
                  }`}
                  style={{
                    backgroundColor: '#09090b',
                    backgroundImage:
                      'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {/* Floating Circular Brush Cursor */}
                  {cursorPos.visible &&
                    (activeToolMode === 'erase' || activeToolMode === 'restore') && (
                      <div
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.7)] transition-transform duration-75 z-30"
                        style={{
                          left: cursorPos.x,
                          top: cursorPos.y,
                          width: Math.max(8, brushSize * zoom),
                          height: Math.max(8, brushSize * zoom),
                          backgroundColor:
                            activeToolMode === 'erase'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                        }}
                      />
                    )}

                  {/* Canvas Transform Wrapper */}
                  <div
                    className="absolute transition-transform duration-75 ease-out origin-top-left"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    {/* Checkerboard Backdrop for Transparent Area */}
                    <div
                      className="shadow-2xl rounded-sm overflow-hidden"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {showOriginal ? (
                        <img
                          src={currentImage.previewUrl}
                          alt="Original"
                          className="max-w-none block pointer-events-none"
                          style={{
                            width: currentImage.width,
                            height: currentImage.height,
                          }}
                        />
                      ) : (
                        <canvas ref={canvasRef} className="block pointer-events-none" />
                      )}
                    </div>
                  </div>

                  {/* Split View Floating Handle Indicator */}
                  {isSplitView && (
                    <div
                      className="pointer-events-none absolute top-4 left-4 px-2.5 py-1 rounded-md bg-zinc-900/80 backdrop-blur-md text-white text-[11px] font-mono border border-zinc-700 z-20"
                    >
                      <span>Drag Divider: {splitPos}% Original / Cutout</span>
                    </div>
                  )}

                  {/* Viewport Floating Reset Fit Button */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={handleFitToScreen}
                      className="px-2 py-1 rounded-md bg-zinc-900/80 hover:bg-zinc-900 text-white text-[11px] font-mono border border-zinc-700 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      Reset Fit
                    </button>
                    <button
                      type="button"
                      onClick={handle100Percent}
                      className="px-2 py-1 rounded-md bg-zinc-900/80 hover:bg-zinc-900 text-white text-[11px] font-mono border border-zinc-700 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      1:1
                    </button>
                  </div>
                </div>

                {/* Viewport Bottom Hint Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-zinc-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Shortcuts:</span>
                    <span>Space (Pan)</span>
                    <span>·</span>
                    <span>[ / ] (Size)</span>
                    <span>·</span>
                    <span>Ctrl+Z (Undo)</span>
                  </div>
                  <span>
                    {engineMode === 'ai' ? 'RMBG-1.4 8-Bit Continuous Alpha' : 'BFS Perimeter Keyer (0ms)'}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* Right 4 Cols: Refinement Tools & Background Replacement   */}
            {/* ========================================================= */}
            <div className="lg:col-span-4 space-y-4">
              {/* 1. Brush Precision Controls */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    <span>Brush Precision</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">{brushSize}px</span>
                </div>

                <div className="space-y-3">
                  <Slider
                    label="Brush Size"
                    min={5}
                    max={120}
                    step={1}
                    value={brushSize}
                    onChange={setBrushSize}
                    unit="px"
                  />

                  <Slider
                    label="Brush Hardness (Edge Softness)"
                    min={0}
                    max={100}
                    step={5}
                    value={brushHardness}
                    onChange={setBrushHardness}
                    unit="%"
                  />

                  {activeToolMode === 'wand' && (
                    <Slider
                      label="Magic Wand Tolerance"
                      min={5}
                      max={75}
                      step={1}
                      value={tolerance}
                      onChange={setTolerance}
                      unit="%"
                    />
                  )}
                </div>
              </div>

              {/* 2. Edge Refinement Suite */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Edge Refinement</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeather(0);
                      setShiftEdge(0);
                    }}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-3">
                  <Slider
                    label="Feather (Smooth Edge)"
                    min={0}
                    max={8}
                    step={1}
                    value={feather}
                    onChange={setFeather}
                    unit="px"
                  />

                  <Slider
                    label="Shift Edge (Defringe / Contract)"
                    min={-5}
                    max={5}
                    step={1}
                    value={shiftEdge}
                    onChange={setShiftEdge}
                    unit="px"
                  />
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Shift negative (-1px) to cut border halos; positive to preserve faint hair.
                  </p>
                </div>
              </div>

              {/* 3. Background Replacement Options */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono block pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  Replace Background
                </span>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {/* Transparent */}
                  <button
                    type="button"
                    onClick={() => setBgMode('transparent')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'transparent'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Transparent PNG
                  </button>

                  {/* Solid White */}
                  <button
                    type="button"
                    onClick={() => setBgMode('white')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'white'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Solid White
                  </button>

                  {/* Passport Blue */}
                  <button
                    type="button"
                    onClick={() => setBgMode('passport-blue')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'passport-blue'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Passport Blue
                  </button>

                  {/* Visa Grey */}
                  <button
                    type="button"
                    onClick={() => setBgMode('visa-grey')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'visa-grey'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Visa Light Grey
                  </button>

                  {/* Portrait Beige */}
                  <button
                    type="button"
                    onClick={() => setBgMode('portrait-beige')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'portrait-beige'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Studio Beige
                  </button>

                  {/* Blur Bokeh BG */}
                  <button
                    type="button"
                    onClick={() => setBgMode('blur')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'blur'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Blur Bokeh BG
                  </button>

                  {/* Studio Vignette Gradient */}
                  <button
                    type="button"
                    onClick={() => setBgMode('gradient-vignette')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'gradient-vignette'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Dark Vignette
                  </button>

                  {/* Warm Sunset Gradient */}
                  <button
                    type="button"
                    onClick={() => setBgMode('gradient-warm')}
                    className={`p-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                      bgMode === 'gradient-warm'
                        ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Warm Sunset
                  </button>

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => {
                        setCustomBgColor(e.target.value);
                        setBgMode('custom-color');
                      }}
                      className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-600 cursor-pointer p-0"
                      title="Pick custom color"
                    />
                    <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">Custom HEX</span>
                  </div>

                  {/* Custom Image Backdrop Uploader */}
                  <div>
                    <input
                      ref={backdropInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCustomBackdropSelected}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backdropInputRef.current?.click()}
                      className={`w-full p-2 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        bgMode === 'custom-image'
                          ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Custom Photo</span>
                    </button>
                  </div>
                </div>

                {/* 4. Realistic Drop Shadow Settings */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dropShadow}
                        onChange={(e) => setDropShadow(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Realistic Drop Shadow</span>
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {dropShadow ? `${shadowBlur}px blur` : 'Disabled'}
                    </span>
                  </div>

                  {dropShadow && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <Slider
                        label="Shadow Blur"
                        min={0}
                        max={35}
                        step={1}
                        value={shadowBlur}
                        onChange={setShadowBlur}
                        unit="px"
                      />
                      <Slider
                        label="Shadow Opacity"
                        min={10}
                        max={80}
                        step={5}
                        value={shadowOpacity}
                        onChange={setShadowOpacity}
                        unit="%"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Main Export Action Button */}
              <div className="pt-1">
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  disabled={!resultBlob}
                  className="w-full justify-center py-2.5 text-xs font-semibold"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Download High-Res Cutout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema-Matched Knowledge Base Guide */}
      <ImageToolGuideSection toolId="bg-remover" />
    </div>
  );
};
