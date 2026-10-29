'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import {
  FilePlus,
  Image as ImageIcon,
  ArrowUpDown,
  MoveLeft,
  MoveRight,
  Trash2,
  Download,
  Eye,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  Maximize2,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Dropzone } from '../../ui/Dropzone';
import { PdfPreviewModal } from './PdfPreviewModal';
import { PdfToolGuideSection } from './PdfToolGuideSection';
import { formatBytes, triggerFileDownload, createSafeObjectURL, revokeSafeObjectURL } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';
import { CanvasEngine } from '../../../core/engine/CanvasEngine';
import { readExifOrientation } from '../../../utils/exifHelper';

export type PageSizeOption = 'a4' | 'letter' | 'fit';
export type OrientationOption = 'portrait' | 'landscape' | 'auto';
export type MarginOption = 'none' | 'small' | 'large';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  hasExifOrientation?: boolean;
}

interface ImageToPdfToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [orientation, setOrientation] = useState<OrientationOption>('portrait');
  const [margin, setMargin] = useState<MarginOption>('none');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);

  // Result preview
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Clean memory on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => revokeSafeObjectURL(img.previewUrl));
    };
  }, [images]);

  // Handle image files added
  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      const validImages = files.filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type.toLowerCase()) ||
        /\.(jpe?g|png|webp)$/i.test(f.name)
      );

      if (validImages.length === 0) {
        onNotify('Invalid Files', 'Please select JPG, PNG, or WebP images.', 'error');
        return;
      }

      const newItems: ImageItem[] = [];

      for (const file of validImages) {
        try {
          const img = await CanvasEngine.loadImage(file);
          const previewUrl = img.src.startsWith('blob:') ? img.src : createSafeObjectURL(file);
          const orientation = await readExifOrientation(file);

          newItems.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            file,
            previewUrl,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 600,
            rotation: 0,
            hasExifOrientation: orientation > 1,
          });
        } catch {
          const fallbackUrl = createSafeObjectURL(file);
          newItems.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            file,
            previewUrl: fallbackUrl,
            width: 800,
            height: 600,
            rotation: 0,
          });
        }
      }

      setImages((prev) => [...prev, ...newItems]);
      onNotify('Photos Added', `Added ${newItems.length} image(s) to compiler queue.`, 'info');
    },
    [onNotify]
  );

  // Actions on images
  const moveImage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const rotateImageItem = (index: number) => {
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + 90) % 360,
      };
      return copy;
    });
  };

  const removeImage = (index: number) => {
    const item = images[index];
    if (item) revokeSafeObjectURL(item.previewUrl);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    images.forEach((img) => revokeSafeObjectURL(img.previewUrl));
    setImages([]);
    setGeneratedPdfBlob(null);
  };

  // Convert an ImageItem to an ArrayBuffer of standard PNG/JPEG
  // Handles canvas rotation, EXIF orientation, and WebP conversion to standard format
  const prepareImageBytes = async (
    item: ImageItem
  ): Promise<{ bytes: Uint8Array; type: 'jpeg' | 'png'; width: number; height: number }> => {
    // If it has user rotation, EXIF orientation, or is webp, draw to canvas and export to standard image
    const needsCanvas = item.rotation !== 0 || item.hasExifOrientation || item.file.type === 'image/webp' || /\.webp$/i.test(item.file.name);

    if (!needsCanvas && (item.file.type === 'image/jpeg' || /\.jpe?g$/i.test(item.file.name))) {
      const buffer = await item.file.arrayBuffer();
      return { bytes: new Uint8Array(buffer), type: 'jpeg', width: item.width, height: item.height };
    }

    if (!needsCanvas && item.file.type === 'image/png') {
      const buffer = await item.file.arrayBuffer();
      return { bytes: new Uint8Array(buffer), type: 'png', width: item.width, height: item.height };
    }

    // Render rotated and upright onto canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isSideways = item.rotation === 90 || item.rotation === 270;
        const drawWidth = isSideways ? img.naturalHeight : img.naturalWidth;
        const drawHeight = isSideways ? img.naturalWidth : img.naturalHeight;

        canvas.width = drawWidth;
        canvas.height = drawHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Fill solid white background so transparent areas don't turn black in PDF
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, drawWidth, drawHeight);

        ctx.translate(drawWidth / 2, drawHeight / 2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        canvas.toBlob(async (blob) => {
          try {
            if (!blob) {
              canvas.width = 0;
              canvas.height = 0;
              reject(new Error('Failed to encode image from canvas'));
              return;
            }
            const buf = await blob.arrayBuffer();
            canvas.width = 0;
            canvas.height = 0;
            resolve({
              bytes: new Uint8Array(buf),
              type: 'jpeg',
              width: drawWidth,
              height: drawHeight,
            });
          } catch (err) {
            canvas.width = 0;
            canvas.height = 0;
            reject(err);
          }
        }, 'image/jpeg', 0.92);
      };
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = item.previewUrl;
    });
  };

  // Execute client-side compilation
  const handleCompileToPdf = async () => {
    if (images.length === 0) {
      onNotify('No Images', 'Please upload at least one image to compile.', 'error');
      return;
    }

    setIsCompiling(true);
    setCompileProgress(10);

    try {
      const pdfDoc = await PDFDocument.create();
      const total = images.length;

      // Define margin points (1 pt = 1/72 inch)
      const marginPoints = margin === 'none' ? 0 : margin === 'small' ? 20 : 40;

      for (let i = 0; i < total; i++) {
        const item = images[i];
        setCompileProgress(15 + Math.round(((i + 1) / total) * 75));

        const prepared = await prepareImageBytes(item);
        const embedded =
          prepared.type === 'jpeg'
            ? await pdfDoc.embedJpg(prepared.bytes)
            : await pdfDoc.embedPng(prepared.bytes);

        let pageWidth = 595.28; // default A4 portrait
        let pageHeight = 841.89;

        if (pageSize === 'letter') {
          pageWidth = 612;
          pageHeight = 792;
        } else if (pageSize === 'fit') {
          // Exactly fit the image dimensions
          pageWidth = prepared.width + marginPoints * 2;
          pageHeight = prepared.height + marginPoints * 2;
        }

        // Handle Orientation (if not fit)
        if (pageSize !== 'fit') {
          if (orientation === 'landscape') {
            const temp = pageWidth;
            pageWidth = Math.max(pageWidth, pageHeight);
            pageHeight = Math.min(temp, pageHeight);
          } else if (orientation === 'auto') {
            // Auto match image aspect ratio
            const isLandscapeImg = prepared.width > prepared.height;
            if (isLandscapeImg && pageWidth < pageHeight) {
              const temp = pageWidth;
              pageWidth = pageHeight;
              pageHeight = temp;
            }
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate fitted image placement inside margins
        const availableW = pageWidth - marginPoints * 2;
        const availableH = pageHeight - marginPoints * 2;

        const imgScale = Math.min(
          availableW / prepared.width,
          availableH / prepared.height,
          pageSize === 'fit' ? 1 : 2
        );

        const renderW = prepared.width * imgScale;
        const renderH = prepared.height * imgScale;

        const posX = marginPoints + (availableW - renderW) / 2;
        const posY = marginPoints + (availableH - renderH) / 2;

        page.drawImage(embedded, {
          x: posX,
          y: posY,
          width: renderW,
          height: renderH,
        });
      }

      setCompileProgress(95);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setGeneratedPdfBlob(blob);
      setCompileProgress(100);

      onNotify('PDF Ready!', `Compiled ${images.length} photos into a single PDF document.`, 'success');
    } catch (err: any) {
      console.error('Image to PDF error:', err);
      onNotify('Compilation Failed', err?.message || 'Error compiling images into PDF.', 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedPdfBlob) return;
    const filename = `filewala-compiled-${Date.now()}.pdf`;
    triggerFileDownload(generatedPdfBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (images.length === 0) return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        clearAllImages();
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        if (generatedPdfBlob) {
          e.preventDefault();
          handleDownloadPdf();
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleCompileToPdf();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, generatedPdfBlob, handleCompileToPdf, handleDownloadPdf, clearAllImages]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-2">
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <FilePlus className="w-3.5 h-3.5 text-blue-500" />
            Image to PDF Converter
          </h1>
          <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline-block">
            Convert JPG, PNG, and WebP photos into PDF
          </span>
        </div>
        {images.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllImages}
              className="text-xs text-rose-500 hover:text-rose-400 py-1 px-2.5 h-auto"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
            <Button
              onClick={handleCompileToPdf}
              isLoading={isCompiling}
              leftIcon={<FilePlus className="w-3.5 h-3.5" />}
              className="text-xs py-1 px-3 h-auto"
            >
              <span>Compile {images.length} Image{images.length > 1 ? 's' : ''} to PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* Direct Clean Dropzone */}
      {images.length === 0 ? (
        <div className="max-w-[700px] mx-auto">
          <Dropzone
            onFilesSelected={handleFilesAdded}
            multiple
            accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
            title="Upload Images to Convert to PDF"
            description="Drag & drop or click to browse JPG, PNG, or WebP photos."
            className="h-[230px] sm:h-[260px] lg:h-[280px]"
          />
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {/* Controls Bar */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {/* Page Size */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Page Size
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['a4', 'letter', 'fit'] as PageSizeOption[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPageSize(sz)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      pageSize === sz
                        ? isDark
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-900 text-white'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sz === 'fit' ? 'Fit Image' : sz.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Orientation
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['portrait', 'landscape', 'auto'] as OrientationOption[]).map((ori) => (
                  <button
                    key={ori}
                    onClick={() => setOrientation(ori)}
                    disabled={pageSize === 'fit'}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer capitalize ${
                      pageSize === 'fit' ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      orientation === ori && pageSize !== 'fit'
                        ? isDark
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-900 text-white'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {ori}
                  </button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Margins
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['none', 'small', 'large'] as MarginOption[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMargin(m)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer capitalize ${
                      margin === m
                        ? isDark
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-900 text-white'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compilation Progress Bar */}
          {isCompiling && (
            <div
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling PDF pages client-side...
                </span>
                <span className="font-mono text-blue-400">{compileProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${compileProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Generated PDF Ready CTA Banner */}
          {generatedPdfBlob && !isCompiling && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in ${
                isDark ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold">PDF Document Ready ({formatBytes(generatedPdfBlob.size)})</h4>
                  <p className="text-xs text-emerald-400/80">
                    Compiled from {images.length} images. Ready for preview or instant download.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewModalOpen(true)}
                  className="text-xs border-emerald-700/60 hover:bg-emerald-900/30"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview PDF
                </Button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Image Thumbnails Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Queue Sequence ({images.length} Image{images.length > 1 ? 's' : ''})
              </span>
              <label className="text-xs text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                <FilePlus className="w-3.5 h-3.5" /> Add More Photos
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files) handleFilesAdded(Array.from(e.target.files));
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
              {images.map((item, idx) => (
                <div
                  key={item.id}
                  className={`relative group rounded-xl border p-2 flex flex-col justify-between transition-all ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Sequence Badge */}
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                      Page {idx + 1}
                    </span>
                    <button
                      onClick={() => removeImage(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/60">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      style={{
                        transform: `rotate(${item.rotation}deg)`,
                      }}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                    />
                  </div>

                  {/* Filename & Dimensions */}
                  <div className="mt-2 px-1">
                    <div className={`text-[11px] font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.file.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                      <span>{formatBytes(item.file.size)}</span>
                      <span>
                        {item.width}×{item.height}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveImage(idx, 'left')}
                        disabled={idx === 0}
                        className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer`}
                        title="Move Left / Earlier in PDF"
                      >
                        <MoveLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'right')}
                        disabled={idx === images.length - 1}
                        className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer`}
                        title="Move Right / Later in PDF"
                      >
                        <MoveRight className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => rotateImageItem(idx)}
                      className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
                      title="Rotate 90° CW"
                    >
                      <RotateCw className="w-3 h-3" />
                      {item.rotation > 0 && <span>{item.rotation}°</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Comprehensive Educational & Technical Guide Section */}
      <PdfToolGuideSection toolId="image-to-pdf" />

      {/* Built-in PDF Preview Modal */}
      {previewModalOpen && generatedPdfBlob && (
        <PdfPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          file={generatedPdfBlob}
          title="Compiled PDF Preview"
        />
      )}
    </div>
  );
};
