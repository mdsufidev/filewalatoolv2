import React, { useState, useEffect } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { MergePdfTool } from './pdf/MergePdfTool';
import { CompressPdfTool } from './pdf/CompressPdfTool';
import { PdfOcrTool } from './pdf/PdfOcrTool';
import { PdfToWordTool } from './pdf/PdfToWordTool';
import { PdfToImageTool } from './pdf/PdfToImageTool';
import { ImageToPdfTool } from './pdf/ImageToPdfTool';
import { SplitPdfTool } from './pdf/SplitPdfTool';
import { RotatePdfTool } from './pdf/RotatePdfTool';
import {
  Layers,
  FilePlus,
  Minimize2,
  Image as ImageIcon,
  Scissors,
  RotateCw,
  FileText,
  FileCheck,
  Download,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
  Eye,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { formatBytes, triggerFileDownload } from '../../utils/memory';
import { convertPdfToJpg, extractTextFromPdf } from '../../utils/pdfJsHelper';
import { useTheme } from '../../core/themeContext';

export type PdfToolId =
  | 'merge-pdf'
  | 'compress-pdf'
  | 'pdf-to-word'
  | 'pdf-to-jpg'
  | 'image-to-pdf'
  | 'split-pdf'
  | 'rotate-pdf'
  | 'pdf-to-text';

export interface PdfToolMeta {
  id: PdfToolId;
  name: string;
  icon: React.ReactNode;
  targetKeyword: string;
  description: string;
  badge?: string;
}

export const PDF_TOOLS: PdfToolMeta[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    icon: <Layers className="w-4 h-4 text-indigo-500" />,
    targetKeyword: 'Combine multiple PDF files online for free',
    description: 'Merge multiple PDF documents into a single organized file in seconds.',
    badge: 'Popular',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    icon: <Minimize2 className="w-4 h-4 text-emerald-500" />,
    targetKeyword: 'Reduce PDF file size without losing quality',
    description: 'Shrink large PDF file sizes while retaining clear text and vector lines.',
    badge: 'Save Size',
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word Converter',
    icon: <FileCheck className="w-4 h-4 text-blue-500" />,
    targetKeyword: 'Convert PDF to editable Microsoft Word DOCX',
    description: 'Transform digital and scanned PDFs into fully editable Word documents (.docx) in your browser.',
    badge: 'DOCX Flow',
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to Image Converter',
    icon: <ImageIcon className="w-4 h-4 text-amber-500" />,
    targetKeyword: 'Convert PDF pages to JPG, PNG & WebP images client-side',
    description: 'Render and extract high-resolution JPG, PNG, or WebP images from every page with custom DPI scale and bulk ZIP download.',
    badge: 'JPG • PNG • WebP',
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF Converter',
    icon: <FilePlus className="w-4 h-4 text-blue-500" />,
    targetKeyword: 'Turn JPG or PNG photos into a single PDF document',
    description: 'Compile JPEG and PNG graphics into a clean, ready-to-share PDF document.',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    icon: <Scissors className="w-4 h-4 text-rose-500" />,
    targetKeyword: 'Extract specific pages or split large PDF files',
    description: 'Extract individual pages or custom page ranges from any multi-page PDF.',
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF Pages',
    icon: <RotateCw className="w-4 h-4 text-purple-500" />,
    targetKeyword: 'Rotate PDF orientation (Portrait/Landscape)',
    description: 'Permanently reorient rotated PDF pages 90°, 180°, or 270° clockwise.',
  },
  {
    id: 'pdf-to-text',
    name: 'PDF to Text (OCR)',
    icon: <FileText className="w-4 h-4 text-cyan-500" />,
    targetKeyword: 'Extract text from scanned PDF documents with client-side OCR',
    description: 'Extract editable text & optical character recognition (OCR) from scanned or digital PDFs directly in browser.',
    badge: 'Tesseract OCR',
  },
];

