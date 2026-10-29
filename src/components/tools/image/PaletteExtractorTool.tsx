import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, Copy, Check, RefreshCw, Palette, Download, ShieldCheck } from 'lucide-react';
import { ImageToolGuideSection } from './ImageToolGuideSection';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useTheme } from '../../../core/themeContext';

interface ColorSwatch {
  hex: string;
  rgb: string;
  hsl: string;
  count: number;
}

export const PaletteExtractorTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  const [palette, setPalette] = useState<ColorSwatch[]>([]);
  const [hoveredColor, setHoveredColor] = useState<{ hex: string; x: number; y: number } | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDisplayRef = useRef<HTMLImageElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Extract dominant palette on image load using canvas sampling
  useEffect(() => {
    if (!currentImage) return;

    const img = currentImage.imageElement;
    const canvas = document.createElement('canvas');
    // Scale down for fast sampling
    const sampleSize = 120;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    canvas.width = 0;
    canvas.height = 0;

    // Color quantization map (round to buckets of 16 to group similar shades)
    const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number } } = {};

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      // Ignore fully transparent or extreme near-white/near-black noise if desired
      if (a < 128) continue;

      const qR = Math.round(r / 24) * 24;
      const qG = Math.round(g / 24) * 24;
      const qB = Math.round(b / 24) * 24;
      const key = `${qR},${qG},${qB}`;

      if (!colorCounts[key]) {
        colorCounts[key] = { r: qR, g: qG, b: qB, count: 0 };
      }
      colorCounts[key].count++;
    }

    const sorted = Object.values(colorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const swatches: ColorSwatch[] = sorted.map((c) => {
      const hex = rgbToHex(c.r, c.g, c.b);
      const rgb = `rgb(${c.r}, ${c.g}, ${c.b})`;
      const hsl = rgbToHsl(c.r, c.g, c.b);
      return { hex, rgb, hsl, count: c.count };
    });

    setPalette(swatches);
    onNotify('Palette Extracted!', `Found ${swatches.length} dominant colors.`, 'success');
  }, [currentImage]);

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedHex(null), 2000);
    onNotify('Hex Code Copied!', hex, 'info');
  };

  const handleCopyCssVariables = () => {
    if (palette.length === 0) return;
    const cssVars = palette.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n');
    const fullCss = `:root {\n${cssVars}\n}`;
    navigator.clipboard.writeText(fullCss);
    onNotify('CSS Variables Copied!', 'Pasted ready for your stylesheets', 'success');
  };

  // Eyedropper hover over image
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const imgEl = imageDisplayRef.current;
    if (!imgEl || !currentImage) return;

    const rect = imgEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const naturalX = Math.round((x / rect.width) * currentImage.width);
    const naturalY = Math.round((y / rect.height) * currentImage.height);

    if (!sampleCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      sampleCanvasRef.current = c;
    }
    const canvas = sampleCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(currentImage.imageElement, naturalX, naturalY, 1, 1, 0, 0, 1, 1);
    const p = ctx.getImageData(0, 0, 1, 1).data;
    const hex = rgbToHex(p[0], p[1], p[2]);

    setHoveredColor({ hex, x: e.clientX, y: e.clientY });
  };

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

      if (e.key === 'c' || e.key === 'C' || e.key === 'Enter') {
        if (palette.length > 0) {
          e.preventDefault();
          handleCopyCssVariables();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentImage, palette.length, handleCopyCssVariables, resetImage, onNotify]);

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
              Color Palette Extractor
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Extract dominant color swatches, sample pixel colors with live eyedropper, and export ready-to-use CSS variables.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={(files) => loadFile(files[0])}
              title="Drop image to extract color palette"
              description="PNG, JPG, WebP, SVG supported · 100% Client-Side"
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
                Color Palette Extractor
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
            {/* Left Column: Interactive Image & Eyedropper (lg:col-span-7 xl:col-span-8) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between h-full gap-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Pipette className="w-3.5 h-3.5 text-blue-500" />
                  <span>Interactive Eyedropper</span>
                </span>
                {hoveredColor ? (
                  <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700">
                    <div className="w-2.5 h-2.5 rounded-full border border-zinc-300 dark:border-zinc-600 shadow-xs" style={{ backgroundColor: hoveredColor.hex }} />
                    <span>{hoveredColor.hex}</span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-zinc-400">Hover canvas to sample pixel color</span>
                )}
              </div>

              <div
                className="relative rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 h-[260px] sm:h-[300px] lg:h-auto flex-1 min-h-[220px] flex items-center justify-center p-2.5 overflow-hidden select-none"
                style={{
                  backgroundImage: isDark
                    ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                    : 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <img
                  ref={imageDisplayRef}
                  src={currentImage.previewUrl}
                  alt="Source"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredColor(null)}
                  className="max-h-[250px] sm:max-h-[280px] lg:max-h-[300px] max-w-full object-contain rounded-lg shadow-sm cursor-crosshair"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Client-side pixel sampling active
                </span>
                <span className="font-mono">{palette.length} dominant colors detected</span>
              </div>
            </div>

            {/* Right Column: Extracted Palette Swatches (lg:col-span-5 xl:col-span-4) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
              <div className="p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors bg-white dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Dominant Palette ({palette.length})
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Click swatch to copy</span>
                  </div>

                  {/* Swatches Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {palette.map((swatch, idx) => {
                      const isCopied = copiedHex === swatch.hex;
                      return (
                        <button
                          key={`${swatch.hex}-${idx}`}
                          type="button"
                          onClick={() => handleCopyHex(swatch.hex)}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-750 transition-all cursor-pointer group text-left"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className="w-5 h-5 rounded-md border border-zinc-300 dark:border-zinc-700 shadow-xs shrink-0"
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-mono font-bold text-zinc-900 dark:text-white block truncate">
                                {swatch.hex}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white ml-1">
                            {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Button: Copy CSS Variables */}
                <div className="pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyCssVariables}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Palette className="w-4 h-4" />
                    <span>Copy CSS Variables (:root)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <div className="pt-2">
        <ImageToolGuideSection toolId="color-palette" />
      </div>
    </div>
  );
};
