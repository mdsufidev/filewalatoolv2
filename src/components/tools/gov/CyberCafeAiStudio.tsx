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
  ShieldCheck,
} from 'lucide-react';
import { FaceEnhancerEngine, DEFAULT_ENHANCE_SETTINGS } from '../../../core/engine/FaceEnhancerEngine';
import { BriaRmbgWorkerClient } from '../../../core/engine/BriaRmbgWorkerClient';

export interface CyberCafeColorOption {
  id: string;
  name: string;
  color: string;
  label: string;
  borderClass?: string;
}

export const CYBER_CAFE_COLORS: CyberCafeColorOption[] = [
  { id: 'white', name: 'Govt White', color: '#ffffff', label: 'White (Official)', borderClass: 'border-zinc-300 dark:border-zinc-600' },
  { id: 'cyber-blue', name: 'Cyber Blue', color: '#0096ff', label: 'Sky Blue (CSC)', borderClass: 'border-blue-400' },
  { id: 'soft-blue', name: 'Soft Blue', color: '#bfe4ff', label: 'Pastel Blue', borderClass: 'border-sky-300' },
  { id: 'light-gray', name: 'Visa Gray', color: '#e5e7eb', label: 'Light Gray', borderClass: 'border-zinc-400' },
  { id: 'studio-red', name: 'Studio Maroon', color: '#7f1d1d', label: 'Maroon', borderClass: 'border-red-900' },
];

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
  const [selectedBgColor, setSelectedBgColor] = useState<string>('#ffffff');
  const [customColor, setCustomColor] = useState<string>('#0096ff');
  const [isCustomColorActive, setIsCustomColorActive] = useState<boolean>(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Cached intermediate cutout canvas to allow instant color changes without re-running AI
  const cutoutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceEnhancedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rmbgWorkerRef = useRef<BriaRmbgWorkerClient | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Check WebGPU on mount
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

  // Cleanup on unmount or when rawImage changes
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
    cutoutCanvasRef.current = null;
    faceEnhancedCanvasRef.current = null;
    setIsFaceEnhanceActive(false);
    setIsBgRemoved(false);
    setSelectedBgColor('#ffffff');
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

        // Step 1: Base Face Enhanced Canvas (if active) or original raw
        let workingBaseCanvas: HTMLCanvasElement;

        if (targetFaceEnhance) {
          if (!faceEnhancedCanvasRef.current) {
            setProcessingStage('AI Enhancing facial clarity & skin tones...');
            const temp = document.createElement('canvas');
            temp.width = w;
            temp.height = h;
            const tctx = temp.getContext('2d');
            if (!tctx) throw new Error('Failed to create canvas context');
            tctx.drawImage(rawImage, 0, 0);

            // Execute Samsung ProVisual Face Enhancement
            faceEnhancedCanvasRef.current = FaceEnhancerEngine.processImage(temp, {
              ...DEFAULT_ENHANCE_SETTINGS,
              deblur: 70,
              clarity: 60,
              smooth: 35,
              sharpness: 65,
              glow: 20,
              warmth: 6,
              brightness: 12,
              contrast: 18,
              eyeTeethClarity: 45,
              samsungVivid: true,
            });
            temp.width = 0;
            temp.height = 0;
          }
          workingBaseCanvas = faceEnhancedCanvasRef.current;
        } else {
          const temp = document.createElement('canvas');
          temp.width = w;
          temp.height = h;
          const tctx = temp.getContext('2d');
          if (tctx) tctx.drawImage(rawImage, 0, 0);
          workingBaseCanvas = temp;
        }

        // Step 2: Background Removal & Color Fill
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = w;
        finalCanvas.height = h;
        const fctx = finalCanvas.getContext('2d');
        if (!fctx) throw new Error('Canvas 2D context error');

        if (targetBgRemoved) {
          // Check if we need to compute cutout mask
          if (!cutoutCanvasRef.current) {
            setProcessingStage('AI Removing background (RMBG neural inference)...');
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

            // Bilinear mask upsample back to natural width/height
            const lowResMask = document.createElement('canvas');
            lowResMask.width = INPUT_SIZE;
            lowResMask.height = INPUT_SIZE;
            const lrCtx = lowResMask.getContext('2d');
            if (!lrCtx) throw new Error('Mask canvas error');

            const lrImgData = lrCtx.createImageData(INPUT_SIZE, INPUT_SIZE);
            const lr32 = new Uint32Array(lrImgData.data.buffer);
            const alphaArr = new Uint8Array(res.alphaBuffer);
            const total = INPUT_SIZE * INPUT_SIZE;
            for (let i = 0; i < total; i++) {
              lr32[i] = (alphaArr[i] << 24) | 0x00ffffff;
            }
            lrCtx.putImageData(lrImgData, 0, 0);

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = w;
            maskCanvas.height = h;
            const mctx = maskCanvas.getContext('2d');
            if (!mctx) throw new Error('Full mask error');
            mctx.imageSmoothingEnabled = true;
            mctx.imageSmoothingQuality = 'high';
            mctx.drawImage(lowResMask, 0, 0, w, h);
            lowResMask.width = 0;
            lowResMask.height = 0;

            // Generate Transparent Cutout
            const cutout = document.createElement('canvas');
            cutout.width = w;
            cutout.height = h;
            const cctx = cutout.getContext('2d');
            if (!cctx) throw new Error('Cutout error');
            cctx.drawImage(rawImage, 0, 0);
            cctx.globalCompositeOperation = 'destination-in';
            cctx.drawImage(maskCanvas, 0, 0);

            cutoutCanvasRef.current = cutout;
            maskCanvas.width = 0;
            maskCanvas.height = 0;
          }

          // Fill Cyber Cafe chosen background color
          fctx.fillStyle = targetColor;
          fctx.fillRect(0, 0, w, h);

          // Draw the subject cutout
          if (targetFaceEnhance && faceEnhancedCanvasRef.current) {
            // Apply mask to face enhanced canvas
            fctx.drawImage(cutoutCanvasRef.current, 0, 0);
            fctx.globalCompositeOperation = 'source-atop';
            fctx.drawImage(faceEnhancedCanvasRef.current, 0, 0);
            fctx.globalCompositeOperation = 'source-over';
          } else {
            fctx.drawImage(cutoutCanvasRef.current, 0, 0);
          }
        } else {
          // Only Face Enhancement active (keep original background)
          fctx.drawImage(workingBaseCanvas, 0, 0);
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
    compositeAndEmit(nextState, isBgRemoved, isCustomColorActive ? customColor : selectedBgColor);
    onNotify(
      nextState ? '⚡ AI Face Enhancer ON' : 'AI Face Enhancer OFF',
      nextState ? 'Samsung ProVisual clarity & skin smoothing active' : 'Reverted to natural photo',
      'success'
    );
  };

  // Toggle BG Remover
  const handleToggleBgRemover = () => {
    const nextState = !isBgRemoved;
    setIsBgRemoved(nextState);
    compositeAndEmit(isFaceEnhanceActive, nextState, isCustomColorActive ? customColor : selectedBgColor);
    onNotify(
      nextState ? '🪄 Background Removed' : 'Original Background Restored',
      nextState ? 'Select pure white or cyber cafe blue background' : 'Original background active',
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
    setSelectedBgColor('#ffffff');
    setIsCustomColorActive(false);
    cutoutCanvasRef.current = null;
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
              <span className="hidden md:inline truncate max-w-[120px]">{processingStage}</span>
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
          title="Enhance facial clarity, smooth skin & brighten eyes (Samsung ProVisual Engine)"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isFaceEnhanceActive ? 'fill-white' : 'text-amber-500'}`} />
          <span>AI Face Enhance</span>
          <span className="text-[10px] opacity-80">{isFaceEnhanceActive ? 'ON' : 'OFF'}</span>
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
          title="Cut out photo background and replace with official white or cyber cafe blue"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Remove BG</span>
          <span className="text-[10px] opacity-80">{isBgRemoved ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Cyber Cafe Background Color Selector (Shown when BG Remover is enabled or to enable it in 1 click) */}
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
                <span
                  className={`w-2.5 h-2.5 rounded-full border shrink-0 ${c.borderClass || 'border-zinc-300'}`}
                  style={{ backgroundColor: c.color }}
                />
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