interface PdfToolsProps {
  initialTab?: PdfToolId;
  initialFiles?: File[] | null;
  onClearPendingFiles?: () => void;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PdfTools: React.FC<PdfToolsProps> = ({
  initialTab = 'merge-pdf',
  initialFiles,
  onClearPendingFiles,
  onNotify,
}) => {
  const [activeTool, setActiveTool] = useState<PdfToolId>(initialTab);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (initialTab) {
      setActiveTool(initialTab);
    }
  }, [initialTab]);

  // ==========================================
  // 1. MERGE PDF STATE
  // ==========================================
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleMergeFilesSelected = (newFiles: File[]) => {
    const pdfsOnly = newFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfsOnly.length === 0) {
      onNotify('Invalid File', 'Please select valid PDF documents.', 'error');
      return;
    }
    setMergeFiles((prev) => [...prev, ...pdfsOnly]);
    onNotify('Added to Queue', `Added ${pdfsOnly.length} PDF file(s).`, 'info');
  };

  const handleRemoveMergeFile = (index: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveMergeFile = (index: number, direction: 'up' | 'down') => {
    setMergeFiles((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleExecuteMerge = async () => {
    if (mergeFiles.length < 2) {
      onNotify('Need More Files', 'Please select at least 2 PDF files to merge.', 'error');
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of mergeFiles) {
        const fileBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      triggerFileDownload(blob, `filewala-merged-${Date.now()}.pdf`);
      onNotify('PDFs Merged Successfully!', `Combined ${mergeFiles.length} documents.`, 'success');
    } catch (err: any) {
      onNotify('Merge Failed', err?.message || 'Error merging PDF files', 'error');
    } finally {
      setIsMerging(false);
    }
  };



  const activeMeta = PDF_TOOLS.find((t) => t.id === activeTool) || PDF_TOOLS[0];

  if (activeTool === 'merge-pdf') {
    return <MergePdfTool onNotify={onNotify} initialFiles={initialFiles} />;
  }

  if (activeTool === 'compress-pdf') {
    return (
      <CompressPdfTool
        onNotify={onNotify}
        initialFile={initialFiles && initialFiles.length > 0 ? initialFiles[0] : null}
      />
    );
  }

  if (activeTool === 'pdf-to-word') {
    return <PdfToWordTool onNotify={onNotify} />;
  }

  if (activeTool === 'pdf-to-text') {
    return <PdfOcrTool onNotify={onNotify} />;
  }

  if (activeTool === 'pdf-to-jpg') {
    return <PdfToImageTool onNotify={onNotify} />;
  }

  if (activeTool === 'image-to-pdf') {
    return <ImageToPdfTool onNotify={onNotify} />;
  }

  if (activeTool === 'split-pdf') {
    return <SplitPdfTool onNotify={onNotify} />;
  }

  if (activeTool === 'rotate-pdf') {
    return <RotatePdfTool onNotify={onNotify} />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>7 Power PDF Tools</span>
        </div>
        <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {activeMeta.name}
        </h2>
        <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {activeMeta.targetKeyword}
        </p>
      </div>

      {/* Grid of All 7 PDF Tools */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {PDF_TOOLS.map((tool) => {
          const isSelected = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                isSelected
                  ? isDark
                    ? 'bg-slate-800 border-slate-700 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/50'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 border transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-900 border-slate-700 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-blue-300'
                    : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {tool.icon}
              </div>
              <span className="text-xs font-semibold leading-tight line-clamp-1">
                {tool.name}
              </span>
              {tool.badge && (
                <span
                  className={`mt-1 text-[9px] font-mono px-1 py-0.2 rounded border ${
                    isSelected
                      ? isDark
                        ? 'bg-slate-950 text-blue-400 border-slate-800'
                        : 'bg-slate-800 text-blue-300 border-slate-700'
                      : isDark
                        ? 'bg-slate-800 text-slate-400 border-slate-700/60'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {tool.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
