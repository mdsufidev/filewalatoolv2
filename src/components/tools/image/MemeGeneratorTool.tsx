import React, { useState, useEffect, useCallback } from 'react';
import { Type, Download, RefreshCw, Sparkles, Smile, Copy, Share2, ShieldCheck } from 'lucide-react';
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

export const MemeGeneratorTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  const [topText, setTopText] = useState<string>('WHEN THE CODE COMPILES');
  const [bottomText, setBottomText] = useState<string>('ON THE FIRST TRY');
  const [fontSize, setFontSize] = useState<number>(48);
  const [isUppercase, setIsUppercase] = useState<boolean>(true);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState<number>(6);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentImage) return;

    const render = () => {
      const img = currentImage.imageElement;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill white background for JPEG so transparent PNG areas don't turn black
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw base photo
      ctx.drawImage(img, 0, 0);

      // Scale font relative to canvas width
      const scaledSize = Math.max(18, Math.round(fontSize * (canvas.width / 800)));
      ctx.font = `900 ${scaledSize}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(2, strokeWidth * (canvas.width / 800));
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      const top = isUppercase ? topText.toUpperCase() : topText;
      const bottom = isUppercase ? bottomText.toUpperCase() : bottomText;

      // Draw Top Text
      if (top) {
        const x = canvas.width / 2;
        const y = scaledSize + 20;
        ctx.strokeText(top, x, y);
        ctx.fillText(top, x, y);
      }

      // Draw Bottom Text
      if (bottom) {
        const x = canvas.width / 2;
        const y = canvas.height - 24;
        ctx.strokeText(bottom, x, y);
        ctx.fillText(bottom, x, y);
      }

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
  }, [currentImage, topText, bottomText, fontSize, isUppercase, textColor, strokeWidth]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(resultBlob, `${baseName}-meme.jpg`);
    onNotify('Meme Downloaded!', 'Ready to share on social media', 'success');
  }, [resultBlob, currentImage, onNotify]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Meme copied as image! You can now paste (Ctrl+V) directly into Twitter, Discord, WhatsApp, etc.', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [resultBlob, onNotify]);

  const handleShare = useCallback(async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-meme.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Meme',
      text: 'Created with FileWala Meme Generator.',
    });
    if (shared.shared) {
      onNotify('Shared', 'Meme shared successfully.', 'success');
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
      {/* Header Section */}
      {!currentImage ? (
        <div className="space-y-3 sm:space-y-3.5">
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Client-Side Engine · Zero Uploads</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Meme Generator
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Generate iconic memes and bold social captions with classic Impact typography and black outline strokes.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={(files) => loadFile(files[0])}
              title="Drop image to generate meme"
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
                Meme Generator
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
            {/* Left Column: Canvas Preview (lg:col-span-7 xl:col-span-8) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between h-full gap-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Live Meme Preview
                </span>
                {resultBlob && (
                  <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {formatBytes(resultBlob.size)}
                  </span>
                )}
              </div>

              <div
                className="relative rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 h-[380px] sm:h-[430px] lg:h-[480px] xl:h-[510px] flex-1 min-h-[360px] sm:min-h-[400px] lg:min-h-[460px] xl:min-h-[490px] flex items-center justify-center p-2.5 overflow-hidden select-none"
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
                    alt="Meme Preview"
                    className="max-h-[340px] sm:max-h-[390px] lg:max-h-[440px] xl:max-h-[470px] max-w-full object-contain rounded-lg shadow-sm"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Client-side generation · 0 bytes uploaded
                </span>
                <span className="font-mono">{fontSize}px font</span>
              </div>
            </div>

            {/* Right Column: Controls & Download (lg:col-span-5 xl:col-span-4) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
              <div className="p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors bg-white dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Captions &amp; Text
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">{fontSize}px font</span>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <input
                        type="text"
                        value={topText}
                        onChange={(e) => setTopText(e.target.value)}
                        placeholder="TOP TEXT..."
                        className="w-full px-2.5 py-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        value={bottomText}
                        onChange={(e) => setBottomText(e.target.value)}
                        placeholder="BOTTOM TEXT..."
                        className="w-full px-2.5 py-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5">
                        <span>Font Size</span>
                        <span className="font-mono text-zinc-400">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={24}
                        max={80}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300 select-none">
                        <input
                          type="checkbox"
                          checked={isUppercase}
                          onChange={(e) => setIsUppercase(e.target.checked)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-3.5 h-3.5"
                        />
                        <span>Force ALL CAPS</span>
                      </label>

                      <div className="flex items-center gap-1">
                        {['#FFFFFF', '#FFEB3B', '#FF5722', '#4CAF50'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTextColor(c)}
                            className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shadow-xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Download CTA Button */}
                <div className="pt-2 shrink-0">
                  <button
                    type="button"
                    disabled={!resultBlob}
                    onClick={handleDownload}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Meme</span>
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
        <ImageToolGuideSection toolId="meme-generator" />
      </div>
    </div>
  );
};
