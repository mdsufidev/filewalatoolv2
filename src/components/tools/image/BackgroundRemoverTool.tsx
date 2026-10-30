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
import { BriaRmbgWorkerClient } from '../../../core/engine/BriaRmbgWorkerClient';
import { HumanLoadingOverlay } from '../../ui/HumanLoadingOverlay';

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

export const BackgroundRemoverTool: React.FC<BackgroundRemoverToolProps> = ({
  onNotify,
  initialFiles,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentImage, isLoading: isImageLoading, loadFile, reset: resetImage } = useImageUpload();

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
  const zoomRef = useRef<number>(1.0);
  zoomRef.current = zoom;
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panRef.current = pan;
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
  const briaWorkerRef = useRef<BriaRmbgWorkerClient | null>(null);
  const isSpacePressedRef = useRef<boolean>(false);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const splitDragRef = useRef<boolean>(false);
  const blobDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHoveringDivider, setIsHoveringDivider] = useState<boolean>(false);
  const isHoveringDividerRef = useRef<boolean>(false);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const renderCompositedResultRef = useRef<() => void>(() => {});
  const pushHistorySnapshotRef = useRef<() => void>(() => {});
  const runAiInferenceRef = useRef<() => Promise<void>>(async () => {});
  const runFastPerimeterCleanRef = useRef<(img: HTMLImageElement, mask: HTMLCanvasElement, tol: number) => void>(() => {});
  const lastInitImageIdRef = useRef<string | null>(null);
  const lastInitEngineModeRef = useRef<RemovalEngine | null>(null);
  const srcDataCacheRef = useRef<Uint8ClampedArray | null>(null);

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

  // Initialize isolated background worker with proactive pre-warming
  useEffect(() => {
    briaWorkerRef.current = new BriaRmbgWorkerClient();
    if (hasWebGPU !== null) {
      briaWorkerRef.current.warmup(!!hasWebGPU);
    }
    return () => {
      briaWorkerRef.current?.terminate();
      briaWorkerRef.current = null;
    };
  }, [hasWebGPU]);

  // Load initial file if provided
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !currentImage) {
      loadFile(initialFiles[0]);
    }
  }, [initialFiles, loadFile, currentImage]);

  /* -------------------------------------------------------------
     HISTORY STACK MANAGER (8-Step Memory-Optimized Undo / Redo)
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
    // Clamped to 8 snapshots to prevent 1GB RAM memory exhaustion on mobile/laptops
    if (newHistory.length > 8) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  /* -------------------------------------------------------------
     PURE CLEAN EXPORT BLOB GENERATOR (NEVER CONTAMINATED WITH SPLIT VIEW)
  ------------------------------------------------------------- */
  const generateCleanExportBlob = useCallback(() => {
    if (!currentImage || !maskCanvasRef.current) return;
    const img = currentImage.imageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return;

    let activeMask: HTMLCanvasElement = maskCanvasRef.current;
    if (feather > 0 || shiftEdge !== 0) {
      const refinedCanvas = document.createElement('canvas');
      refinedCanvas.width = w;
      refinedCanvas.height = h;
      const rctx = refinedCanvas.getContext('2d');
      if (rctx) {
        if (feather > 0) rctx.filter = `blur(${feather}px)`;
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

    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    if (!fgCtx) return;

    fgCtx.drawImage(img, 0, 0, w, h);
    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(activeMask, 0, 0, w, h);
    fgCtx.globalCompositeOperation = 'source-over';

    // Clear and draw clean chosen backdrop (transparent, solid, or image)
    drawBackgroundToContext(ectx, w, h, img, bgMode, customBgColor, customBackdropImg);

    if (dropShadow && bgMode !== 'transparent') {
      ectx.save();
      ectx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity / 100})`;
      ectx.shadowBlur = shadowBlur;
      ectx.shadowOffsetY = shadowOffsetY;
      ectx.drawImage(fgCanvas, 0, 0);
      ectx.restore();
    }
    ectx.drawImage(fgCanvas, 0, 0);

    fgCanvas.width = 0;
    fgCanvas.height = 0;
    if (activeMask !== maskCanvasRef.current) {
      activeMask.width = 0;
      activeMask.height = 0;
    }

    exportCanvas.toBlob((blob) => {
      exportCanvas.width = 0;
      exportCanvas.height = 0;
      if (blob) setResultBlob(blob);
    }, 'image/png');
  }, [
    currentImage,
    feather,
    shiftEdge,
    bgMode,
    customBgColor,
    customBackdropImg,
    dropShadow,
    shadowBlur,
    shadowOpacity,
    shadowOffsetY,
  ]);

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

    fgCanvas.width = 0;
    fgCanvas.height = 0;
    if (activeMask !== maskCanvasRef.current) {
      activeMask.width = 0;
      activeMask.height = 0;
    }

    // 5. Debounced High-Res Clean Export Blob Generation (200ms debounce prevents CPU thrashing)
    if (blobDebounceRef.current) {
      clearTimeout(blobDebounceRef.current);
    }
    blobDebounceRef.current = setTimeout(() => {
      generateCleanExportBlob();
    }, 200);
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
    generateCleanExportBlob,
  ]);

  renderCompositedResultRef.current = renderCompositedResult;
  pushHistorySnapshotRef.current = pushHistorySnapshot;

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
     ZOOM UTILITIES: FIT TO SCREEN
  ------------------------------------------------------------- */
  const handleFitToScreen = useCallback(() => {
    if (!viewportRef.current || !currentImage || !currentImage.width || !currentImage.height) return;
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

    const clampX = (val: number) => Math.max(0, Math.min(w - 1, val));
    const clampY = (val: number) => Math.max(0, Math.min(h - 1, val));

    const seedPoints = [
      [clampX(2), clampY(2)],
      [clampX(w - 3), clampY(2)],
      [clampX(2), clampY(h - 3)],
      [clampX(w - 3), clampY(h - 3)],
      [clampX(Math.floor(w / 2)), clampY(2)],
      [clampX(Math.floor(w / 2)), clampY(h - 3)],
      [clampX(2), clampY(Math.floor(h / 2))],
      [clampX(w - 3), clampY(Math.floor(h / 2))],
    ];

    const visited = new Uint8Array(w * h);
    const maxDist = (tol / 100) * 441.67;
    const maxDistSq = maxDist * maxDist;

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
              const distSq = dr * dr + dg * dg + db * db;

              if (distSq <= maxDistSq) {
                queueX.push(nx);
                queueY.push(ny);
              }
            }
          }
        }
      }
    }

    tempCanvas.width = 0;
    tempCanvas.height = 0;

    mctx.putImageData(maskImgData, 0, 0);
    pushHistorySnapshotRef.current();
    renderCompositedResultRef.current();
  }, []);

  runFastPerimeterCleanRef.current = runFastPerimeterClean;

  /* -------------------------------------------------------------
     BRIA RMBG-1.4 AI NEURAL BACKGROUND REMOVAL (OFFLOADED WORKER)
  ------------------------------------------------------------- */
  const runAiInference = useCallback(async () => {
    if (!currentImage || !maskCanvasRef.current) return;
    setIsAiProcessing(true);
    setAiProgress(5);
    setAiStatus('Initializing BRIA RMBG-1.4 Neural Engine...');

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let currentPct = 5;

    const stopProgressTimer = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    };

    let lastReportedPct = -1;
    const reportProgress = (val: number) => {
      const rounded = Math.round(val);
      if (rounded !== lastReportedPct) {
        lastReportedPct = rounded;
        setAiProgress(rounded);
      }
    };

    try {
      if (!briaWorkerRef.current) {
        briaWorkerRef.current = new BriaRmbgWorkerClient();
      }

      const img = currentImage.imageElement;
      const INPUT_SIZE = 1024;

      // 1. Prepare 1024x1024 intermediate canvas for RMBG-1.4 model
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = INPUT_SIZE;
      tempCanvas.height = INPUT_SIZE;
      const tctx = tempCanvas.getContext('2d');
      if (!tctx) throw new Error('Failed to create intermediate AI canvas context');

      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);

      const imgData = tctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      tempCanvas.width = 0;
      tempCanvas.height = 0;

      // 2. Offload to background worker for local WebGPU / WASM execution
      const result = await briaWorkerRef.current.removeBackground({
        imageBuffer: imgData.data.buffer,
        hasWebGPU: !!hasWebGPU,
        onProgress: (pct, stage) => {
          setAiStatus(stage);
          if (pct >= 70) {
            stopProgressTimer();
            currentPct = Math.max(currentPct, 72);
            reportProgress(currentPct);
            // During neural inference (session.run), smoothly glide progress towards 93%
            // with 200ms interval to eliminate 14/sec component re-renders
            progressTimer = setInterval(() => {
              if (currentPct < 93) {
                currentPct += (93.5 - currentPct) * 0.05;
                reportProgress(currentPct);
              }
            }, 200);
          } else {
            currentPct = Math.max(currentPct, pct);
            reportProgress(currentPct);
          }
        },
      });

      stopProgressTimer();
      setAiProgress(96);
      setAiStatus('Compositing 8-bit continuous soft alpha...');

      // 3. Bilinear upsample the 1024x1024 mask back to full original image resolution
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const maskCanvas = maskCanvasRef.current;
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext('2d');
      if (!mctx) return;

      const lowResMaskCanvas = document.createElement('canvas');
      lowResMaskCanvas.width = INPUT_SIZE;
      lowResMaskCanvas.height = INPUT_SIZE;
      const lctx = lowResMaskCanvas.getContext('2d');
      if (!lctx) return;

      const lowResImgData = lctx.createImageData(INPUT_SIZE, INPUT_SIZE);
      const lData32 = new Uint32Array(lowResImgData.data.buffer);
      const alphaArray = new Uint8Array(result.alphaBuffer);
      const totalPixels = INPUT_SIZE * INPUT_SIZE;

      // Ultra-fast 32-bit single-instruction write (0xAABBGGRR in little endian: R=255, G=255, B=255, A=alpha)
      // Drops main-thread execution from ~180ms down to ~2ms, eliminating UI frame drops!
      for (let i = 0; i < totalPixels; i++) {
        lData32[i] = (alphaArray[i] << 24) | 0x00ffffff;
      }
      lctx.putImageData(lowResImgData, 0, 0);

      mctx.clearRect(0, 0, w, h);
      mctx.imageSmoothingEnabled = true;
      mctx.imageSmoothingQuality = 'high';
      mctx.drawImage(lowResMaskCanvas, 0, 0, w, h);
      lowResMaskCanvas.width = 0;
      lowResMaskCanvas.height = 0;

      pushHistorySnapshotRef.current();
      setAiProgress(100);
      setAiStatus('Complete');
      setAiInferenceTimeMs(result.elapsedMs);
      renderCompositedResultRef.current();
      onNotify('AI Cutout Complete', `BRIA RMBG-1.4 isolated subject in ${result.elapsedMs}ms with 8-bit soft alpha.`, 'success');
    } catch (err: any) {
      console.error('BRIA RMBG-1.4 AI inference failed:', err);
      const msg = (err && err.message) || 'Model execution failed';
      setAiStatus(`Error: ${msg}`);
      onNotify('AI Error', `${msg}. Please click "Re-run AI" to retry.`, 'error');
    } finally {
      stopProgressTimer();
      setIsAiProcessing(false);
    }
  }, [
    currentImage,
    hasWebGPU,
    onNotify,
  ]);

  runAiInferenceRef.current = runAiInference;

  /* -------------------------------------------------------------
     INITIALIZE ON IMAGE LOAD OR ENGINE SWITCH
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!currentImage) {
      lastInitImageIdRef.current = null;
      lastInitEngineModeRef.current = null;
      maskCanvasRef.current = null;
      setResultBlob(null);
      setCustomBackdropImg(null);
      srcDataCacheRef.current = null;
      historyRef.current = [];
      historyIndexRef.current = -1;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const imageKey = currentImage.previewUrl || currentImage.name || 'image';
    if (lastInitImageIdRef.current === imageKey && lastInitEngineModeRef.current === engineMode) {
      return;
    }
    lastInitImageIdRef.current = imageKey;
    lastInitEngineModeRef.current = engineMode;

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

    // Reset Zoom & Pan to Fit Viewport (deferred so viewport DOM has laid out)
    requestAnimationFrame(() => {
      handleFitToScreen();
    });

    // 220ms scheduled delay allows workspace entry animation (duration-200) to settle at 60fps
    const startTimer = setTimeout(() => {
      if (engineMode === 'fast') {
        runFastPerimeterCleanRef.current(img, mask, tolerance);
      } else {
        runAiInferenceRef.current();
      }
    }, 220);

    return () => clearTimeout(startTimer);
  }, [currentImage, engineMode, handleFitToScreen, tolerance]);

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

    const mctx = maskCanvasRef.current.getContext('2d');
    if (!mctx) return;

    // Cache source pixel buffer to avoid redundant 48MB canvas re-draws on every wand click
    let srcData = srcDataCacheRef.current;
    if (!srcData || srcData.length !== w * h * 4) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      srcData = ctx.getImageData(0, 0, w, h).data;
      srcDataCacheRef.current = srcData;
    }

    const maskImgData = mctx.getImageData(0, 0, w, h);
    const maskData = maskImgData.data;

    const startIdx = (clickY * w + clickX) * 4;
    const targetR = srcData[startIdx];
    const targetG = srcData[startIdx + 1];
    const targetB = srcData[startIdx + 2];
    const maxDist = (tolerance / 100) * 441.67;
    const maxDistSq = maxDist * maxDist;

    const visited = new Uint8Array(w * h);
    const queueX: number[] = [clickX];
    const queueY: number[] = [clickY];
    visited[clickY * w + clickX] = 1;

    let head = 0;
    while (head < queueX.length && head < 400000) {
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
            const distSq = dr * dr + dg * dg + db * db;

            if (distSq <= maxDistSq) {
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
  const getImageCoordinates = (e: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    // Prevent accidental dot stamping at (0, 0) when clicking outside canvas bounds
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return null;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)));
    return { x, y };
  };

  // Native non-passive wheel listener: strictly prevents browser page scrolling while zooming on canvas
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.min(5.0, Math.max(0.25, +(currentZoom * zoomFactor).toFixed(2)));

      const ix = (cx - currentPan.x) / currentZoom;
      const iy = (cy - currentPan.y) / currentZoom;

      const newPan = {
        x: Math.round(cx - ix * newZoom),
        y: Math.round(cy - iy * newZoom),
      };

      zoomRef.current = newZoom;
      panRef.current = newPan;

      setPan(newPan);
      setZoom(newZoom);
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [currentImage]);

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
    // Track cursor ring position in viewport coordinates via direct DOM to eliminate React re-renders on mousemove
    if (cursorRingRef.current && viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect();
      const x = e.clientX - vRect.left;
      const y = e.clientY - vRect.top;
      cursorRingRef.current.style.transform = `translate(${x}px, ${y}px)`;
      cursorRingRef.current.style.display =
        activeToolMode === 'erase' || activeToolMode === 'restore' ? 'block' : 'none';
    }

    // Split slider hover detection for tactile cursor style
    let isOver = false;
    if (isSplitView && canvasRef.current) {
      const cRect = canvasRef.current.getBoundingClientRect();
      const currentSplitX = cRect.left + (splitPos / 100) * cRect.width;
      if (Math.abs(e.clientX - currentSplitX) <= 14) {
        isOver = true;
      }
    }
    if (isHoveringDividerRef.current !== isOver) {
      isHoveringDividerRef.current = isOver;
      setIsHoveringDivider(isOver);
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
      pushHistorySnapshotRef.current();
      renderCompositedResultRef.current();
    }
  };

  const handleViewportMouseLeave = () => {
    if (cursorRingRef.current) {
      cursorRingRef.current.style.display = 'none';
    }
    if (isHoveringDividerRef.current) {
      isHoveringDividerRef.current = false;
      setIsHoveringDivider(false);
    }
    if (isPanning) setIsPanning(false);
    if (splitDragRef.current) splitDragRef.current = false;
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPosRef.current = null;
      pushHistorySnapshotRef.current();
      renderCompositedResultRef.current();
    }
  };

  // Touch event handlers for mobile and tablet support
  const handleViewportTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isSplitView && viewportRef.current && canvasRef.current) {
        const cRect = canvasRef.current.getBoundingClientRect();
        const currentSplitX = cRect.left + (splitPos / 100) * cRect.width;
        if (Math.abs(touch.clientX - currentSplitX) < 24) {
          splitDragRef.current = true;
          return;
        }
      }

      if (activeToolMode === 'hand') {
        setIsPanning(true);
        panStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
        return;
      }

      const coords = getImageCoordinates(touch);
      if (!coords) return;
      if (activeToolMode === 'erase' || activeToolMode === 'restore') {
        isDrawingRef.current = true;
        lastDrawPosRef.current = coords;
        stampBrushAt(coords.x, coords.y, brushSize, brushHardness, activeToolMode === 'erase');
        renderCompositedResult();
      }
    }
  };

  const handleViewportTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isPanning) {
        setPan({
          x: touch.clientX - panStartRef.current.x,
          y: touch.clientY - panStartRef.current.y,
        });
        return;
      }
      if (splitDragRef.current && canvasRef.current) {
        const cRect = canvasRef.current.getBoundingClientRect();
        const relX = Math.min(cRect.width, Math.max(0, touch.clientX - cRect.left));
        const newPos = Math.round((relX / cRect.width) * 100);
        setSplitPos(newPos);
        return;
      }
      if (isDrawingRef.current && lastDrawPosRef.current) {
        const coords = getImageCoordinates(touch);
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
    }
  };

  const handleViewportTouchEnd = () => {
    handleViewportMouseUp();
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
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

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

      // Spacebar temporary hand pan mode (prevent page scroll down!)
      if (e.code === 'Space' && !isSpacePressedRef.current) {
        e.preventDefault();
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
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Cutout image copied (Ctrl+V anywhere).', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Clipboard access was blocked by browser permissions.', 'error');
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
    if (shared.shared) {
      onNotify('Shared', 'Cutout shared successfully.', 'success');
    }
  }, [resultBlob, currentImage, onNotify]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {!currentImage ? (
        <div className="space-y-3 sm:space-y-3.5">
          {/* Header Section */}
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Client-Side Engine · Zero Uploads</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Instant Background Remover
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Desktop-grade cutout studio with WebGPU AI, tactile Zoom &amp; Pan, undo history, and 8-bit soft alpha.
            </p>
          </div>

          {/* Dual-Model Engine Mode Toggle */}
          <div className="max-w-[700px] mx-auto flex items-center justify-between flex-wrap gap-2 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setEngineMode('ai');
                }}
                className={`flex-1 sm:flex-none py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  engineMode === 'ai'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span>BRIA RMBG-1.4 AI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEngineMode('fast');
                }}
                className={`flex-1 sm:flex-none py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  engineMode === 'fast'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Flat Color Keyer</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 px-1">
              <Cpu className="w-3 h-3 text-emerald-500" />
              <span>{hasWebGPU ? 'WebGPU ⚡' : 'WASM Threads'}</span>
            </div>
          </div>

          {/* Upload Zone (When no image is loaded) */}
          <div className="max-w-[700px] mx-auto relative">
            {isImageLoading ? (
              <HumanLoadingOverlay
                title="Loading"
                stage="Reading image file..."
                percent={20}
                accentColor="blue"
              />
            ) : (
              <Dropzone
                onFilesSelected={(files) => {
                  if (files.length > 0) loadFile(files[0]);
                }}
                accept="image/*"
                title="Drop image here for background removal"
                description="100% In-Browser Engine · Zero Uploads · Supports PNG, JPG, WebP, HEIC"
              />
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           ACTIVE DESKTOP-GRADE WORKSPACE
        ========================================================================= */
        <div className="space-y-2 sm:space-y-2.5">
          {/* Hero Title & Action Bar Row (Ultra-Compact Viewport-Safe) */}
          <div className="flex items-center justify-between gap-3 pt-0 pb-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
                Instant Background Remover
              </h1>
              <span className="hidden sm:inline-block text-zinc-300 dark:text-zinc-700">·</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
                {engineMode === 'ai' ? 'BRIA RMBG-1.4 Neural Engine' : 'Chroma Keyer'} · {hasWebGPU ? 'WebGPU ⚡' : 'WASM'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isAiProcessing}
                onClick={runAiInference}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>Re-run AI</span>
              </button>

              <button
                type="button"
                onClick={resetImage}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-zinc-500" />
                <span>New photo</span>
              </button>
            </div>
          </div>

          {/* Main Studio Layout: 8 cols Viewport + 4 cols Studio Tools - Equal Height */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            {/* ========================================================= */}
            {/* Left 8 Cols: Interactive Zoom & Pan Studio Viewport       */}
            {/* ========================================================= */}
            <div className="lg:col-span-8 flex flex-col h-full space-y-2">
              <div className="p-3 sm:p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 flex flex-col justify-between h-full gap-2 shadow-xs">
                {/* Viewport Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                  {/* Tool Modes (Erase, Restore, Wand, Hand) + Undo/Redo */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!canUndo}
                      onClick={handleUndo}
                      className="p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={!canRedo}
                      onClick={handleRedo}
                      className="p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="w-3 h-3" />
                    </button>

                    <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                    <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveToolMode('erase')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          activeToolMode === 'erase'
                            ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                        title="Erase Brush (E)"
                      >
                        <Eraser className="w-3 h-3" />
                        <span>Erase</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveToolMode('restore')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          activeToolMode === 'restore'
                            ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                        title="Restore Subject Brush (R)"
                      >
                        <Paintbrush className="w-3 h-3" />
                        <span>Restore</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveToolMode('wand')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          activeToolMode === 'wand'
                            ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                        title="Magic Wand Flood Fill (W)"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Wand</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveToolMode('hand')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          activeToolMode === 'hand'
                            ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                        title="Hand Pan Tool (H / Hold Space)"
                      >
                        <Hand className="w-3 h-3" />
                        <span>Pan</span>
                      </button>
                    </div>
                  </div>

                  {/* Zoom Controls & Comparison View */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setIsSplitView((v) => !v)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        isSplitView
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                      }`}
                    >
                      <Columns2 className="w-3 h-3" />
                      <span>Split</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowOriginal((v) => !v)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        showOriginal
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Original</span>
                    </button>

                    <span className="font-mono text-zinc-400 text-[10px] pl-1">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                </div>

                {/* Interactive Zoom/Pan Canvas Viewport (Viewport-filling height matching Compressor) */}
                <div
                  ref={viewportRef}
                  onMouseDown={handleViewportMouseDown}
                  onMouseMove={handleViewportMouseMove}
                  onMouseUp={handleViewportMouseUp}
                  onMouseLeave={handleViewportMouseLeave}
                  onTouchStart={handleViewportTouchStart}
                  onTouchMove={handleViewportTouchMove}
                  onTouchEnd={handleViewportTouchEnd}
                  onTouchCancel={handleViewportTouchEnd}
                  className="relative rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden h-[380px] sm:h-[430px] lg:h-[480px] xl:h-[510px] flex-1 min-h-[360px] sm:min-h-[400px] lg:min-h-[460px] xl:min-h-[490px] select-none touch-none overscroll-none"
                  style={{
                    cursor: isPanning
                      ? 'grabbing'
                      : isHoveringDivider
                      ? 'col-resize'
                      : activeToolMode === 'hand'
                      ? 'grab'
                      : activeToolMode === 'wand'
                      ? 'crosshair'
                      : activeToolMode === 'erase' || activeToolMode === 'restore'
                      ? 'none'
                      : 'default',
                    backgroundColor: isDark ? '#09090b' : '#f8fafc',
                    backgroundImage: isDark
                      ? 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)'
                      : 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {/* Human-type Animation */}
                  {isAiProcessing && (
                    <HumanLoadingOverlay
                      title="Loading"
                      stage={aiStatus}
                      percent={aiProgress}
                      accentColor="blue"
                    />
                  )}

                  {/* Floating Circular Brush Cursor (Direct DOM driven for 120fps performance) */}
                  <div
                    ref={cursorRingRef}
                    className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.7)] z-30 hidden"
                    style={{
                      width: Math.max(8, brushSize * zoom),
                      height: Math.max(8, brushSize * zoom),
                      backgroundColor:
                        activeToolMode === 'erase'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(59, 130, 246, 0.15)',
                    }}
                  />

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
                        backgroundImage: isDark
                          ? 'linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)'
                          : 'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                        backgroundColor: isDark ? '#18181b' : '#ffffff',
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

                  {/* Viewport Floating Reset Fit Button */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20">
                    <button
                      type="button"
                      onClick={handleFitToScreen}
                      className="px-1.5 py-0.5 rounded bg-zinc-900/80 hover:bg-zinc-900 text-white text-[10px] font-mono border border-zinc-700 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      Reset Fit
                    </button>
                    <button
                      type="button"
                      onClick={handle100Percent}
                      className="px-1.5 py-0.5 rounded bg-zinc-900/80 hover:bg-zinc-900 text-white text-[10px] font-mono border border-zinc-700 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      1:1
                    </button>
                  </div>
                </div>

                {/* Viewport Quick Action & Shortcuts */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] text-zinc-500 font-mono">
                  <span>Hold Space (Pan) · [ / ] (Size) · Ctrl+Z (Undo)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!resultBlob}
                      onClick={handleCopy}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    >
                      Copy
                    </button>
                    {isShareSupported() && (
                      <>
                        <span>·</span>
                        <button
                          type="button"
                          disabled={!resultBlob}
                          onClick={handleShare}
                          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                          Share
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* Right 4 Cols: Refinement Tools & Background Replacement   */}
            {/* ========================================================= */}
            <div className="lg:col-span-4 flex flex-col gap-3 h-full">
              <div
                className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors ${
                  isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xs' : 'bg-white border-zinc-200 shadow-xs'
                }`}
              >
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 block">
                      STUDIO TOOLS
                    </span>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                      Refinement & Backdrop
                    </h3>
                  </div>

                {/* Brush Size, Softness & Wand Tolerance */}
                <div className="space-y-1">
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
                    label="Edge Softness"
                    min={0}
                    max={10}
                    step={1}
                    value={feather}
                    onChange={(v) => {
                      setFeather(v);
                      renderCompositedResult();
                    }}
                    unit="px"
                  />
                  {activeToolMode === 'wand' && (
                    <Slider
                      label="Wand Tolerance"
                      min={5}
                      max={75}
                      step={1}
                      value={tolerance}
                      onChange={setTolerance}
                      unit="%"
                    />
                  )}
                </div>

                {/* Background Replacement Options */}
                <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className={`text-[10px] font-semibold block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Replace Background
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setBgMode('transparent')}
                      className={`p-1 rounded font-medium text-center transition-colors cursor-pointer truncate ${
                        bgMode === 'transparent'
                          ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('white')}
                      className={`p-1 rounded font-medium text-center transition-colors cursor-pointer truncate ${
                        bgMode === 'white'
                          ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      White
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('passport-blue')}
                      className={`p-1 rounded font-medium text-center transition-colors cursor-pointer truncate ${
                        bgMode === 'passport-blue'
                          ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Passport Blue
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('blur')}
                      className={`p-1 rounded font-medium text-center transition-colors cursor-pointer truncate ${
                        bgMode === 'blur'
                          ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Blur Bokeh
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('gradient-warm')}
                      className={`p-1 rounded font-medium text-center transition-colors cursor-pointer truncate ${
                        bgMode === 'gradient-warm'
                          ? 'bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Warm Sunset
                    </button>
                    <div className="flex items-center gap-1 p-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                      <input
                        type="color"
                        value={customBgColor}
                        onChange={(e) => {
                          setCustomBgColor(e.target.value);
                          setBgMode('custom-color');
                        }}
                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-[9px] font-mono text-zinc-500">Color</span>
                    </div>
                  </div>

                  {/* Engine Info Badge */}
                  <div className="mt-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/70 dark:border-zinc-800 text-[11px] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">Model Engine</span>
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {engineMode === 'ai' ? (hasWebGPU ? 'BRIA WebGPU ⚡' : 'BRIA WASM') : 'Chroma Keyer'}
                    </span>
                  </div>
                </div>
                </div>

                {/* Primary Action Button (Red Brand CTA) */}
                <div className="pt-2 shrink-0">
                  <button
                    type="button"
                    disabled={!resultBlob}
                    onClick={handleDownload}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Cutout (PNG)</span>
                  </button>
                </div>
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
