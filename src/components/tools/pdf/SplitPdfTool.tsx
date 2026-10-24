'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../../core/pdfWorker';
import JSZip from 'jszip';
import {
  Scissors,
  FileText,
  Download,
  Archive,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Layers,
  Sparkles,
  Check,
  Split,
  FileCheck,
  ChevronRight,
  Filter,
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

export type SplitMode = 'range' | 'extract-all' | 'custom-select';

interface PageThumbnail {
  pageNum: number; // 1-indexed
  dataUrl: string;
  width: number;
  height: number;
  selected: boolean;
}

interface SplitPdfToolProps {
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SplitPdfTool: React.FC<SplitPdfToolProps> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState<string>('1-2');
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);

  // Download outputs
  const [extractedPdfBlob, setExtractedPdfBlob] = useState<Blob | null>(null);
  const [extractedZipBlob, setExtractedZipBlob] = useState<Blob | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  // Parse page range string into a sorted unique list of 0-indexed page numbers
  const parsedPageIndices = useMemo(() => {
    if (!totalPages) return [];
    if (splitMode === 'custom-select') {
      return pages.filter((p) => p.selected).map((p) => p.pageNum - 1);
    }
    if (splitMode === 'extract-all') {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    // Range string parsing: e.g. "1-3, 5, 8-10"
    const indices = new Set<number>();
    const segments = rangeInput.split(',');

    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const minP = Math.min(start, end);
          const maxP = Math.max(start, end);
          for (let p = Math.max(1, minP); p <= Math.min(totalPages, maxP); p++) {
            indices.add(p - 1);
          }
        }
      } else {
        const single = parseInt(trimmed, 10);
        if (!isNaN(single) && single >= 1 && single <= totalPages) {
          indices.add(single - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }, [totalPages, splitMode, pages, rangeInput]);

  // Load and generate low-res thumbnails client-side
  const handlePdfLoaded = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setExtractedPdfBlob(null);
    setExtractedZipBlob(null);
    setIsLoadingThumbnails(true);
    setLoadingProgress(5);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const count = pdf.numPages;
      setTotalPages(count);
      setRangeInput(count === 1 ? '1' : `1-${Math.min(3, count)}`);

      const thumbList: PageThumbnail[] = [];
      const renderCount = Math.min(count, 40); // Cap initial thumbnail rendering for instant responsiveness

      for (let i = 1; i <= renderCount; i++) {
        setLoadingProgress(10 + Math.round((i / renderCount) * 85));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 }); // Lightweight preview thumbnail

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
          thumbList.push({
            pageNum: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.7),
            width: viewport.width,
            height: viewport.height,
            selected: i <= Math.min(3, count),
          });
        }
      }

      // If document has more pages than 40, add placeholders
      for (let i = renderCount + 1; i <= count; i++) {
        thumbList.push({
          pageNum: i,
          dataUrl: '',
          width: 150,
          height: 200,
          selected: false,
        });
      }

      setPages(thumbList);
      onNotify('PDF Loaded', `Detected ${count} pages. Choose pages to extract.`, 'info');
    } catch (err: any) {
      console.error('Split PDF load error:', err);
      onNotify('Load Error', err?.message || 'Could not parse PDF.', 'error');
    } finally {
      setIsLoadingThumbnails(false);
      setLoadingProgress(100);
    }
  };

  // Toggle selection on a card
  const togglePageSelection = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) => (p.pageNum === pageNum ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAllPages = (selectAll: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: selectAll })));
  };

  // Execute extraction (single combined PDF or ZIP package)
  const handleExecuteSplit = async (asZip: boolean = false) => {
    if (!file || parsedPageIndices.length === 0) {
      onNotify('No Pages Selected', 'Please specify at least one page to extract.', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(buffer);

      if (asZip || splitMode === 'extract-all') {
        // Create ZIP archive containing each extracted page as an individual PDF
        const zip = new JSZip();
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const total = parsedPageIndices.length;

        for (let i = 0; i < total; i++) {
          setProcessProgress(15 + Math.round(((i + 1) / total) * 80));
          const pageIndex = parsedPageIndices[i];
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(sourcePdf, [pageIndex]);
          singleDoc.addPage(copiedPage);

          const singleBytes = await singleDoc.save();
          const padNum = String(pageIndex + 1).padStart(3, '0');
          zip.file(`${baseName}-page-${padNum}.pdf`, singleBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setExtractedZipBlob(zipBlob);
        const zipName = `${baseName}-split-pages.zip`;
        triggerFileDownload(zipBlob, zipName);
        onNotify('ZIP Downloaded', `Extracted ${total} pages into ${zipName}`, 'success');
      } else {
        // Create single combined PDF with selected pages
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(sourcePdf, parsedPageIndices);
        copied.forEach((p) => newDoc.addPage(p));

        setProcessProgress(90);
        const newPdfBytes = await newDoc.save();
        const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        setExtractedPdfBlob(blob);

        const outName = `${file.name.replace(/\.[^/.]+$/, '')}-extracted.pdf`;
        triggerFileDownload(blob, outName);
        onNotify('PDF Extracted', `Saved ${parsedPageIndices.length} pages as ${outName}`, 'success');
      }
    } catch (err: any) {
      console.error('Split error:', err);
      onNotify('Extraction Failed', err?.message || 'Error extracting pages.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessProgress(100);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTotalPages(0);
    setPages([]);
    setExtractedPdfBlob(null);
    setExtractedZipBlob(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Split PDF & Extract Pages
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Extract custom page ranges or separate every page into individual single-page documents 100% client-side.
          </p>
        </div>
        {file && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
              Change PDF
            </Button>
            <Button
              onClick={() => handleExecuteSplit(false)}
              isLoading={isProcessing}
              leftIcon={<Scissors className="w-4 h-4" />}
            >
              Extract {parsedPageIndices.length} Page{parsedPageIndices.length > 1 ? 's' : ''}
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
            title="Drop PDF here to split or extract pages"
            description="Supports multi-page documents of any size. All operations execute strictly in your browser."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active File Header */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-100 text-rose-600'
                }`}
              >
                <Scissors className="w-5 h-5" />
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
                  <span className="text-emerald-400 font-medium">
                    {parsedPageIndices.length} Selected to Extract
                  </span>
                </div>
              </div>
            </div>

            {/* Split Mode Selector */}
            <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => setSplitMode('range')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  splitMode === 'range'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Range Syntax
              </button>
              <button
                onClick={() => setSplitMode('custom-select')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  splitMode === 'custom-select'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Select via Grid
              </button>
              <button
                onClick={() => setSplitMode('extract-all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  splitMode === 'extract-all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Split All Pages (ZIP)
              </button>
            </div>
          </div>

          {/* Mode Configuration Bar */}
          {splitMode === 'range' && (
            <div
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Enter Page Numbers or Ranges (e.g. 1-3, 5, 8-10)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder={`e.g. 1-${Math.min(2, totalPages)}`}
                    className={`text-xs rounded-lg px-3 py-2 border w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">
                    Max: {totalPages} pages
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExecuteSplit(true)}
                  isLoading={isProcessing}
                  leftIcon={<Archive className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Download as ZIP
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExecuteSplit(false)}
                  isLoading={isProcessing}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Extract to Single PDF
                </Button>
              </div>
            </div>
          )}

          {splitMode === 'custom-select' && (
            <div className="flex items-center justify-between px-1">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Click any page card to toggle selection ({parsedPageIndices.length} of {totalPages} selected)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectAllPages(true)}
                  className="text-xs text-blue-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => selectAllPages(false)}
                  className="text-xs text-slate-400 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {splitMode === 'extract-all' && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-blue-950/30 border-blue-900/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="text-xs">
                Each of the <strong>{totalPages}</strong> pages will be saved as an independent single-page PDF and archived into a single .ZIP file.
              </div>
              <Button
                size="sm"
                onClick={() => handleExecuteSplit(true)}
                isLoading={isProcessing}
                leftIcon={<Archive className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Extract All {totalPages} Pages (ZIP)
              </Button>
            </div>
          )}

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Extracting pages client-side...
                </span>
                <span className="font-mono text-blue-400">{processProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${processProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Interactive Page Thumbnails Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Document Page Grid ({totalPages} Pages)
              </span>
              {isLoadingThumbnails && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Rendering page previews ({loadingProgress}%)...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pages.map((p) => {
                const isSelected = parsedPageIndices.includes(p.pageNum - 1);
                return (
                  <div
                    key={p.pageNum}
                    onClick={() => {
                      if (splitMode === 'custom-select') {
                        togglePageSelection(p.pageNum);
                      }
                    }}
                    className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-950/30 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                          : 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-60'
                        : 'bg-white border-slate-200 hover:border-slate-300 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Page {p.pageNum}
                      </span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : isDark
                            ? 'bg-slate-800 text-transparent border border-slate-700'
                            : 'bg-slate-200 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                    </div>

                    <div className={`relative aspect-3/4 rounded-lg overflow-hidden flex items-center justify-center border ${isDark ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-100 border-slate-200'}`}>
                      {p.dataUrl ? (
                        <img
                          src={p.dataUrl}
                          alt={`Page ${p.pageNum}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-slate-600 text-xs font-mono">
                          Page {p.pageNum}
                        </div>
                      )}
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
        toolName="Split PDF Tool"
        tagline="Extract single pages, custom sections, or divide large PDF documents into individual files."
        steps={[
          {
            step: 1,
            title: 'Drop PDF Document',
            description: 'Select or drag your PDF into the workspace. All page count data is detected instantly.',
            icon: <FileText className="w-4 h-4 text-rose-400" />,
          },
          {
            step: 2,
            title: 'Specify Pages or Range',
            description: 'Use custom range syntax (e.g. 1-3, 5), toggle individual thumbnail cards, or choose Split All.',
            icon: <Scissors className="w-4 h-4 text-blue-400" />,
          },
          {
            step: 3,
            title: 'Extract & Download',
            description: 'Download your chosen pages as a single combined PDF or cleanly archived into a ZIP file.',
            icon: <Download className="w-4 h-4 text-emerald-400" />,
          },
        ]}
        tips={[
          {
            title: 'Range Syntax Examples',
            description: 'Type "1-4, 7, 10-12" to extract pages 1 through 4, page 7, and pages 10 through 12 simultaneously.',
          },
          {
            title: 'Split All to ZIP',
            description: 'Choose "Split All Pages (ZIP)" to instantly turn a 50-page PDF into 50 individual single-page PDF files.',
          },
          {
            title: 'Zero Re-compression',
            description: 'Pages are extracted directly from the raw PDF stream with zero loss of vector sharpness or text clarity.',
          },
        ]}
        faqs={[
          {
            question: 'Will splitting reduce the quality of vectors or embedded images?',
            answer: 'No. The pdf-lib engine extracts the native binary PDF streams directly without re-rasterizing them, preserving 100% vector text, links, and original photo resolution.',
          },
          {
            question: 'Can I extract non-consecutive pages into one PDF?',
            answer: 'Yes! Simply use commas to separate distinct page numbers (e.g. "1, 3, 5, 8") and click "Extract to Single PDF".',
          },
          {
            question: 'Is there a limit on how many pages can be split?',
            answer: 'Because processing happens client-side in browser memory, documents up to hundreds of pages can be split smoothly.',
          },
        ]}
        privacyNotes={[
          'All PDF stream manipulation is 100% in-browser',
          'No files uploaded to any web servers',
          'Safe for confidential contracts, financial, and medical documents',
        ]}
      />

      {/* Preview Modal */}
      {previewModalOpen && previewBlob && (
        <PdfPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          file={previewBlob}
          title="Extracted PDF Preview"
        />
      )}
    </div>
  );
};
