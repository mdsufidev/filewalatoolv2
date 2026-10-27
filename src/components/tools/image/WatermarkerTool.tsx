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
    if (ok) {
      onNotify('Copied to Clipboard', 'Watermarked photo copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
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
    if (shared) {
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
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header Section */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Client-Side Engine · Zero Uploads</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Image Watermarker
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Protect photos and artwork with custom copyright text, logo stamps, or repeating anti-theft diagonal tiles.
        </p>
      </div>

      {!currentImage ? (
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={(files) => loadFile(files[0])}
            title="Drop photo to watermark"
            description="JPEG, PNG, WebP supported · 100% Client-Side"
          />
        </div>
      ) : (
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
                  {resultBlob && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500 font-semibold">{formatBytes(resultBlob.size)}</span>
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
                <span>Change Photo</span>
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
                <span>Download Photo</span>
              </button>
            </div>
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              {/* Type Switcher */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setType('text')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    type === 'text'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Text Watermark
                </button>
                <button
                  onClick={() => setType('logo')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    type === 'logo'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Logo Image
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={resetImage} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Change Photo
              </Button>
            </div>

            {type === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. © 2026 Studio"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>

                <Slider
                  label="Font Scale"
                  value={fontSize}
                  min={16}
                  max={90}
                  unit="px"
                  onChange={setFontSize}
                />

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer p-0"
                    />
                    {['#ffffff', '#000000', '#f59e0b', '#ef4444'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className="w-6 h-6 rounded border border-zinc-300 dark:border-zinc-700 shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <input
                    type="checkbox"
                    checked={tileRepeat}
                    onChange={(e) => setTileRepeat(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Repeat diagonally across entire image (Tile Mode)
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Upload PNG Logo
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={handleLogoUpload}
                    className="text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900 hover:file:opacity-90 cursor-pointer"
                  />
                </div>

                <Slider
                  label="Logo Width Scale"
                  value={logoScale}
                  min={5}
                  max={60}
                  unit="%"
                  onChange={setLogoScale}
                />
              </div>
            )}

            <Slider
              label="Opacity"
              value={opacity}
              min={10}
              max={100}
              unit="%"
              onChange={setOpacity}
            />

            {!tileRepeat && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Anchor Position</label>
                <div className="grid grid-cols-3 gap-1.5 max-w-[200px]">
                  {(['top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right'] as Position[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={`h-8 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                        position === pos
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                      }`}
                    >
                      {pos.replace('bottom-', 'b-').replace('top-', 't-')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {resultBlob && (
              <div className="space-y-2">
                <Button
                  size="xl"
                  variant="primary"
                  onClick={handleDownload}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                  leftIcon={<Download className="w-5 h-5" />}
                >
                  Download Protected Photo ({formatBytes(resultBlob.size)})
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider block">
              Live Stamped Output
            </span>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950 p-4 flex items-center justify-center min-h-[380px]">
              {resultUrl && (
                <img
                  src={resultUrl}
                  alt="Watermarked Preview"
                  className="max-h-[380px] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId="watermark-image" />
    </div>
  );
};
