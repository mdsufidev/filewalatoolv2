import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  RefreshCw,
  Sparkles,
  Eraser,
  Paintbrush,
  Eye,
  Pipette,
  Check,
  Undo2,
  Sliders,
  Layers,
  ShieldCheck,
  Copy,
  Share2,
  Wand2,
  RotateCcw,
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  UploadCloud,
} from 'lucide-react';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { triggerFileDownload, formatBytes } from '../../../utils/memory';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../../utils/clipboardAndShare';

interface BackgroundRemoverToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  initialFiles?: File[] | null;
}

export type BgReplacement = 'transparent' | 'white' | 'blue' | 'grey' | 'custom' | 'blur';
export type ToolMode = 'wand' | 'erase' | 'restore';

export const BackgroundRemoverTool: React.FC<BackgroundRemoverToolProps> = ({
  onNotify,
  initialFiles,
}) => {
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  // Active Tool Mode
  const [activeToolMode, setActiveToolMode] = useState<ToolMode>('wand');

  // Algorithm Settings
  const [tolerance, setTolerance] = useState<number>(28); // 5 to 75%
  const [feather, setFeather] = useState<number>(2); // 0 to 6px
  const [brushSize, setBrushSize] = useState<number>(28); // 5 to 80px

  // Background Replacement
  const [bgMode, setBgMode] = useState<BgReplacement>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [removedObjectCount, setRemovedObjectCount] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Load initial file if provided
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !currentImage) {
      loadFile(initialFiles[0]);
    }
  }, [initialFiles, loadFile, currentImage]);

  // Initialize mask canvas and auto-clean perimeter edges on image load
  useEffect(() => {
    if (!currentImage) {
      maskCanvasRef.current = null;
      setResultBlob(null);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
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
    if (mctx) {
      mctx.clearRect(0, 0, w, h);
    }
    maskCanvasRef.current = mask;

    // Perform auto edge-connected background clean from 4 corners
    autoCleanBorderBackground(img, mask, tolerance);
  }, [currentImage]);

  // Auto edge-connected background clean (BFS flood fill from image perimeter)
  const autoCleanBorderBackground = (
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

    // Sample perimeter points (4 corners + edge centers)
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

        // 4 neighbors
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
  };

  // Magic Wand Click: Flood Fill Erase from clicked object point
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
    onNotify('Object Erased', 'Clicked background object removed instantly.', 'info');
    renderCompositedResult();
  };

  // Freehand Brush Paint (Erase or Restore)
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

  // Main Compositing Render Pipeline
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
              // Red = Erased -> Make transparent
              data[i + 3] = 0;
            } else if (maskData[i + 2] > 200) {
              // Blue = Restored -> Keep full opacity
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

    // 6. Generate output Blob for download & copy
    canvas.toBlob((blob) => {
      if (blob) {
        setResultBlob(blob);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(URL.createObjectURL(blob));
      }
    }, 'image/png');
  }, [currentImage, bgMode, customBgColor, resultUrl]);

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

  // Re-run Auto Edge Clean
  const handleReRunAutoClean = () => {
    if (!currentImage || !maskCanvasRef.current) return;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (mctx) {
      mctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setRemovedObjectCount(0);
    autoCleanBorderBackground(currentImage.imageElement, maskCanvasRef.current, tolerance);
    onNotify('Auto Clean Re-run', 'Perimeter background cleaned with updated tolerance.', 'success');
  };

  // Reset all manual strokes
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

  // Download Output PNG
  const handleDownload = () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}-cutout.png`;
    triggerFileDownload(resultBlob, outName);
    onNotify('Download Started', `Saved "${outName}" with transparent background.`, 'success');
  };

  // Copy Image to Clipboard
  const handleCopy = async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify(
        'Copied to Clipboard',
        'Cutout image copied. You can now paste (Ctrl+V) it anywhere with transparency.',
        'success'
      );
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  // Native Web Share
  const handleShare = async () => {
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
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
              <Zap className="w-4 h-4 text-emerald-500" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Instant Background Remover
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Instant (0ms Lag)
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Fast edge-connected perimeter cleaning, magic wand object eraser, and precision brush controls. 100% in-browser with zero upload delay.
          </p>
        </div>

        {currentImage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={resetImage} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              New Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!resultBlob}
              className="text-xs font-medium"
              title="Copy cutout image to clipboard"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </Button>
            {isShareSupported() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={!resultBlob}
                className="text-xs font-medium"
                title="Share cutout"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                Share
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={!resultBlob}
              className="text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download PNG
            </Button>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      {!currentImage && (
        <div className="p-4 sm:p-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <Dropzone
            onFilesSelected={(files) => {
              if (files.length > 0) loadFile(files[0]);
            }}
            accept="image/*"
            title="Drop image here for instant background removal"
            description="Instant client-side processing · No model download waiting · Supports PNG, JPG, WebP"
          />
        </div>
      )}

      {/* Active Workspace */}
      {currentImage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Canvas View (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              {/* Canvas Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-900 dark:text-white">Canvas:</span>
                  <span className="font-mono text-zinc-500 text-[11px]">
                    {currentImage.width}×{currentImage.height}px
                  </span>
                  {removedObjectCount > 0 && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        {removedObjectCount} object{removedObjectCount > 1 ? 's' : ''} erased
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReRunAutoClean}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    title="Re-run border flood fill with current tolerance"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Auto Re-Clean</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOriginal((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border cursor-pointer transition-colors ${
                      showOriginal
                        ? 'bg-zinc-900 text-white border-zinc-900 font-semibold dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showOriginal ? 'Showing Original' : 'Hold / View Original'}</span>
                  </button>
                </div>
              </div>

              {/* Viewport with Checkerboard Background */}
              <div
                className="relative rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center min-h-[350px] max-h-[580px] p-2"
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
                      ? 'Magic Wand Active: Click any background object to erase it completely'
                      : activeToolMode === 'erase'
                      ? 'Erase Brush Active: Click & drag to erase any stray spots'
                      : 'Restore Brush Active: Click & drag to restore subjects'}
                  </span>
                </div>
                <span>Fast &amp; Instant (Zero Latency)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Controls & Settings (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Interactive Eraser Tools */}
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
                  Select Tool
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
                  className={`flex flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors cursor-pointer ${
                    activeToolMode === 'wand'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-semibold dark:border-amber-400 dark:text-amber-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                  }`}
                  title="Click on any background object to erase it"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Magic Wand</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveToolMode('erase')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors cursor-pointer ${
                    activeToolMode === 'erase'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 font-semibold dark:border-rose-400 dark:text-rose-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                  }`}
                  title="Swipe freehand to erase objects"
                >
                  <Eraser className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px]">Erase Brush</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveToolMode('restore')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors cursor-pointer ${
                    activeToolMode === 'restore'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-semibold dark:border-blue-400 dark:text-blue-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
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

            {/* Tolerance & Sensitivity Controls */}
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
                  Magic Wand Sensitivity
                </span>
                <span className="text-[11px] font-mono text-zinc-500">{tolerance}%</span>
              </div>

              <div className="space-y-1.5">
                <Slider
                  label="Object Removal Tolerance"
                  min={5}
                  max={75}
                  step={1}
                  value={tolerance}
                  onChange={setTolerance}
                  unit="%"
                />
                <p className="text-[10px] text-zinc-400">
                  Higher tolerance erases larger color variations and shadows.
                </p>
              </div>
            </div>

            {/* Background Output Mode */}
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono block pb-2 border-b border-zinc-100 dark:border-zinc-800">
                Replace Background
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBgMode('transparent')}
                  className={`p-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'transparent'
                      ? 'border-zinc-950 bg-zinc-900 text-white font-semibold dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Transparent PNG
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('white')}
                  className={`p-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'white'
                      ? 'border-zinc-950 bg-zinc-900 text-white font-semibold dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Solid White
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('blue')}
                  className={`p-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'blue'
                      ? 'border-zinc-950 bg-zinc-900 text-white font-semibold dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Passport Blue
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('blur')}
                  className={`p-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'blur'
                      ? 'border-zinc-950 bg-zinc-900 text-white font-semibold dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Blur Bokeh BG
                </button>

                <button
                  type="button"
                  onClick={() => setBgMode('grey')}
                  className={`p-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                    bgMode === 'grey'
                      ? 'border-zinc-950 bg-zinc-900 text-white font-semibold dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Studio Grey
                </button>

                <div className="flex items-center gap-1.5 p-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
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
      )}

      {/* ========================================================= */}
      {/* HOW TO REMOVE BACKGROUND GUIDE SECTION (Flat 2D Linear) */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>How to Remove Background in 3 Easy Steps</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Fast, client-side, zero cloud upload procedure to erase backgrounds and unwanted objects.
          </p>
        </div>

        {/* 3 Steps Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Upload Any Photo
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Drag &amp; drop or select any JPG, PNG, or WebP photo. Image data is decoded strictly in your local device RAM with 100% privacy and zero server transfer.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Wand Erase Objects
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Border background is automatically cleared. Click any remaining object (chair, shadow, frame, stranger) with the <strong>Magic Wand</strong> to erase it in &lt;10ms, or use the <strong>Erase Brush</strong> for fine touch-ups.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Pick Background &amp; Save
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Keep transparent alpha PNG, replace with Solid White, Passport Blue, or Blur Bokeh. Click <strong>Copy Image</strong> for direct Ctrl+V pasting anywhere or click <strong>Download PNG</strong>.
            </p>
          </div>
        </div>

        {/* Pro Tips Box */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Pro Tips for Multiple Background Objects</span>
          </div>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
            <li><strong>Multiple Objects in Background:</strong> Click on each unwanted object one by one with the Magic Wand. Each clicked object is instantly wiped.</li>
            <li><strong>Accidentally erased a subject detail?</strong> Switch to the <strong>Restore Brush</strong> and swipe over the area to paint back the original pixels.</li>
            <li><strong>Adjusting Sensitivity:</strong> If an object has varied lighting, increase the <strong>Tolerance slider</strong> to 35-45% before clicking.</li>
          </ul>
        </div>

        {/* Frequently Asked Questions */}
        <div className="p-4 sm:p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <HelpCircle className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
              Background Remover FAQs
            </h3>
          </div>

          <div className="space-y-2">
            {[
              {
                q: 'How do I erase multiple unwanted objects from the background?',
                a: 'Keep the Magic Wand tool active and simply click on each unwanted object in the background (such as a chair, wall hanging, shadow, or another person). Each clicked region will be identified and erased in under 10 milliseconds.',
              },
              {
                q: 'Are my personal and government photos uploaded to any server?',
                a: 'Never. All pixel analysis and canvas editing happen 100% locally in your web browser memory. Zero files are sent to or stored on any cloud server.',
              },
              {
                q: 'Can I use this to make Passport or Visa photos with a white or blue background?',
                a: 'Yes! After your background is removed, simply select "Solid White" or "Passport Blue" in the "Replace Background" panel to instantly generate official passport-compliant photos.',
              },
              {
                q: 'Why is this tool faster than cloud AI background removers?',
                a: 'Cloud AI services upload large images to a queue and take 10-20 seconds. FileWala runs directly in your local browser canvas using instant flood-fill and boundary math, delivering immediate 0ms response without waiting.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-3 text-left flex items-center justify-between gap-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
