'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';
import {
  RotateCw,
  RotateCcw,
  FileText,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  Maximize2,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Dropzone } from '../../ui/Dropzone';
import { PdfPreviewModal } from './PdfPreviewModal';
import { PdfToolGuideSection } from './PdfToolGuideSection';
import {
  formatBytes,
  triggerFileDownload,
  createSafeObjectURL,
  revokeSafeObjectURL,
} from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';

interface RotatePageItem {
  pageNum: number; // 1-indexed
  dataUrl: string;
  originalRotation: number; // in degrees
  currentRotation: number; // in degrees (cumulative)
}

interface RotatePdfToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const RotatePdfTool: React.FC<RotatePdfToolProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pages, setPages] = useState<RotatePageItem[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [rotatedPdfBlob, setRotatedPdfBlob] = useState<Blob | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Number of pages modified
  const modifiedCount = useMemo(() => {
    return pages.filter((p) => p.currentRotation !== p.originalRotation).length;
  }, [pages]);

  // Load PDF and render thumbnails
  const handlePdfLoaded = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setRotatedPdfBlob(null);
    setIsLoadingPages(true);
    setLoadingProgress(5);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const count = pdf.numPages;
      setTotalPages(count);

      // Also read original rotation angle from pdf-lib
      const pdfDoc = await PDFDocument.load(buffer);
      const docPages = pdfDoc.getPages();

      const pageItems: RotatePageItem[] = [];
      const renderCount = Math.min(count, 50);

      for (let i = 1; i <= renderCount; i++) {
        setLoadingProgress(10 + Math.round((i / renderCount) * 85));
        const page = await pdf.getPage(i);
        const origAngle = (docPages[i - 1]?.getRotation().angle || 0) % 360;

        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas: canvas as any,
          } as any).promise;
          pageItems.push({
            pageNum: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.75),
            originalRotation: origAngle,
            currentRotation: origAngle,
          });
        }
      }

      for (let i = renderCount + 1; i <= count; i++) {
        const origAngle = (docPages[i - 1]?.getRotation().angle || 0) % 360;
        pageItems.push({
          pageNum: i,
          dataUrl: '',
          originalRotation: origAngle,
          currentRotation: origAngle,
        });
      }

      setPages(pageItems);
      onNotify('PDF Loaded', `Loaded ${count} pages for visual rotation.`, 'info');
    } catch (err: any) {
      console.error('Rotate PDF load error:', err);
      onNotify('Error Loading PDF', err?.message || 'Could not parse PDF.', 'error');
    } finally {
      setIsLoadingPages(false);
      setLoadingProgress(100);
    }
  };

  // Rotate a single page
  const rotateSinglePage = (pageNum: number, direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNum !== pageNum) return p;
        const next = (p.currentRotation + delta + 360) % 360;
        return { ...p, currentRotation: next };
      })
    );
  };

  // Batch rotate all pages
  const rotateAllPages = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    setPages((prev) =>
      prev.map((p) => {
        const next = (p.currentRotation + delta + 360) % 360;
        return { ...p, currentRotation: next };
      })
    );
  };

  // Reset all rotations back to original
  const resetAllRotations = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, currentRotation: p.originalRotation }))
    );
  };

  // Save the re-oriented PDF client-side
  const handleSaveRotatedPdf = async () => {
    if (!file) return;

    setIsSaving(true);
    setSaveProgress(20);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const docPages = pdfDoc.getPages();

      pages.forEach((p, idx) => {
        if (docPages[idx]) {
          docPages[idx].setRotation(degrees(p.currentRotation));
        }
      });

      setSaveProgress(75);
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setRotatedPdfBlob(blob);
      setSaveProgress(100);

      const outName = `${file.name.replace(/\.[^/.]+$/, '')}-rotated.pdf`;
      triggerFileDownload(blob, outName);
      onNotify('PDF Saved!', `Successfully re-oriented PDF document.`, 'success');
    } catch (err: any) {
      console.error('Rotate save error:', err);
      onNotify('Save Failed', err?.message || 'Error saving rotated PDF.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTotalPages(0);
    setPages([]);
    setRotatedPdfBlob(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Rotate PDF Pages
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Permanently rotate individual or all PDF pages 90°, 180°, or 270° clockwise or counter-clockwise.
          </p>
        </div>
        {file && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
              Change PDF
            </Button>
            <Button
              onClick={handleSaveRotatedPdf}
              isLoading={isSaving}
              leftIcon={<RotateCw className="w-4 h-4" />}
            >
              Save Rotated PDF
            </Button>
          </div>
        )}
      </div>

      {/* Dropzone or Workspace */}
      {!file ? (
        <div
          className={`rounded-lg border p-6 md:p-8 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <Dropzone
            onFilesSelected={(files) => handlePdfLoaded(files[0])}
            accept="application/pdf,.pdf"
            title="Drop PDF to rotate orientation"
            description="Fix upside-down scans or landscape/portrait discrepancies 100% in your browser."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active File Header & Global Rotation Controls */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-100 text-purple-600'
                }`}
              >
                <RotateCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {file.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>{totalPages} Total Pages</span>
                  <span>•</span>
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span className="text-purple-400 font-medium">
                    {modifiedCount} Page{modifiedCount === 1 ? '' : 's'} Reoriented
                  </span>
                </div>
              </div>
            </div>

            {/* Global Rotation Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => rotateAllPages('ccw')}
                className="text-xs"
                title="Rotate all pages 90° counter-clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Rotate All CCW
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => rotateAllPages('cw')}
                className="text-xs"
                title="Rotate all pages 90° clockwise"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Rotate All CW
              </Button>
              {modifiedCount > 0 && (
                <button
                  onClick={resetAllRotations}
                  className="text-xs text-rose-400 hover:underline cursor-pointer ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Saving Progress Bar */}
          {isSaving && (
            <div
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving new page orientation metadata...
                </span>
                <span className="font-mono text-blue-400">{saveProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${saveProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Rotated PDF Ready CTA */}
          {rotatedPdfBlob && !isSaving && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in ${
                isDark ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold">Rotated PDF Ready ({formatBytes(rotatedPdfBlob.size)})</h4>
                  <p className="text-xs text-emerald-400/80">
                    Orientation metadata updated losslessly for {totalPages} pages.
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
                <Button
                  size="sm"
                  onClick={() => {
                    const outName = `${file.name.replace(/\.[^/.]+$/, '')}-rotated.pdf`;
                    triggerFileDownload(rotatedPdfBlob, outName);
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
                </Button>
              </div>
            </div>
          )}

          {/* Visual Page Thumbnails Grid with Rotation Indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Interactive Page Grid ({totalPages} Pages)
              </span>
              {isLoadingPages && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Rendering page previews ({loadingProgress}%)...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {pages.map((p) => {
                const rotationDelta = (p.currentRotation - p.originalRotation + 360) % 360;
                const isModified = rotationDelta !== 0;

                return (
                  <div
                    key={p.pageNum}
                    className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all ${
                      isModified
                        ? isDark
                          ? 'bg-purple-950/20 border-purple-500/80 shadow-xs'
                          : 'bg-purple-50/50 border-purple-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Page {p.pageNum}
                      </span>
                      {isModified ? (
                        <span className="text-[10px] font-mono font-bold text-purple-400 px-1 py-0.2 rounded bg-purple-500/10 border border-purple-500/20">
                          +{rotationDelta}°
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {p.currentRotation}°
                        </span>
                      )}
                    </div>

                    {/* Thumbnail with CSS Transform */}
                    <div className={`relative aspect-3/4 rounded-lg overflow-hidden flex items-center justify-center border ${isDark ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-100 border-slate-200'}`}>
                      {p.dataUrl ? (
                        <img
                          src={p.dataUrl}
                          alt={`Page ${p.pageNum}`}
                          style={{
                            transform: `rotate(${rotationDelta}deg)`,
                          }}
                          className="max-h-full max-w-full object-contain transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-slate-600 text-xs font-mono">
                          Page {p.pageNum}
                        </div>
                      )}
                    </div>

                    {/* Individual Rotation Controls */}
                    <div className={`mt-2 pt-2 border-t flex items-center justify-between ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                      <button
                        onClick={() => rotateSinglePage(p.pageNum, 'ccw')}
                        className={`px-2 py-1 rounded transition-colors text-[10px] flex items-center gap-1 cursor-pointer ${
                          isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        title="Rotate 90° CCW"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>90° CCW</span>
                      </button>

                      <button
                        onClick={() => rotateSinglePage(p.pageNum, 'cw')}
                        className={`px-2 py-1 rounded transition-colors text-[10px] flex items-center gap-1 cursor-pointer font-semibold ${
                          isDark
                            ? 'text-purple-400 hover:text-purple-300 hover:bg-slate-800'
                            : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                        }`}
                        title="Rotate 90° CW"
                      >
                        <span>90° CW</span>
                        <RotateCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Educational & How It Works Guidance Section */}
      <PdfToolGuideSection
        toolName="Rotate PDF Pages"
        tagline="Fix page orientation, upside-down scans, and landscape diagrams permanently."
        steps={[
          {
            step: 1,
            title: 'Drop PDF File',
            description: 'Drag your PDF document into the workspace. Every page is rendered into a visual preview card.',
            icon: <FileText className="w-4 h-4 text-purple-400" />,
          },
          {
            step: 2,
            title: 'Rotate Individually or in Batch',
            description: 'Use the 90° CW / CCW buttons on individual page cards, or use "Rotate All CW" to flip the whole file.',
            icon: <RotateCw className="w-4 h-4 text-blue-400" />,
          },
          {
            step: 3,
            title: 'Save & Download',
            description: 'Click "Save Rotated PDF" to update document orientation metadata losslessly and download.',
            icon: <Download className="w-4 h-4 text-emerald-400" />,
          },
        ]}
        tips={[
          {
            title: 'Zero Re-compression',
            description: 'Rotating PDF pages only modifies the standard /Rotate dictionary entry in the PDF tree. Vector lines, fonts, and photos are never re-compressed.',
          },
          {
            title: 'Fix Upside-Down Scans',
            description: 'Click "90° CW" twice on any upside-down page to perform a clean 180° rotation.',
          },
          {
            title: 'Preserve Bookmarks & Links',
            description: 'Because internal document streams remain untouched, bookmarks, outlines, and form fields are completely preserved.',
          },
        ]}
        faqs={[
          {
            question: 'Will rotating pages degrade my document quality or file size?',
            answer: 'No. The operation is 100% lossless. In standard PDF architecture, rotation is an internal metadata flag (0, 90, 180, or 270 degrees). The content streams are completely untouched.',
          },
          {
            question: 'Can I rotate only a specific single page?',
            answer: 'Yes! Every page card has its own dedicated 90° CW and 90° CCW triggers, so you can orient single pages independently without affecting others.',
          },
          {
            question: 'Does this persist when opening the file in Adobe Acrobat or Apple Preview?',
            answer: 'Yes. The rotation is saved permanently to the PDF file specification, so every PDF viewer, browser, and printer will display the new orientation.',
          },
        ]}
        privacyNotes={[
          'All rotation updates execute 100% in-browser',
          'Zero cloud uploads or server processing',
          'Compatible with private, financial, and confidential documents',
        ]}
      />

      {/* Built-in Preview Modal */}
      {previewModalOpen && rotatedPdfBlob && (
        <PdfPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          file={rotatedPdfBlob}
          title="Rotated PDF Preview"
        />
      )}
    </div>
  );
};
