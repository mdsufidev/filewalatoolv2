import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Circle, Sparkles, Sliders, Copy, Share2 } from 'lucide-react';
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

  const handleDownload = () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(resultBlob, `${baseName}-rounded.png`);
    onNotify('Rounded Image Downloaded!', 'Saved as transparent PNG', 'success');
  };

  const handleCopy = async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Rounded image copied as transparent PNG. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-rounded.png`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Rounded Image',
      text: 'Created with FileWala Rounded Corner Tool.',
    });
    if (shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-1.5 max-w-xl mx-auto">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950">
          Rounded Corner Image Maker
        </h3>
        <p className="text-xs text-zinc-500 font-medium">
          Target Keyword: <em>Add border radius to image / Round image corners online</em>
        </p>
        <p className="text-xs text-zinc-400">
          Craft sleek UI screenshots, smooth mockups, or perfect 50% circle social media avatar profile pictures with transparent corners.
        </p>
      </div>

      {!currentImage ? (
        <Dropzone
          onFilesSelected={(files) => loadFile(files[0])}
          title="Drop image to round corners"
          description="PNG, JPG, WebP supported"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Radius Controls
              </span>
              <Button variant="outline" size="sm" onClick={resetImage} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Change Image
              </Button>
            </div>

            <Slider
              label="Corner Radius"
              value={radius}
              min={0}
              max={50}
              step={1}
              unit="%"
              onChange={setRadius}
              helperText={radius === 50 ? 'Full Circle Avatar mode active (50%)' : 'Adjust corner curvature'}
            />

            {/* Quick Presets */}
            <div className="flex gap-2">
              {[10, 20, 30, 50].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    radius === r
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {r === 50 ? 'Circle' : `${r}%`}
                </button>
              ))}
            </div>

            {/* Border Width */}
            <Slider
              label="Border Stroke Width"
              value={borderWidth}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={setBorderWidth}
            />

            {borderWidth > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  />
                  <div className="flex gap-1.5">
                    {['#ffffff', '#000000', '#3b82f6', '#ef4444', '#10b981'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBorderColor(c)}
                        className="w-7 h-7 rounded-lg border border-zinc-300 shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {resultBlob && (
              <div className="space-y-2">
                <Button
                  size="xl"
                  variant="primary"
                  onClick={handleDownload}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                  leftIcon={<Download className="w-5 h-5" />}
                >
                  Download Rounded PNG ({formatBytes(resultBlob.size)})
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
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
          <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Live Canvas Preview
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Transparent PNG Alpha Channel
              </span>
            </div>

            {/* Checkerboard background pattern for transparent PNG verification */}
            <div
              className="rounded-xl border border-zinc-200 p-6 flex items-center justify-center min-h-[380px]"
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
                  className="max-h-[360px] max-w-full object-contain drop-shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
