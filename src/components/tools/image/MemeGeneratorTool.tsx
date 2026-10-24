import React, { useState, useEffect } from 'react';
import { Type, Download, RefreshCw, Sparkles, Smile, Copy, Share2 } from 'lucide-react';
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

export const MemeGeneratorTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
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

  const handleDownload = () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(resultBlob, `${baseName}-meme.jpg`);
    onNotify('Meme Downloaded!', 'Ready to share on social media', 'success');
  };

  const handleCopy = async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Meme copied as image! You can now paste (Ctrl+V) directly into Twitter, Discord, WhatsApp, etc.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    if (!resultBlob || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-meme.jpg`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Meme',
      text: 'Created with FileWala Meme Generator.',
    });
    if (shared) {
      onNotify('Shared', 'Meme shared successfully.', 'success');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-1.5 max-w-xl mx-auto">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950">
          Meme Generator & Image Captioner
        </h3>
        <p className="text-xs text-zinc-500 font-medium">
          Target Keyword: <em>Add text to image / Meme generator online</em>
        </p>
        <p className="text-xs text-zinc-400">
          Quickly generate iconic memes and bold social media captions with classic Impact typography and clean black contrast strokes.
        </p>
      </div>

      {!currentImage ? (
        <Dropzone
          onFilesSelected={(files) => loadFile(files[0])}
          title="Drop image to generate meme"
          description="JPEG, PNG, WebP supported"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Meme Captions
              </span>
              <Button variant="outline" size="sm" onClick={resetImage} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Change Image
              </Button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Top Caption</label>
              <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="TOP TEXT..."
                className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Bottom Caption</label>
              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="BOTTOM TEXT..."
                className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950"
              />
            </div>

            <Slider
              label="Font Size"
              value={fontSize}
              min={24}
              max={80}
              unit="px"
              onChange={setFontSize}
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={isUppercase}
                  onChange={(e) => setIsUppercase(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                Force ALL CAPS
              </label>

              <div className="flex items-center gap-1.5">
                {['#FFFFFF', '#FFEB3B', '#FF5722', '#4CAF50'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className="w-5 h-5 rounded border border-zinc-300 cursor-pointer shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {resultBlob && (
              <div className="space-y-2">
                <Button
                  size="xl"
                  variant="primary"
                  onClick={handleDownload}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                  leftIcon={<Download className="w-5 h-5" />}
                >
                  Download Meme ({formatBytes(resultBlob.size)})
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Meme</span>
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
            <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
              Meme Canvas Preview
            </span>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-center min-h-[380px]">
              {resultUrl && (
                <img
                  src={resultUrl}
                  alt="Meme output"
                  className="max-h-[420px] max-w-full object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
