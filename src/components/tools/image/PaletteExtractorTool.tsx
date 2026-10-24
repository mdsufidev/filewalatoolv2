import React, { useState, useEffect, useRef } from 'react';
import { Pipette, Copy, Check, RefreshCw, Palette, Download } from 'lucide-react';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { useImageUpload } from '../../../hooks/useImageUpload';

interface ColorSwatch {
  hex: string;
  rgb: string;
  hsl: string;
  count: number;
}

export const PaletteExtractorTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onNotify }) => {
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();

  const [palette, setPalette] = useState<ColorSwatch[]>([]);
  const [hoveredColor, setHoveredColor] = useState<{ hex: string; x: number; y: number } | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDisplayRef = useRef<HTMLImageElement>(null);

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
    setTimeout(() => setCopiedHex(null), 2000);
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

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(currentImage.imageElement, naturalX, naturalY, 1, 1, 0, 0, 1, 1);
    const p = ctx.getImageData(0, 0, 1, 1).data;
    const hex = rgbToHex(p[0], p[1], p[2]);

    setHoveredColor({ hex, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-1.5 max-w-xl mx-auto">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950">
          Color Palette Extractor (Image Color Picker)
        </h3>
        <p className="text-xs text-zinc-500 font-medium">
          Target Keyword: <em>Extract color palette from image / Image color picker</em>
        </p>
        <p className="text-xs text-zinc-400">
          Ideal for UI/UX designers and frontend developers to extract dominant brand colors, inspect pixels, and copy ready-to-use CSS variables.
        </p>
      </div>

      {!currentImage ? (
        <Dropzone
          onFilesSelected={(files) => loadFile(files[0])}
          title="Drop image to extract color palette"
          description="PNG, JPG, WebP, SVG supported"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Swatches (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Dominant Palette ({palette.length})
              </span>
              <Button variant="outline" size="sm" onClick={resetImage} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Change Photo
              </Button>
            </div>

            <div className="space-y-2">
              {palette.map((swatch, idx) => {
                const isCopied = copiedHex === swatch.hex;
                return (
                  <div
                    key={`${swatch.hex}-${idx}`}
                    onClick={() => handleCopyHex(swatch.hex)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg border border-zinc-300 shadow-xs group-hover:scale-105 transition-transform shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <div>
                        <span className="text-xs font-mono font-bold text-zinc-900 block">
                          {swatch.hex}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {swatch.rgb}
                        </span>
                      </div>
                    </div>

                    <button className="text-xs text-zinc-400 group-hover:text-zinc-900 inline-flex items-center gap-1">
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-medium">{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <Button
              size="md"
              variant="secondary"
              onClick={handleCopyCssVariables}
              className="w-full"
              leftIcon={<Palette className="w-4 h-4 text-purple-600" />}
            >
              Copy as CSS Variables (:root)
            </Button>
          </div>

          {/* Interactive Image Display & Eyedropper (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Pipette className="w-3.5 h-3.5 text-blue-600" />
                Hover Eyedropper Inspector
              </span>
              {hoveredColor && (
                <div className="flex items-center gap-2 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-mono font-bold">
                  <div className="w-3.5 h-3.5 rounded-full border border-zinc-300" style={{ backgroundColor: hoveredColor.hex }} />
                  <span>{hoveredColor.hex}</span>
                </div>
              )}
            </div>

            <div className="relative rounded-xl border border-zinc-200 bg-zinc-100/50 p-4 flex items-center justify-center min-h-[380px] overflow-hidden">
              <img
                ref={imageDisplayRef}
                src={currentImage.previewUrl}
                alt="Source"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredColor(null)}
                className="max-h-[420px] max-w-full object-contain rounded-lg shadow-sm cursor-crosshair"
              />
            </div>
            <p className="text-[11px] text-center text-zinc-400">
              Move cursor over any pixel in the photo to inspect its exact color hex value.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
