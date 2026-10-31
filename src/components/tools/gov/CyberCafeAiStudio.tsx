'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Wand2,
  Check,
  RotateCcw,
  Palette,
  Loader2,
  Zap,
} from 'lucide-react';
import { FaceEnhancerEngine, DEFAULT_ENHANCE_SETTINGS } from '../../../core/engine/FaceEnhancerEngine';
import { NeuralFaceEnhancer } from '../../../core/engine/NeuralFaceEnhancer';
import { BriaRmbgWorkerClient } from '../../../core/engine/BriaRmbgWorkerClient';
import { FastPortraitSegmenter } from '../../../core/engine/FastPortraitSegmenter';
import { FastGuidedFilter } from '../../../core/engine/FastGuidedFilter';

export interface CyberCafeColorOption {
  id: string;
  name: string;
  color: string;
  label: string;
  borderClass?: string;
}

export const CYBER_CAFE_COLORS: CyberCafeColorOption[] = [
  { id: 'transparent', name: 'Transparent', color: 'transparent', label: 'Transparent Cutout (PNG)', borderClass: 'border-zinc-300 dark:border-zinc-600' },
  { id: 'white', name: 'Govt White', color: '#ffffff', label: 'White (Official Standard)', borderClass: 'border-zinc-300 dark:border-zinc-600' },
  { id: 'cyber-blue', name: 'Cyber Blue', color: '#0096ff', label: 'Sky Blue (CSC Standard)', borderClass: 'border-blue-400' },
  { id: 'soft-blue', name: 'Soft Blue', color: '#bfe4ff', label: 'Pastel Blue', borderClass: 'border-sky-300' },
  { id: 'light-gray', name: 'Visa Gray', color: '#e5e7eb', label: 'Light Gray', borderClass: 'border-zinc-400' },
  { id: 'studio-red', name: 'Studio Maroon', color: '#7f1d1d', label: 'Maroon', borderClass: 'border-red-900' },
];

/**
 * High-speed fallback perimeter chroma-flood segmentation
 * Guarantees 100% instant cutout even if device is offline or HuggingFace ONNX weights fail to download.
 */
