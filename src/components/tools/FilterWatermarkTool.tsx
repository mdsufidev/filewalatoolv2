import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
} from 'lucide-react';
import { ImageToolGuideSection } from './image/ImageToolGuideSection';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { formatBytes, triggerFileDownload } from '../../utils/memory';
import { FilterOptions, WatermarkOptions } from '../../core/engine/CanvasEngine';
import { useTheme } from '../../core/themeContext';
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

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleDownload = useCallback(() => {
    if (!result || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-adjusted.png`;
    triggerFileDownload(result.blob, filename);
    onNotify('Image Downloaded', `Saved ${filename}`, 'success');
  }, [result, currentImage, onNotify]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const ok = await copyImageToClipboard(result.blob);
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Adjusted image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [result, onNotify]);

  const handleShare = useCallback(async () => {
    if (!result || !currentImage) return;
    const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-adjusted.png`;
    const shared = await shareFileOrBlob({
      blob: result.blob,
      filename,
      title: 'Adjusted Image',
      text: 'Image edited with FileWala Filters & Watermark.',
    });
    if (shared.shared) {
      onNotify('Shared', 'Image shared successfully.', 'success');
    }
  }, [result, currentImage, onNotify]);

  // Global Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (currentImage) {
          e.preventDefault();
          resetImage();
          onNotify('Reset', 'Cleared image.');
          return;
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (result) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (result) {
          e.preventDefault();
          handleDownload();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentImage, result, handleDownload, resetImage, onNotify]);

  if (!currentImage) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-3.5 animate-in fade-in duration-300 select-none">
        {/* Header Section */}
        <div className="text-center space-y-1 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side Engine · Zero Uploads</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Filters & Watermark
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Fine-tune exposure, contrast, saturation, and add custom copyright watermarks with instant client-side canvas processing.
          </p>
        </div>

        <div className="max-w-[700px] mx-auto">
          <Dropzone
            onFilesSelected={(files) => loadFile(files[0])}
            title="Drop image to edit filters or watermark"
            description="Instant canvas color matrix adjustments and typography overlay · 100% Client-Side"
          />
        </div>

        {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
        <ImageToolGuideSection toolId="filter-adjust" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Hero Title & Action Bar Row (Ultra-Compact Viewport-Safe) */}
      <div className="flex items-center justify-between gap-3 pt-0 pb-0.5">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
            Filters & Watermark
          </h1>
          <span className="hidden sm:inline-block text-zinc-300 dark:text-zinc-700">·</span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
            Tune contrast, exposure, and overlay watermarks directly in RAM.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={resetImage}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-zinc-500" />
            <span>Change image</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* LEFT COLUMN: Live Preview Display (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-7">
          <div
            className={`border rounded-xl p-2.5 sm:p-3 space-y-2 transition-colors relative overflow-hidden ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-800/80 shadow-xs'
                : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            {/* Header bar inside left card */}
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md overflow-hidden shrink-0 flex items-center justify-center border ${
                    isDark ? 'bg-zinc-850 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                  }`}
                >
                  <img
                    src={currentImage.previewUrl}
                    alt="Thumbnail"
                    className="w-full h-full object-cover select-none"
                  />
                </div>
                <div className="min-w-0 flex items-center gap-2">
                  <h3 className={`text-xs font-semibold truncate max-w-[150px] sm:max-w-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {currentImage.name}
                  </h3>
                  <div className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span>{currentImage.width}×{currentImage.height}</span>
                    <span>·</span>
                    <span className="font-semibold">{formatBytes(currentImage.sizeBytes)}</span>
                  </div>
                </div>
              </div>

              {result && (
                <span className="text-[10px] font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                  Rendered Canvas
                </span>
              )}
            </div>

            {/* Canvas Container (Clamped to 280px standard) */}
            <div className="relative rounded-xl overflow-hidden bg-black/15 h-[230px] sm:h-[260px] lg:h-[280px] xl:h-[300px] flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/60 p-2">
              <img
                src={result ? result.url : currentImage.previewUrl}
                alt="Filter Preview"
                className="max-h-[210px] sm:max-h-[240px] lg:max-h-[260px] xl:max-h-[280px] max-w-full object-contain rounded-lg shadow-sm transition-all select-none"
                style={{
                  filter: result
                    ? undefined
                    : `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) invert(${filters.invert}%)`,
                }}
              />
            </div>

            {/* Quick Action footer inside left card */}
            <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 px-0.5 pt-0.5 gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Zero Server Latency · 100% Client-Side</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!result}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
                      : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  <Copy className="w-3 h-3 text-blue-500" />
                  <span>Copy</span>
                </button>

                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!result}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
                        : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    <Share2 className="w-3 h-3 text-indigo-500" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Breakdown Bar */}
            <div
              className={`grid grid-cols-4 gap-2 p-2 rounded-lg text-xs ${
                isDark ? 'bg-zinc-800/60' : 'bg-zinc-100/80'
              }`}
            >
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Resolution
                </span>
                <span className={`font-mono font-bold text-[11px] truncate block ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {currentImage.width}×{currentImage.height}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Active Tool
                </span>
                <span className={`font-mono text-[11px] truncate block uppercase ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {activeTab}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  State
                </span>
                <span className="font-semibold text-[11px] text-blue-500 dark:text-blue-400 block truncate">
                  {result ? 'Export Ready' : 'Live Preview'}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Output Size
                </span>
                <span className={`font-mono font-bold text-[11px] block truncate ${result ? 'text-emerald-500' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {result ? formatBytes(result.sizeBytes) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Controls Panel (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-2">
          <div
            className={`p-2 sm:p-2.5 rounded-xl border space-y-2 transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800/80 shadow-xs' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            {/* Sub-tab Switcher (Soft Tabs) */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('filters')}
                className={`flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                  activeTab === 'filters'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                Color Adjustments
              </button>
              <button
                onClick={() => setActiveTab('watermark')}
                className={`flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                  activeTab === 'watermark'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Type className="w-3 h-3" />
                Text Watermark
              </button>
            </div>

            {activeTab === 'filters' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Sliders
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Undo2 className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="space-y-1.5">
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
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <input
                    type="checkbox"
                    checked={filters.sharpen}
                    onChange={(e) => handleFilterChange('sharpen', e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                    Enable High-Pass Sharpen Filter
                  </span>
                </label>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={applyFilters}
                  isLoading={isProcessing}
                  className="w-full text-xs py-1.5"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Render Adjustments
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-0.5">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. © 2026 Your Studio"
                    className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
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
                </div>

                {/* Color Picker & Swatches */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    Text Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <div className="flex gap-1">
                      {['#ffffff', '#000000', '#f59e0b', '#ef4444', '#3b82f6'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setWatermarkColor(c)}
                          className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Position 3x3 Grid */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    Position Anchor
                  </label>
                  <div className="grid grid-cols-4 gap-1">
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
                        className={`h-6 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                          watermarkPosition === pos
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-bold'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                        }`}
                      >
                        {pos.replace('bottom-', 'b-').replace('top-', 't-')}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={applyWatermark}
                  isLoading={isProcessing}
                  className="w-full text-xs py-1.5"
                  leftIcon={<Type className="w-3.5 h-3.5" />}
                >
                  Apply Watermark
                </Button>
              </div>
            )}

            {/* Primary Action Button: Download CTA */}
            <div className="pt-1">
              <button
                type="button"
                disabled={!result || isProcessing}
                onClick={handleDownload}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {result ? `Download PNG (${formatBytes(result.sizeBytes)})` : 'Render Canvas to Download'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId="filter-adjust" />
    </div>
  );
};
