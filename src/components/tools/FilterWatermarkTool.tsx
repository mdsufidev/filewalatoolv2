import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Type,
  Sliders,
  Download,
  RefreshCw,
  Undo2,
  Check,
  Copy,
  Share2,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { formatBytes, triggerFileDownload } from '../../utils/memory';
import { FilterOptions, WatermarkOptions } from '../../core/engine/CanvasEngine';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../utils/clipboardAndShare';

type SubTab = 'filters' | 'watermark';

const DEFAULT_FILTERS: FilterOptions = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  sharpen: false,
};

export const FilterWatermarkTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const { currentImage, loadFile, reset: resetImage } = useImageUpload();
  const { isProcessing, result, processFilters, processWatermark } = useCanvasEngine();

  const [activeTab, setActiveTab] = useState<SubTab>('filters');
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Watermark state
  const [watermarkText, setWatermarkText] = useState<string>('© FileWala');
  const [watermarkSize, setWatermarkSize] = useState<number>(36);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(80);
  const [watermarkColor, setWatermarkColor] = useState<string>('#ffffff');
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkOptions['position']>('bottom-right');

  const handleFilterChange = (key: keyof FilterOptions, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const applyFilters = async () => {
    if (!currentImage) return;
    const res = await processFilters(currentImage.imageElement, filters);
    if (res) {
      onNotify('Filters Applied', 'Custom adjustments rendered on canvas', 'success');
    }
  };

  const applyWatermark = async () => {
    if (!currentImage) return;
    const res = await processWatermark(currentImage.imageElement, {
      text: watermarkText,
      fontSize: watermarkSize,
      color: watermarkColor,
      opacity: watermarkOpacity / 100,
      position: watermarkPosition,
      padding: 30,
    });
    if (res) {
      onNotify('Watermark Added', `Placed at ${watermarkPosition}`, 'success');
    }
  };

  const handleDownload = () => {
    if (!result || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-adjusted.png`;
    triggerFileDownload(result.blob, filename);
    onNotify('Image Downloaded', `Saved ${filename}`, 'success');
  };

  const handleCopy = async () => {
    if (!result) return;
    const ok = await copyImageToClipboard(result.blob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Adjusted image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    if (!result || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-adjusted.png`;
    const shared = await shareFileOrBlob({
      blob: result.blob,
      filename,
      title: 'Adjusted Image',
      text: 'Image edited with FileWala Filters & Watermark.',
    });
    if (shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
    }
  };

  if (!currentImage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Filters & Watermark
          </h2>
          <p className="text-sm text-zinc-500">
            Fine-tune exposure, contrast, saturation, and add copyright watermarks or branding directly in your browser.
          </p>
        </div>

        <Dropzone
          onFilesSelected={(files) => loadFile(files[0])}
          title="Drop image to edit filters or watermark"
          description="Instant canvas color matrix adjustments and typography overlay"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-zinc-200 rounded-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={currentImage.previewUrl}
              alt="Source"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 truncate">
              {currentImage.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
              <span className="font-mono">
                {currentImage.width} × {currentImage.height} px
              </span>
              <span>·</span>
              <span>{formatBytes(currentImage.sizeBytes)}</span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetImage}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Change Image
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-5 space-y-6">
          {/* Sub-tab Switcher */}
          <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200 text-xs">
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'filters'
                  ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Color Adjustments
            </button>
            <button
              onClick={() => setActiveTab('watermark')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'watermark'
                  ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Text Watermark
            </button>
          </div>

          {activeTab === 'filters' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Sliders
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" />
                  Reset all
                </button>
              </div>

              <Slider
                label="Brightness"
                value={filters.brightness}
                min={0}
                max={200}
                unit="%"
                onChange={(v) => handleFilterChange('brightness', v)}
              />
              <Slider
                label="Contrast"
                value={filters.contrast}
                min={0}
                max={200}
                unit="%"
                onChange={(v) => handleFilterChange('contrast', v)}
              />
              <Slider
                label="Saturation"
                value={filters.saturation}
                min={0}
                max={200}
                unit="%"
                onChange={(v) => handleFilterChange('saturation', v)}
              />
              <Slider
                label="Blur"
                value={filters.blur}
                min={0}
                max={20}
                unit="px"
                onChange={(v) => handleFilterChange('blur', v)}
              />
              <Slider
                label="Grayscale"
                value={filters.grayscale}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => handleFilterChange('grayscale', v)}
              />
              <Slider
                label="Sepia"
                value={filters.sepia}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => handleFilterChange('sepia', v)}
              />

              <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-zinc-100">
                <input
                  type="checkbox"
                  checked={filters.sharpen}
                  onChange={(e) => handleFilterChange('sharpen', e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4"
                />
                <span className="text-xs font-medium text-zinc-800">
                  Enable High-Pass Sharpen Filter
                </span>
              </label>

              <Button
                size="lg"
                variant="primary"
                onClick={applyFilters}
                isLoading={isProcessing}
                className="w-full"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Render Adjustments
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. © 2026 Your Studio"
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              </div>

              <Slider
                label="Font Size"
                value={watermarkSize}
                min={16}
                max={120}
                unit="px"
                onChange={setWatermarkSize}
              />

              <Slider
                label="Opacity"
                value={watermarkOpacity}
                min={10}
                max={100}
                unit="%"
                onChange={setWatermarkOpacity}
              />

              {/* Color Picker & Swatches */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={watermarkColor}
                    onChange={(e) => setWatermarkColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  />
                  <div className="flex gap-1.5">
                    {['#ffffff', '#000000', '#f59e0b', '#ef4444', '#3b82f6'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setWatermarkColor(c)}
                        className="w-7 h-7 rounded-lg border border-zinc-300 shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Position 3x3 Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Position Anchor
                </label>
                <div className="grid grid-cols-3 gap-1.5 max-w-[180px]">
                  {(
                    [
                      'top-left',
                      'top-center',
                      'top-right',
                      'center',
                      'bottom-left',
                      'bottom-center',
                      'bottom-right',
                    ] as WatermarkOptions['position'][]
                  ).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setWatermarkPosition(pos)}
                      className={`h-9 rounded-lg border text-[10px] font-mono transition-colors ${
                        watermarkPosition === pos
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200'
                      }`}
                    >
                      {pos.replace('bottom-', 'b-').replace('top-', 't-')}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                variant="primary"
                onClick={applyWatermark}
                isLoading={isProcessing}
                className="w-full"
                leftIcon={<Type className="w-4 h-4" />}
              >
                Apply Watermark
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <Button
                size="xl"
                variant="primary"
                onClick={handleDownload}
                className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                leftIcon={<Download className="w-5 h-5" />}
              >
                Download Result ({formatBytes(result.sizeBytes)})
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

        {/* Live Preview Display */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900">
              {result ? 'Rendered Image' : 'Live Filter Preview'}
            </h4>
            {result && (
              <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Rendered
              </span>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-100/50 p-4 flex items-center justify-center min-h-[400px] overflow-hidden">
            <img
              src={result ? result.url : currentImage.previewUrl}
              alt="Filter Preview"
              className="max-h-[460px] max-w-full object-contain rounded-lg shadow-sm"
              style={{
                filter: result
                  ? undefined
                  : `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) invert(${filters.invert}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
