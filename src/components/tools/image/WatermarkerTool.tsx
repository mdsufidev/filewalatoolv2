import React, { useState, useEffect, useCallback } from 'react';
import { Type, Image as ImageIcon, Download, RefreshCw, Sparkles, Grid, Copy, Share2, ShieldCheck } from 'lucide-react';
import { ImageToolGuideSection } from './ImageToolGuideSection';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { triggerFileDownload, formatBytes } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { CanvasEngine } from '../../../core/engine/CanvasEngine';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../../utils/clipboardAndShare';

type WatermarkType = 'text' | 'logo';
type Position = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const WatermarkerTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  const [type, setType] = useState<WatermarkType>('text');
  const [text, setText] = useState<string>('© Copyright 2026');
  const [fontSize, setFontSize] = useState<number>(36);
  const [opacity, setOpacity] = useState<number>(75);
  const [color, setColor] = useState<string>('#ffffff');
  const [position, setPosition] = useState<Position>('bottom-right');
  const [tileRepeat, setTileRepeat] = useState<boolean>(false);

  // Logo file state
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [logoScale, setLogoScale] = useState<number>(20); // 10% to 50% of image width

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = await CanvasEngine.loadImage(file);
      setLogoImg(img);
    } catch {
      onNotify('Invalid Logo Image', 'Could not load selected logo file', 'error');
    }
  };

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!currentImage) return;

    const render = async () => {
      const img = currentImage.imageElement;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill white background for JPEG so transparent PNG areas don't turn black
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw base image
      ctx.drawImage(img, 0, 0);

      const alpha = opacity / 100;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (type === 'text') {
        const scaledFontSize = Math.max(14, Math.round(fontSize * (canvas.width / 1200)));
        ctx.font = `bold ${scaledFontSize}px system-ui, sans-serif`;
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        if (tileRepeat) {
          // Diagonal repeat watermark pattern across whole photo
          ctx.rotate((-25 * Math.PI) / 180);
          const stepX = scaledFontSize * 8;
          const stepY = scaledFontSize * 4;
          for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
            for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
              ctx.fillText(text, x, y);
            }
          }
        } else {
          // Specific Anchor Position
          const metrics = ctx.measureText(text);
          const textW = metrics.width;
          const textH = scaledFontSize;
          const padding = 36 * (canvas.width / 1200);

          let x = padding;
          let y = padding + textH;

          if (position === 'top-center') x = (canvas.width - textW) / 2;
          if (position === 'top-right') x = canvas.width - textW - padding;
          if (position === 'center') {
            x = (canvas.width - textW) / 2;
            y = (canvas.height + textH) / 2;
          }
          if (position === 'bottom-left') y = canvas.height - padding;
          if (position === 'bottom-center') {
            x = (canvas.width - textW) / 2;
            y = canvas.height - padding;
          }
          if (position === 'bottom-right') {
            x = canvas.width - textW - padding;
            y = canvas.height - padding;
          }

          ctx.fillText(text, x, y);
        }
      } else if (type === 'logo' && logoImg) {
        // Logo watermark
        const targetW = (canvas.width * (logoScale / 100));
        const targetH = targetW * (logoImg.naturalHeight / logoImg.naturalWidth);
        const padding = 36 * (canvas.width / 1200);

        let x = padding;
        let y = padding;

        if (position === 'top-center') x = (canvas.width - targetW) / 2;
        if (position === 'top-right') x = canvas.width - targetW - padding;
        if (position === 'center') {
          x = (canvas.width - targetW) / 2;
          y = (canvas.height - targetH) / 2;
        }
        if (position === 'bottom-left') y = canvas.height - targetH - padding;
        if (position === 'bottom-center') {
          x = (canvas.width - targetW) / 2;
          y = canvas.height - targetH - padding;
        }
        if (position === 'bottom-right') {
          x = canvas.width - targetW - padding;
          y = canvas.height - targetH - padding;
        }

        ctx.drawImage(logoImg, x, y, targetW, targetH);
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
      }, 'image/jpeg', 0.95);
    };

    render();
  }, [currentImage, type, text, fontSize, opacity, color, position, tileRepeat, logoImg, logoScale]);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleDownload = useCallback(() => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(resultBlob, `${baseName}-watermarked.jpg`);
    onNotify('Watermarked Photo Saved!', '', 'success');
  }, [resultBlob, currentImage, onNotify]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Watermarked photo copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [resultBlob, onNotify]);

  const handleShare = useCallback(async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-watermarked.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Watermarked Photo',
      text: 'Photo protected with FileWala Watermarker.',
    });
    if (shared.shared) {
      onNotify('Shared', 'Photo shared successfully.', 'success');
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
          onNotify('Reset', 'Cleared workspace.');
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
              Image Watermarker
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Protect photos and artwork with custom copyright text, logo stamps, or repeating anti-theft diagonal tiles.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={(files) => loadFile(files[0])}
              title="Drop photo to watermark"
              description="JPEG, PNG, WebP supported · 100% Client-Side"
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
                Image Watermarker
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
              <span>Change Photo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            {/* Left Column: Live Preview Canvas (lg:col-span-7 xl:col-span-8) - Equal Height */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
              <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between h-full gap-2.5 shadow-xs">
                <div className="flex items-center justify-between px-0.5 shrink-0">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Live Stamped Output
                  </span>
                  {resultBlob && (
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                      {formatBytes(resultBlob.size)}
                    </span>
                  )}
                </div>

                <div
                  className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 p-2 flex items-center justify-center h-[260px] sm:h-[300px] lg:h-auto flex-1 min-h-[220px]"
                  style={{
                    backgroundImage: isDark
                      ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                      : 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  {resultUrl && (
                    <img
                      src={resultUrl}
                      alt="Watermarked Preview"
                      className="max-h-[250px] sm:max-h-[280px] lg:max-h-[300px] max-w-full object-contain rounded-md shadow-xs"
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
                    {/* Type Switcher */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setType('text')}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      type === 'text'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setType('logo')}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      type === 'logo'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Logo
                  </button>
                </div>

                <span className="text-[10px] font-mono text-zinc-400">Opacity: {opacity}%</span>
              </div>

              {type === 'text' ? (
                <div className="space-y-1.5">
                  <div>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. © 2026 Studio"
                      className="w-full px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                        <span>Font Size</span>
                        <span className="font-mono text-zinc-400">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={16}
                        max={90}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                        <span>Opacity</span>
                        <span className="font-mono text-zinc-400">{opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer p-0"
                      />
                      {['#ffffff', '#000000', '#f59e0b', '#ef4444'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 shadow-xs cursor-pointer"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={tileRepeat}
                        onChange={(e) => setTileRepeat(e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        Tile Repeat
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={handleLogoUpload}
                    className="text-[11px] text-zinc-600 dark:text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-900 file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900 cursor-pointer w-full"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                        <span>Logo Scale</span>
                        <span className="font-mono text-zinc-400">{logoScale}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        value={logoScale}
                        onChange={(e) => setLogoScale(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                        <span>Opacity</span>
                        <span className="font-mono text-zinc-400">{opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!tileRepeat && (
                <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Position</span>
                  <div className="grid grid-cols-7 gap-1">
                    {(['top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right'] as Position[]).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setPosition(pos)}
                        className={`py-1 rounded text-[9px] font-mono transition-colors cursor-pointer text-center truncate ${
                          position === pos
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-semibold'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                        }`}
                      >
                        {pos.replace('bottom-', 'B-').replace('top-', 'T-').replace('center', 'CTR')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              </div>{/* end space-y-2.5 */}

              {/* Primary Download CTA Button */}
              <div className="pt-2 shrink-0">
                <button
                  type="button"
                  disabled={!resultBlob}
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Watermarked Photo</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5 pt-2">
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
        <ImageToolGuideSection toolId="watermark-image" />
      </div>
    </div>
  );
};