function generateFastMaskFallback(
  img: HTMLImageElement,
  w: number,
  h: number
): HTMLCanvasElement {
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mctx = mask.getContext('2d');
  if (!mctx) return mask;

  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext('2d');
  if (!tctx) return mask;
  tctx.drawImage(img, 0, 0, w, h);
  const srcData = tctx.getImageData(0, 0, w, h).data;
  temp.width = 0;
  temp.height = 0;

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
  const tol = 28;
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
    while (head < queueX.length && head < 350000) {
      const x = queueX[head];
      const y = queueY[head];
      head++;

      const idx = (y * w + x) * 4;
      maskData[idx] = 0;
      maskData[idx + 1] = 0;
      maskData[idx + 2] = 0;
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

  mctx.putImageData(maskImgData, 0, 0);
  return mask;
}

interface CyberCafeAiStudioProps {
  rawImage: HTMLImageElement | null;
  onProcessedImage: (processedImg: HTMLImageElement | null) => void;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  className?: string;
}

export const CyberCafeAiStudio: React.FC<CyberCafeAiStudioProps> = ({
  rawImage,
  onProcessedImage,
  onNotify,
  className = '',
}) => {
  const [isFaceEnhanceActive, setIsFaceEnhanceActive] = useState<boolean>(false);
  const [isBgRemoved, setIsBgRemoved] = useState<boolean>(false);
  const [selectedBgColor, setSelectedBgColor] = useState<string>('transparent');
  const [customColor, setCustomColor] = useState<string>('#0096ff');
  const [isCustomColorActive, setIsCustomColorActive] = useState<boolean>(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Cached alpha mask and neural face canvases (enables 0ms instant color switching)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceEnhancedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rmbgWorkerRef = useRef<BriaRmbgWorkerClient | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Check WebGPU & Preload Neural AI Engines on mount
  useEffect(() => {
    NeuralFaceEnhancer.preload();
    FastPortraitSegmenter.preload();

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

    if (!rmbgWorkerRef.current) {
      rmbgWorkerRef.current = new BriaRmbgWorkerClient();
    }
  }, []);

  // Pre-warm RMBG worker when WebGPU state resolves
  useEffect(() => {
    if (hasWebGPU !== null && rmbgWorkerRef.current) {
      rmbgWorkerRef.current.warmup(!!hasWebGPU);
    }
  }, [hasWebGPU]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      rmbgWorkerRef.current?.terminate();
      rmbgWorkerRef.current = null;
    };
  }, []);

  // When a new image is loaded into the parent tool, reset local state
  useEffect(() => {
    maskCanvasRef.current = null;
    faceEnhancedCanvasRef.current = null;
    setIsFaceEnhanceActive(false);
    setIsBgRemoved(false);
    setSelectedBgColor('transparent');
    setIsCustomColorActive(false);
  }, [rawImage]);

  // Master Compositor: combines Face Enhancement + Background Cutout + Cyber Cafe Color
  const compositeAndEmit = useCallback(
    async (
      targetFaceEnhance: boolean,
      targetBgRemoved: boolean,
      targetColor: string
    ) => {
      if (!rawImage) return;

      // If both AI tools are turned off, revert directly to original raw image
      if (!targetFaceEnhance && !targetBgRemoved) {
        onProcessedImage(null);
        return;
      }

      setIsProcessing(true);
      setProcessingStage('Compositing studio photo...');

      try {
        const w = rawImage.naturalWidth || rawImage.width;
        const h = rawImage.naturalHeight || rawImage.height;

        // Step 1: Base Subject Canvas (Neural Face Enhanced or Original Raw)
        let workingSubjectCanvas: HTMLCanvasElement;

        if (targetFaceEnhance) {
          if (!faceEnhancedCanvasRef.current) {
            setProcessingStage('AI Neural Model: Detecting face & landmarks...');

            try {
              // 1. Run true Generative Facial Prior Neural AI (GFPGAN ONNX Model)
              const aiRestoredCanvas = await NeuralFaceEnhancer.restoreFacePatch(rawImage, {
                modelKey: 'gfpgan-v14',
                hasWebGPU: !!hasWebGPU,
                blendStrength: 1.0,
                onProgress: (pct, stage) => {
                  setProcessingStage(`${stage} (${Math.round(pct)}%)`);
                },
              });

              // 2. Exact dimension normalization to preserve portal pixel-alignment
              const exactCanvas = document.createElement('canvas');
              exactCanvas.width = w;
              exactCanvas.height = h;
              const ectx = exactCanvas.getContext('2d');
              if (!ectx) throw new Error('Failed to create exact canvas context');
              ectx.imageSmoothingEnabled = true;
              ectx.imageSmoothingQuality = 'high';
              ectx.drawImage(aiRestoredCanvas, 0, 0, w, h);
              aiRestoredCanvas.width = 0;
              aiRestoredCanvas.height = 0;

              // 3. ProVisual Finish on AI Subject: natural clarity (no artificial colorization tint)
              faceEnhancedCanvasRef.current = FaceEnhancerEngine.processImage(exactCanvas, {
                ...DEFAULT_ENHANCE_SETTINGS,
                deblur: 0, // already restored by GFPGAN deep neural network
                clarity: 20,
                smooth: 20,
                sharpness: 20,
                glow: 10,
                warmth: 2,
                brightness: 4,
                contrast: 8,
                eyeTeethClarity: 25,
                samsungVivid: true,
              });
              exactCanvas.width = 0;
              exactCanvas.height = 0;
            } catch (neuralErr: any) {
              console.warn('Neural face enhancer fallback to frequency engine:', neuralErr);
              const temp = document.createElement('canvas');
              temp.width = w;
              temp.height = h;
              const tctx = temp.getContext('2d');
              if (!tctx) throw new Error('Failed to create canvas context');
              tctx.drawImage(rawImage, 0, 0);

              faceEnhancedCanvasRef.current = FaceEnhancerEngine.processImage(temp, {
                ...DEFAULT_ENHANCE_SETTINGS,
                deblur: 65,
                clarity: 50,
                smooth: 30,
                sharpness: 55,
                glow: 15,
                warmth: 4,
                brightness: 8,
                contrast: 14,
                eyeTeethClarity: 35,
                samsungVivid: true,
              });
              temp.width = 0;
              temp.height = 0;
            }
          }
          workingSubjectCanvas = faceEnhancedCanvasRef.current;
        } else {
          const temp = document.createElement('canvas');
          temp.width = w;
          temp.height = h;
          const tctx = temp.getContext('2d');
          if (tctx) tctx.drawImage(rawImage, 0, 0);
          workingSubjectCanvas = temp;
        }

        // Step 2: Background Removal & Color Fill
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = w;
        finalCanvas.height = h;
        const fctx = finalCanvas.getContext('2d');
        if (!fctx) throw new Error('Canvas 2D context error');

        if (targetBgRemoved) {
          // Check if we need to compute the alpha cutout mask
          if (!maskCanvasRef.current) {
            setProcessingStage('AI Removing background (Lightning Portrait Matting)...');
            try {
              // Priority Engine: Ultra-Fast Portrait AI (<80ms) + Fast Guided Filter hair matting
              maskCanvasRef.current = await FastPortraitSegmenter.segment(
                workingSubjectCanvas || rawImage,
                (_pct, stage) => setProcessingStage(stage)
              );
            } catch (fastErr: any) {
              console.warn('[CyberCafeStudio] Fast portrait segmenter fallback to RMBG worker:', fastErr);
              setProcessingStage('Running Studio RMBG Neural Matting...');
              try {
                if (!rmbgWorkerRef.current) {
                  rmbgWorkerRef.current = new BriaRmbgWorkerClient();
                }

                const INPUT_SIZE = 1024;
                const tempSmall = document.createElement('canvas');
                tempSmall.width = INPUT_SIZE;
                tempSmall.height = INPUT_SIZE;
                const sctx = tempSmall.getContext('2d');
                if (!sctx) throw new Error('Small canvas error');
                sctx.imageSmoothingEnabled = true;
                sctx.imageSmoothingQuality = 'high';
                sctx.drawImage(rawImage, 0, 0, INPUT_SIZE, INPUT_SIZE);
                const imgData = sctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
                tempSmall.width = 0;
                tempSmall.height = 0;

                const res = await rmbgWorkerRef.current.removeBackground({
                  imageBuffer: imgData.data.buffer,
                  hasWebGPU: !!hasWebGPU,
                  onProgress: (_pct, stage) => setProcessingStage(stage),
                });

                // Apply Fast Guided Filter to preserve single hair strands from RMBG
                maskCanvasRef.current = FastGuidedFilter.refine(
                  workingSubjectCanvas || rawImage,
                  new Uint8Array(res.alphaBuffer),
                  INPUT_SIZE,
                  INPUT_SIZE,
                  w,
                  h,
                  4,
                  1e-3
                );
              } catch (rmbgErr: any) {
                console.warn('[CyberCafeStudio] RMBG worker failed, running edge fallback:', rmbgErr);
                setProcessingStage('Running fast edge cutout fallback...');
                maskCanvasRef.current = generateFastMaskFallback(rawImage, w, h);
              }
            }
          }

          // Generate isolated transparent cutout of the subject
          const cutout = document.createElement('canvas');
          cutout.width = w;
          cutout.height = h;
          const cctx = cutout.getContext('2d');
          if (!cctx) throw new Error('Cutout error');
          cctx.drawImage(workingSubjectCanvas, 0, 0);
          cctx.globalCompositeOperation = 'destination-in';
          cctx.drawImage(maskCanvasRef.current, 0, 0);

          // Render onto finalCanvas with chosen background color
          fctx.clearRect(0, 0, w, h);
          if (targetColor && targetColor !== 'transparent') {
            fctx.fillStyle = targetColor;
            fctx.fillRect(0, 0, w, h);
          }
          fctx.drawImage(cutout, 0, 0);
          cutout.width = 0;
          cutout.height = 0;
        } else {
          // Background removal OFF: render workingSubjectCanvas directly with natural background
          fctx.clearRect(0, 0, w, h);
          fctx.drawImage(workingSubjectCanvas, 0, 0);
        }

        // Convert to high-performance Blob URL & load as HTMLImageElement
        finalCanvas.toBlob(
          (blob) => {
            if (!blob) {
              setIsProcessing(false);
              return;
            }
            if (activeBlobUrlRef.current) {
              URL.revokeObjectURL(activeBlobUrlRef.current);
            }
            const blobUrl = URL.createObjectURL(blob);
            activeBlobUrlRef.current = blobUrl;

            const processedImg = new Image();
            processedImg.onload = () => {
              onProcessedImage(processedImg);
              setIsProcessing(false);
            };
            processedImg.src = blobUrl;
          },
          'image/png'
        );
      } catch (err: any) {
        console.error('CyberCafe Studio processing failed:', err);
        setIsProcessing(false);
        onNotify('AI Notice', err?.message || 'Processing fallback used', 'info');
      }
    },
    [rawImage, hasWebGPU, onProcessedImage, onNotify]
  );

  // Toggle Face Enhancer
  const handleToggleFaceEnhance = () => {
    const nextState = !isFaceEnhanceActive;
    setIsFaceEnhanceActive(nextState);
    const activeColor = isCustomColorActive ? customColor : selectedBgColor;
    compositeAndEmit(nextState, isBgRemoved, activeColor);
    onNotify(
      nextState ? '⚡ AI Neural Face Restorer ON' : 'AI Face Enhancer OFF',
      nextState ? 'GFPGAN neural model: reconstructing eyes, lips, skin & facial clarity' : 'Reverted to natural raw photo',
      'success'
    );
  };

  // Toggle BG Remover
  const handleToggleBgRemover = () => {
    const nextState = !isBgRemoved;
    setIsBgRemoved(nextState);
    const activeColor = isCustomColorActive ? customColor : selectedBgColor;
    compositeAndEmit(isFaceEnhanceActive, nextState, activeColor);
    onNotify(
      nextState ? '🪄 AI Background Removed' : 'Original Background Restored',
      nextState ? 'Choose Transparent, Govt White, or Cyber Blue' : 'Original background active',
      'info'
    );
  };

  // Select Cyber Cafe Preset Color
  const handleSelectColor = (colorHex: string) => {
    setSelectedBgColor(colorHex);
    setIsCustomColorActive(false);
    if (!isBgRemoved) {
      setIsBgRemoved(true);
      compositeAndEmit(isFaceEnhanceActive, true, colorHex);
    } else {
      compositeAndEmit(isFaceEnhanceActive, true, colorHex);
    }
  };

  // Custom Color Change
  const handleCustomColorChange = (colorHex: string) => {
    setCustomColor(colorHex);
    setIsCustomColorActive(true);
    if (!isBgRemoved) {
      setIsBgRemoved(true);
      compositeAndEmit(isFaceEnhanceActive, true, colorHex);
    } else {
      compositeAndEmit(isFaceEnhanceActive, true, colorHex);
    }
  };

  // Reset all Studio Modifications
  const handleResetAll = () => {
    setIsFaceEnhanceActive(false);
    setIsBgRemoved(false);
    setSelectedBgColor('transparent');
    setIsCustomColorActive(false);
    maskCanvasRef.current = null;
    faceEnhancedCanvasRef.current = null;
    onProcessedImage(null);
    onNotify('Studio AI Reset', 'Restored original raw photo', 'info');
  };

  if (!rawImage) return null;

  const activeColor = isCustomColorActive ? customColor : selectedBgColor;

  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-2 sm:p-2.5 shadow-xs space-y-2 select-none ${className}`}
    >
      {/* Studio Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Zap className="w-3 h-3 fill-white" />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
            Cyber Cafe AI Studio
          </span>
          <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
            PRO RETOUCH
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isProcessing && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
              <span className="truncate max-w-[130px] sm:max-w-[180px] font-mono text-[9px]">
                {processingStage}
              </span>
            </div>
          )}

          {(isFaceEnhanceActive || isBgRemoved) && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isProcessing}
              className="px-2 py-0.5 rounded text-[10px] text-zinc-500 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1"
              title="Reset AI Retouch to Raw"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 1-Click AI Studio Buttons Row */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {/* 1. AI Face Enhancer Toggle */}
        <button
          type="button"
          onClick={handleToggleFaceEnhance}
          disabled={isProcessing}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            isFaceEnhanceActive
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Restore eyes, lips, teeth & natural skin details with GFPGAN Generative AI prior"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isFaceEnhanceActive ? 'fill-white' : 'text-amber-500'}`} />
          <span>AI Face Restore</span>
          <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
            {isFaceEnhanceActive ? 'ON' : 'AI'}
          </span>
        </button>

        {/* 2. AI BG Remover Toggle */}
        <button
          type="button"
          onClick={handleToggleBgRemover}
          disabled={isProcessing}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            isBgRemoved
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Cut out photo background and replace with transparent, official white, or cyber cafe blue"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Remove BG</span>
          <span className="text-[10px] opacity-80">{isBgRemoved ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Cyber Cafe Background Color Selector */}
      <div className="pt-0.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            BG Color:
          </span>
        </div>

        {/* Color Swatch Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CYBER_CAFE_COLORS.map((c) => {
            const isSelected = isBgRemoved && activeColor.toLowerCase() === c.color.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectColor(c.color)}
                disabled={isProcessing}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs font-semibold'
                    : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                }`}
                title={c.label}
              >
                {c.color === 'transparent' ? (
                  <span className="w-2.5 h-2.5 rounded-full border border-zinc-400 dark:border-zinc-500 bg-[linear-gradient(45deg,#bbb_25%,transparent_25%),linear-gradient(-45deg,#bbb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#bbb_75%),linear-gradient(-45deg,transparent_75%,#bbb_75%)] bg-[size:4px_4px] bg-[position:0_0,0_2px,2px_-2px,-2px_0] shrink-0" />
                ) : (
                  <span
                    className={`w-2.5 h-2.5 rounded-full border shrink-0 ${c.borderClass || 'border-zinc-300'}`}
                    style={{ backgroundColor: c.color }}
                  />
                )}
                <span>{c.name}</span>
                {isSelected && <Check className="w-2.5 h-2.5 shrink-0" />}
              </button>
            );
          })}

          {/* Custom Color Picker Input */}
          <label
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer border ${
              isCustomColorActive && isBgRemoved
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs font-semibold'
                : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
            }`}
            title="Custom Background Color"
          >
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-2.5 h-2.5 rounded-full cursor-pointer appearance-none border-0 p-0"
            />
            <span>Custom</span>
          </label>
        </div>
      </div>
    </div>
  );
};
