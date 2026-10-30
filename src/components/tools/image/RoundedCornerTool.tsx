import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, RefreshCw, Circle, Sparkles, Sliders, Copy, Share2, ShieldCheck } from 'lucide-react';
import { ImageToolGuideSection } from './ImageToolGuideSection';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { triggerFileDownload, formatBytes } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../../utils/clipboardAndShare';

export const RoundedCornerTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onNotify }) => {
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  const [radius, setRadius] = useState<number>(30); // percentage 0-50
  const [borderWidth, setBorderWidth] = useState<number>(0);
  const [borderColor, setBorderColor] = useState<string>('#ffffff');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render rounded image onto canvas
  useEffect(() => {
    if (!currentImage) return;

    const render = async () => {
      setIsProcessing(true);
      const img = currentImage.imageElement;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const minDim = Math.min(w, h);
      const r = (radius / 100) * minDim;

      // Optional background fill
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      // Rounded rectangle clipping path
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.arcTo(w, 0, w, r, r);
      ctx.lineTo(w, h - r);
      ctx.arcTo(w, h, w - r, h, r);
      ctx.lineTo(r, h);
      ctx.arcTo(0, h, 0, h - r, r);
      ctx.lineTo(0, r);
      ctx.arcTo(0, 0, r, 0, r);
      ctx.closePath();
      ctx.clip();

      // Draw image inside clip
      ctx.drawImage(img, 0, 0, w, h);

      // Draw border if requested
      if (borderWidth > 0) {
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth * (minDim / 400); // scaled border
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.arcTo(w, 0, w, r, r);
        ctx.lineTo(w, h - r);
        ctx.arcTo(w, h, w - r, h, r);
        ctx.lineTo(r, h);
        ctx.arcTo(0, h, 0, h - r, r);
        ctx.lineTo(0, r);
        ctx.arcTo(0, 0, r, 0, r);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();

      canvas.toBlob((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (blob) {
          if (resultUrl) URL.revokeObjectURL(resultUrl);
          const url = URL.createObjectURL(blob);
          setResultBlob(blob);
          setResultUrl(url);
        }
        setIsProcessing(false);
      }, 'image/png');
    };

    render();
  }, [currentImage, radius, borderWidth, borderColor, bgColor]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleDownload = useCallback(() => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(resultBlob, `${baseName}-rounded.png`);
    onNotify('Rounded Image Downloaded!', 'Saved as transparent PNG', 'success');
  }, [resultBlob, currentImage, onNotify]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Rounded image copied as transparent PNG. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [resultBlob, onNotify]);

  const handleShare = useCallback(async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-rounded.png`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Rounded Image',
      text: 'Created with FileWala Rounded Corner Tool.',
    });
    if (shared.shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
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
          onNotify('Reset', 'Cleared workspace.', 'info');
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
        if (resultBlob) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentImage, resultBlob, handleDownload, resetImage, onNotify]);

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
              Rounded Corner Image Maker
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Round image corners or generate circular avatar photos with custom border strokes and transparent background.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={(files) => loadFile(files[0])}
              title="Drop image to round corners"
              description="PNG, JPG, WebP supported · 100% Client-Side"
              className="h-[230px] sm:h-[260px] lg:h-[280px]"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {/* Active Workspace Top Header Bar */}
          <div className="flex items-center justify-between gap-2 px-1 py-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Rounded Corner Maker
              </span>
              <span className="hidden md:inline-block text-[11px] font-mono text-zinc-400 truncate max-w-[120px]">
                {currentImage.name}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400">
                ({currentImage.width}×{currentImage.height}px)
              </span>
            </div>

            <button
              onClick={resetImage}
              className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Change Image</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            {/* Left Column: Canvas Preview (lg:col-span-7 xl:col-span-8) - Equal Height */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
              <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between h-full gap-2.5 shadow-xs">
                <div className="flex items-center justify-between px-0.5 shrink-0">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Live Canvas Preview
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Transparent PNG Alpha
                  </span>
                </div>

                {/* Checkerboard background container */}
                <div
                  className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-2 flex items-center justify-center h-[380px] sm:h-[430px] lg:h-[480px] xl:h-[510px] flex-1 min-h-[360px] sm:min-h-[400px] lg:min-h-[460px] xl:min-h-[490px]"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
                    backgroundSize: `16px 16px`,
                    backgroundPosition: `0 0, 0 8px, 8px -8px, -8px 0px`,
                  }}
                >
                  {resultUrl && (
                    <img
                      src={resultUrl}
                      alt="Rounded preview"
                      className="max-h-[340px] sm:max-h-[390px] lg:max-h-[440px] xl:max-h-[470px] max-w-full object-contain drop-shadow-sm"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Controls & Download (lg:col-span-5 xl:col-span-4) - Equal Height */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
              <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between flex-1 space-y-3 shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Radius Settings
                    </span>
                    {resultBlob && (
                      <span className="text-[10px] font-mono font-semibold text-emerald-500">
                        {formatBytes(resultBlob.size)}
                      </span>
                    )}
                  </div>

              {/* Radius slider & quick presets */}
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                    <span>Corner Curvature</span>
                    <span className="font-mono text-zinc-400">{radius === 50 ? 'Circle' : `${radius}%`}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1">
                  {[10, 20, 30, 50].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadius(r)}
                      className={`py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer text-center ${
                        radius === r
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {r === 50 ? 'Circle' : `${r}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Stroke Width & Color */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                    <span>Border Stroke</span>
                    <span className="font-mono text-zinc-400">{borderWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>

                {borderWidth > 0 && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">Stroke Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer p-0"
                      />
                      {['#ffffff', '#000000', '#3b82f6', '#ef4444', '#10b981'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBorderColor(c)}
                          className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 shadow-xs cursor-pointer"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* Primary Download CTA Button (Red Brand CTA) */}
              <div className="pt-2 shrink-0">
                <button
                  type="button"
                  disabled={!resultBlob}
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Rounded PNG</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                  <button
                    type="button"
                    disabled={!resultBlob}
                    onClick={handleCopy}
                    className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Copy</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      disabled={!resultBlob}
                      onClick={handleShare}
                      className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                    >
                      <Share2 className="w-3 h-3 text-zinc-400" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <div className="pt-2">
        <ImageToolGuideSection toolId="round-corners" />
      </div>
    </div>
  );
};
