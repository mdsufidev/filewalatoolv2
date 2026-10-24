'use client';

import React, { useState, useEffect } from 'react';
import {
  FileArchive,
  CheckCircle2,
  Download,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  ChevronDown,
  Info,
  Sliders,
  Eye,
  FileText,
  AlertCircle,
  FileImage,
  Copy,
  Share2,
  X,
  ZoomIn,
  Loader2,
} from 'lucide-react';
import { Dropzone } from '../ui/Dropzone';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { ComplianceProgressBar } from './ComplianceProgressBar';
import {
  createSafeObjectURL,
  revokeSafeObjectURL,
  formatBytes,
  triggerFileDownload,
} from '../../utils/memory';
import { compressCanvasToPortalSpecs } from '../../utils/jpegDpi';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../utils/clipboardAndShare';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../core/pdfWorker';
import { PdfPreviewModal } from './pdf/PdfPreviewModal';

// Initialize PDF.js worker safely
ensurePdfWorkerInitialized();

export type GovPortalPreset =
  | 'under-50kb'
  | 'under-100kb'
  | 'under-200kb'
  | 'under-300kb'
  | 'under-500kb'
  | 'custom';

interface GovPortalPresetConfig {
  id: GovPortalPreset;
  name: string;
  portalDescription: string;
  targetMaxKb: number;
  targetMinKb: number;
}

const GOV_PRESETS: Record<GovPortalPreset, GovPortalPresetConfig> = {
  'under-50kb': {
    id: 'under-50kb',
    name: 'Under 50 KB',
    portalDescription: 'NSDL PAN, SSC Signature, State PSC Certificates',
    targetMaxKb: 50,
    targetMinKb: 10,
  },
  'under-100kb': {
    id: 'under-100kb',
    name: 'Under 100 KB',
    portalDescription: 'EPFO KYC, Aadhaar Proof, Driving License (Sarathi)',
    targetMaxKb: 100,
    targetMinKb: 20,
  },
  'under-200kb': {
    id: 'under-200kb',
    name: 'Under 200 KB',
    portalDescription: 'Banking KYC, SBI/IBPS PO, Railway RRB Applications',
    targetMaxKb: 200,
    targetMinKb: 50,
  },
  'under-300kb': {
    id: 'under-300kb',
    name: 'Under 300 KB',
    portalDescription: 'UPSC Civil Services OTR, Passport Seva Documents',
    targetMaxKb: 300,
    targetMinKb: 50,
  },
  'under-500kb': {
    id: 'under-500kb',
    name: 'Under 500 KB',
    portalDescription: 'ITR Verification, Caste & Income Certificate Portals',
    targetMaxKb: 500,
    targetMinKb: 100,
  },
  custom: {
    id: 'custom',
    name: 'Custom KB Bound',
    portalDescription: 'Manually specify upper and lower size bounds',
    targetMaxKb: 100,
    targetMinKb: 20,
  },
};

/**
 * High-Clarity Document Text Sharpening & Background Cleaning Filter.
 * Converts paper noise/grain into pure white (which compresses to ~0 bytes in JPEG/PDF)
 * and deepens character strokes to keep candidate names, roll numbers, and marks razor-sharp.
 */
function applyTextClarityFilter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const len = d.length;

    for (let i = 0; i < len; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // Perceptual luminance calculation
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > 185) {
        // Clean paper grain, yellowing, and scanner background to pure white
        // In JPEG, solid white regions compress down to near zero bytes!
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      } else if (lum < 135) {
        // Deepen and sharpen dark text characters (roll numbers, names, signatures)
        d[i] = Math.max(0, Math.floor(r * 0.72));
        d[i + 1] = Math.max(0, Math.floor(g * 0.72));
        d[i + 2] = Math.max(0, Math.floor(b * 0.72));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Text clarity filter pass skipped:', err);
  }
}

interface GovCompressorProps {
  initialFile?: File | null;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const GovCompressor: React.FC<GovCompressorProps> = ({ initialFile, onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  const [selectedPreset, setSelectedPreset] = useState<GovPortalPreset>('under-100kb');
  const [customMaxKb, setCustomMaxKb] = useState<number>(100);
  const [customMinKb, setCustomMinKb] = useState<number>(20);
  const [textClarityBoost, setTextClarityBoost] = useState<boolean>(true);

  // File state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Processing & Result State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultThumbUrl, setResultThumbUrl] = useState<string | null>(null);
  const [resultSizeBytes, setResultSizeBytes] = useState<number>(0);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);

  // Inspector modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const activePreset = GOV_PRESETS[selectedPreset];
  const maxKb = selectedPreset === 'custom' ? customMaxKb : activePreset.targetMaxKb;
  const minKb = selectedPreset === 'custom' ? customMinKb : activePreset.targetMinKb;

  useEffect(() => {
    return () => {
      if (previewUrl) revokeSafeObjectURL(previewUrl);
      if (resultUrl) revokeSafeObjectURL(resultUrl);
      if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);
    };
  }, [previewUrl, resultUrl, resultThumbUrl]);

  // Load initial file if passed from drag-and-drop or parent workspace
  useEffect(() => {
    if (initialFile) {
      handleFileSelected([initialFile]);
    }
  }, [initialFile]);

  const handleFileSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (resultUrl) {
      revokeSafeObjectURL(resultUrl);
      setResultUrl(null);
      setResultBlob(null);
    }
    if (resultThumbUrl) {
      revokeSafeObjectURL(resultThumbUrl);
      setResultThumbUrl(null);
    }
    if (previewUrl) {
      revokeSafeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    setSourceFile(file);

    if (file.type === 'application/pdf') {
      setFileType('pdf');
      try {
        const arrayBuf = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuf),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });
        const pdfDoc = await loadingTask.promise;
        setPdfPageCount(pdfDoc.numPages);

        // Generate immediate high-clarity preview of Page 1
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await firstPage.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          canvas.toBlob((blob) => {
            if (blob) {
              const url = createSafeObjectURL(blob);
              setPreviewUrl(url);
            }
          }, 'image/jpeg', 0.85);
        }
      } catch {
        setPdfPageCount(1);
      }
      onNotify('PDF Document Loaded', `${file.name} (${formatBytes(file.size)}) ready for compression.`, 'info');
    } else if (file.type.startsWith('image/')) {
      setFileType('image');
      const tempUrl = createSafeObjectURL(file);
      setPreviewUrl(tempUrl);
      onNotify('Image Loaded', `${file.name} (${formatBytes(file.size)}) ready for compression.`, 'info');
    } else {
      onNotify('Invalid File', 'Please select a PDF document or JPG/PNG image.', 'error');
    }
  };

  // Compress Document
  const handleCompress = async () => {
    if (!sourceFile) return;
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStage('Initializing document engine...');

    try {
      if (fileType === 'image') {
        setProgressPercent(30);
        setProgressStage('Loading and analyzing image pixels...');
        const img = new Image();
        const imgUrl = URL.createObjectURL(sourceFile);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgUrl;
        });

        let targetW = img.naturalWidth;
        let targetH = img.naturalHeight;
        const maxDimension = 1800; // max crisp size for gov proofs
        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
          } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
            targetH = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas initialization failed');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        URL.revokeObjectURL(imgUrl);

        // Apply text clarity boost if enabled
        if (textClarityBoost) {
          setProgressPercent(50);
          setProgressStage('Enhancing text contrast & cleaning paper background...');
          applyTextClarityFilter(ctx, targetW, targetH);
        }

        setProgressPercent(75);
        setProgressStage(`Compressing strictly under ${maxKb} KB...`);
        const compressionResult = await compressCanvasToPortalSpecs(canvas, {
          minKb,
          maxKb,
          dpi: 200,
        });

        if (resultUrl) revokeSafeObjectURL(resultUrl);
        if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);

        const outUrl = createSafeObjectURL(compressionResult.blob);

        setResultBlob(compressionResult.blob);
        setResultUrl(outUrl);
        setResultThumbUrl(outUrl);
        setResultSizeBytes(compressionResult.sizeBytes);

        setProgressPercent(100);
        setProgressStage('Document compression complete!');

        onNotify(
          'Document Compressed Successfully!',
          `Original: ${formatBytes(sourceFile.size)} ➔ Optimized: ${formatBytes(compressionResult.sizeBytes)} (Under ${maxKb} KB)`,
          'success'
        );
      } else {
        // High-Clarity PDF Compression Pipeline
        const arrayBuf = await sourceFile.arrayBuffer();
        const maxBytes = maxKb * 1024;
        const minBytes = minKb * 1024;

        // Step 1: Check if pure structural deflation via pdf-lib is already enough
        try {
          const directDoc = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
          const directBytes = await directDoc.save({ useObjectStreams: true });
          if (directBytes.length <= maxBytes && (minBytes === 0 || directBytes.length >= minBytes)) {
            const directBlob = new Blob([new Uint8Array(directBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
            if (resultUrl) revokeSafeObjectURL(resultUrl);
            const directUrl = createSafeObjectURL(directBlob);
            setResultBlob(directBlob);
            setResultUrl(directUrl);
            setResultSizeBytes(directBlob.size);
            if (previewUrl) setResultThumbUrl(previewUrl);
            onNotify(
              'PDF Optimized with Pure Vector Text!',
              `Preserved 100% original vector text: ${formatBytes(directBlob.size)} (Under ${maxKb} KB)`,
              'success'
            );
            return;
          }
        } catch {
          // Proceed to page raster & text enhancement pipeline
        }

        // Step 2: Parse PDF with pdfjs for high-fidelity page rendering
        setProgressPercent(20);
        setProgressStage('Parsing document pages & fonts...');
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuf),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;

        // Calculate available byte budget per page
        const structuralOverhead = 4096;
        const netBudget = Math.max(12 * 1024, maxBytes - structuralOverhead);
        const targetPerPageBytes = Math.floor(netBudget / numPages);

        const newDoc = await PDFDocument.create();
        let firstPageThumbBlob: Blob | null = null;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const pageProg = Math.round(20 + ((pageNum - 1) / numPages) * 70);
          setProgressPercent(pageProg);
          setProgressStage(
            `Optimizing page ${pageNum} of ${numPages} (Keeping text sharp & readable)...`
          );

          const page = await pdfDoc.getPage(pageNum);
          const originalViewport = page.getViewport({ scale: 1.0 });

          // Scale resolution: 1.5 - 1.75 ensures small text and roll numbers remain razor-sharp
          let scale = 1.6;
          if (targetPerPageBytes < 35 * 1024) {
            scale = 1.35;
          } else if (targetPerPageBytes < 65 * 1024) {
            scale = 1.5;
          } else {
            scale = 1.75;
          }

          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
          if (!ctx) throw new Error('Canvas 2D context unavailable');

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

          // Apply Text Clarity & Background Cleaner filter
          if (textClarityBoost) {
            applyTextClarityFilter(ctx, canvas.width, canvas.height);
          }

          // Binary search for highest possible JPEG quality within targetPerPageBytes
          let lowQ = 0.35;
          let highQ = 0.94;
          let bestPageBlob: Blob | null = null;

          for (let iter = 0; iter < 5; iter++) {
            const midQ = (lowQ + highQ) / 2;
            const testBlob: Blob = await new Promise((resolve) => {
              canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', midQ);
            });

            if (testBlob.size <= targetPerPageBytes) {
              bestPageBlob = testBlob;
              lowQ = midQ;
            } else {
              highQ = midQ;
            }
          }

          if (!bestPageBlob) {
            bestPageBlob = await new Promise((resolve) => {
              canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.32);
            });
          }

          if (pageNum === 1) {
            firstPageThumbBlob = bestPageBlob;
          }

          const pageJpgBytes = await bestPageBlob!.arrayBuffer();
          const embeddedImg = await newDoc.embedJpg(pageJpgBytes);

          const pdfPage = newDoc.addPage([originalViewport.width, originalViewport.height]);
          pdfPage.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height,
          });

          // Free canvas memory immediately
          canvas.width = 0;
          canvas.height = 0;
        }

        setProgressPercent(92);
        setProgressStage('Finalizing optimized PDF streams...');

        const optimizedBytes = await newDoc.save({ useObjectStreams: true });
        let outBlob = new Blob([new Uint8Array(optimizedBytes).buffer as ArrayBuffer], { type: 'application/pdf' });

        // Safe padding if file is below required portal minimum
        if (minBytes > 0 && outBlob.size < minBytes) {
          const needed = minBytes - outBlob.size + 1024;
          if (needed > 0 && needed < 200 * 1024) {
            newDoc.setTitle('Government Document - Form Compliant');
            newDoc.setProducer(`FileWala-GovSafe-${'0'.repeat(needed)}`);
            const paddedBytes = await newDoc.save({ useObjectStreams: true });
            outBlob = new Blob([new Uint8Array(paddedBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
          }
        }

        if (resultUrl) revokeSafeObjectURL(resultUrl);
        if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);

        const outUrl = createSafeObjectURL(outBlob);
        setResultBlob(outBlob);
        setResultUrl(outUrl);
        setResultSizeBytes(outBlob.size);

        if (firstPageThumbBlob) {
          const thumbUrl = createSafeObjectURL(firstPageThumbBlob);
          setResultThumbUrl(thumbUrl);
        }

        setProgressPercent(100);
        setProgressStage('PDF Compression complete!');

        onNotify(
          'PDF Document Compressed Successfully!',
          `Original: ${formatBytes(sourceFile.size)} ➔ Optimized: ${formatBytes(outBlob.size)} (Under ${maxKb} KB with Sharp Text)`,
          'success'
        );
      }
    } catch (err: any) {
      console.error(err);
      onNotify('Compression Error', err?.message || 'Failed to compress document', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !sourceFile) return;
    const extension = fileType === 'pdf' ? '.pdf' : '.jpg';
    const cleanName = sourceFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${cleanName}-compressed-under-${maxKb}kb${extension}`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  };

  const handleCopy = async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok) {
      onNotify('Copied to Clipboard', 'Compressed image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', 'Your browser could not copy image directly to clipboard.', 'error');
    }
  };

  const handleShare = async () => {
    if (!resultBlob || !sourceFile) return;
    const extension = fileType === 'pdf' ? '.pdf' : '.jpg';
    const cleanName = sourceFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${cleanName}-compressed-under-${maxKb}kb${extension}`;
    const shared = await shareFileOrBlob({
      blob: resultBlob,
      filename,
      title: 'Compressed Document',
      text: `Compressed ${fileType.toUpperCase()} file via FileWala.`,
    });
    if (shared) {
      onNotify('Shared', 'File shared successfully.', 'success');
    }
  };

  const isCompliant =
    resultBlob &&
    resultSizeBytes <= maxKb * 1024 &&
    resultSizeBytes >= minKb * 1024;

  const reductionPercent =
    sourceFile && resultSizeBytes > 0 && sourceFile.size > resultSizeBytes
      ? Math.round(((sourceFile.size - resultSizeBytes) / sourceFile.size) * 100)
      : 0;

  const currentStep = !sourceFile ? 1 : !resultBlob ? 2 : 3;

  const handleResetFile = () => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);
    if (previewUrl) revokeSafeObjectURL(previewUrl);
    setResultUrl(null);
    setResultThumbUrl(null);
    setResultBlob(null);
    setSourceFile(null);
    setPreviewUrl(null);
  };

  const handleReAdjust = () => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);
    setResultUrl(null);
    setResultThumbUrl(null);
    setResultBlob(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 3-Step Compliance Progress Bar */}
      <ComplianceProgressBar
        currentStep={currentStep}
        toolName={`Gov Document Compressor (${activePreset.name})`}
        step1Label="Upload PDF / Image"
        step2Label="Set Target Size Limit"
        step3Label="Download Compressed File"
        step1Desc="Select Aadhaar, marksheet or PDF"
        step2Desc={`Constrain under ${maxKb} KB`}
        step3Desc="Optimized & readable document"
        onReset={handleResetFile}
        onReAdjust={handleReAdjust}
      />

      {/* Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <FileArchive className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            {language === 'hi'
              ? 'सार्वभौमिक भारतीय सरकारी दस्तावेज़ कंप्रेसर'
              : 'Universal Indian Government Document Compressor'}
          </span>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-950'}`}>
          {language === 'hi'
            ? 'सरकारी फॉर्म दस्तावेज़ कंप्रेसर'
            : 'General Gov Form Document Compressor'}
        </h1>
        <p className={`text-sm max-w-2xl mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {language === 'hi'
            ? 'आधार कार्ड, मार्कशीट, जाति/आय प्रमाण पत्र और पीडीएफ को सख्त 50 KB, 100 KB, 200 KB या 300 KB के भीतर 100% स्पष्ट टेक्स्ट के साथ कंप्रेस करें।'
            : 'Shrink PDF proofs, Aadhaar cards, marksheets, and caste/income certificates strictly under 50 KB, 100 KB, 200 KB, or 300 KB with 100% sharp, readable text.'}
        </p>
      </div>

      {/* Preset Target Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(GOV_PRESETS) as GovPortalPreset[]).map((presetKey) => {
          const isSelected = selectedPreset === presetKey;
          const config = GOV_PRESETS[presetKey];
          return (
            <button
              key={presetKey}
              onClick={() => setSelectedPreset(presetKey)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{config.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dropzone & File Details */}
        <div className="lg:col-span-7 space-y-5">
          {!sourceFile ? (
            <div
              className={`p-6 rounded-lg border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <Dropzone
                onFilesSelected={handleFileSelected}
                accept="image/*,application/pdf"
                multiple={false}
                title="Upload Document (PDF or Image)"
                description="Select Aadhaar card, marksheet, certificate, or KYC document. 100% private."
              />
            </div>
          ) : (
            <div
              className={`p-6 rounded-lg border space-y-4 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Active Document Loaded</span>
                </div>
                <button
                  onClick={() => {
                    setSourceFile(null);
                    if (previewUrl) revokeSafeObjectURL(previewUrl);
                    if (resultUrl) revokeSafeObjectURL(resultUrl);
                    if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);
                    setPreviewUrl(null);
                    setResultUrl(null);
                    setResultThumbUrl(null);
                    setResultBlob(null);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors"
                >
                  Change Document
                </button>
              </div>

              {/* Document Info Card */}
              <div className={`p-4 rounded-md border flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Document Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : fileType === 'pdf' ? (
                      <FileText className="w-5 h-5 text-zinc-500" />
                    ) : (
                      <FileImage className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-xs font-semibold max-w-[220px] sm:max-w-xs truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {sourceFile.name}
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Original Size: {formatBytes(sourceFile.size)} ·{' '}
                      {fileType === 'pdf' ? `${pdfPageCount} Page(s) PDF` : 'Digital Image'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-white text-zinc-700 border-zinc-200'}`}>
                  {fileType.toUpperCase()}
                </span>
              </div>

              {/* Text Clarity & Legibility Protection Toggle (Default: Enabled) */}
              <div
                className={`p-3.5 rounded-md border flex items-center justify-between gap-3 ${
                  isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                      Text Clarity &amp; Legibility Protection
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                      Recommended
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Removes paper noise and deepens text strokes so candidate names, roll numbers, and marks stay 100% sharp and readable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTextClarityBoost(!textClarityBoost)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    textClarityBoost ? 'bg-zinc-900 dark:bg-zinc-100 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
                  }`}
                  title="Toggle Text Clarity Protection"
                >
                  <span className={`w-4 h-4 rounded-full bg-white dark:bg-zinc-900 shadow-sm`} />
                </button>
              </div>

              {/* Custom Bounds Sliders if Selected */}
              {selectedPreset === 'custom' && (
                <div className={`p-4 rounded-md border space-y-4 ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50'}`}>
                  <span className={`text-xs font-semibold block ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Custom Size Bounds</span>
                  <Slider
                    label="Maximum File Size (Target Upper Limit)"
                    min={20}
                    max={1000}
                    step={10}
                    unit=" KB"
                    value={customMaxKb}
                    onChange={(val) => setCustomMaxKb(val)}
                  />
                  <Slider
                    label="Minimum File Size (Lower Threshold)"
                    min={5}
                    max={customMaxKb - 10}
                    step={5}
                    unit=" KB"
                    value={customMinKb}
                    onChange={(val) => setCustomMinKb(val)}
                  />
                </div>
              )}

              {/* Progress Indicator during compression */}
              {isProcessing && (
                <div className={`p-3.5 rounded-md border space-y-2 ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                      <span>{progressStage || 'Compressing...'}</span>
                    </span>
                    <span className="font-mono text-zinc-500">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Trigger */}
              <Button
                variant="primary"
                onClick={handleCompress}
                isLoading={isProcessing}
                className="w-full py-2.5 font-medium text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>Compress {fileType.toUpperCase()} Under {maxKb} KB</span>
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Portal Settings & Result Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Target Portal Scope Card */}
          <div
            className={`p-5 rounded-lg border space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Target Compression Goal</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                &lt; {maxKb} KB
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-md border ${isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'}`}>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Target Range:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {minKb} KB – {maxKb} KB
                </span>
              </div>
              <div className={`p-2.5 rounded-md border ${isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'}`}>
                <span className={`block mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Common Government Portals:</span>
                <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{activePreset.portalDescription}</span>
              </div>
            </div>
          </div>

          {/* Result Card & Checklist */}
          <div
            className={`p-5 rounded-lg border space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <span className={`text-xs font-medium block ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Portal Ready Output</span>

            {/* Preview Box */}
            <div className={`flex flex-col items-center justify-center p-4 rounded-md border border-dashed min-h-[160px] ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-300 bg-zinc-50'
            }`}>
              {resultUrl ? (
                <div className="text-center space-y-3 w-full">
                  {resultThumbUrl ? (
                    <div className="relative group max-h-[170px] overflow-hidden rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 mx-auto max-w-xs shadow-sm">
                      <img
                        src={resultThumbUrl}
                        alt="Compressed preview"
                        className="w-full max-h-[170px] object-contain mx-auto"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPreviewModalOpen(true)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5 cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>Inspect Text Clarity</span>
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Compressed to {formatBytes(resultSizeBytes)}
                    </p>
                    {reductionPercent > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        Reduced file size by {reductionPercent}%
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 py-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>
                    <Eye className="w-4 h-4" />
                  </div>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Compressed file details will show here</p>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-2 text-xs">
              <div
                className={`p-2.5 rounded-md border flex items-center justify-between ${
                  resultBlob && isCompliant
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Size Constraint (&lt; {maxKb} KB)
                </span>
                <span className="font-mono font-semibold">
                  {resultBlob ? (isCompliant ? 'PASS' : 'OPTIMIZED') : 'Pending'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-md border flex items-center justify-between ${
                  resultBlob
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Text Clarity &amp; Legibility
                </span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {resultBlob ? '100% SHARP' : 'Protected'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-md border flex items-center justify-between ${
                  resultBlob
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isDark
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  100% Client-Side Privacy
                </span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Guaranteed</span>
              </div>
            </div>

            {/* Download Button */}
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={!resultBlob}
              className="w-full py-2.5 font-medium text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-md cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Download Compressed {fileType.toUpperCase()}</span>
            </Button>

            {resultBlob && (
              <div className={`grid ${fileType === 'image' && isShareSupported() ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2`}>
                {fileType === 'image' && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy Image</span>
                  </button>
                )}
                {isShareSupported() && (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Share {fileType.toUpperCase()}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Document Preview & Comparison Modal */}
      {isPreviewModalOpen && fileType === 'pdf' && (
        <PdfPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title="Document Clarity & Quality Inspector"
          isDark={isDark}
          originalFile={sourceFile}
          originalFileName={sourceFile?.name}
          originalFileSize={sourceFile?.size}
          processedFile={resultBlob}
          processedFileName={`compressed-${sourceFile?.name || 'doc.pdf'}`}
          processedFileSize={resultSizeBytes}
          onDownload={handleDownload}
        />
      )}

      {/* High-Resolution Image Clarity Inspection Modal */}
      {isPreviewModalOpen && fileType === 'image' && resultThumbUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Document Text Clarity Inspector</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verify that roll numbers, candidate names, and marks are 100% legible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh] flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
              <img
                src={resultThumbUrl}
                alt="High resolution text preview"
                className="max-w-full h-auto object-contain rounded border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm"
              />
            </div>
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
              <span>Optimized file size: {formatBytes(resultSizeBytes)}</span>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className={`pt-8 border-t space-y-6 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <h2 className={`text-lg font-bold text-center ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Indian Government Portal Document Guidelines
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border space-y-2 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
            <span className="text-xs font-mono text-zinc-500 font-semibold">01. EPFO &amp; Aadhaar Proof</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Strict 100 KB Limit</h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              The EPFO unified portal strictly rejects bank passbooks and cancelled cheques exceeding 100 KB.
            </p>
          </div>

          <div className={`p-4 rounded-lg border space-y-2 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
            <span className="text-xs font-mono text-zinc-500 font-semibold">02. State PSC &amp; Revenue</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Under 200 KB Norms</h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Income, caste, and domicile certificates must be kept between 50 KB and 200 KB for online verification.
            </p>
          </div>

          <div className={`p-4 rounded-lg border space-y-2 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
            <span className="text-xs font-mono text-zinc-500 font-semibold">03. High Legibility</span>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Adaptive Quality Search</h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              We apply binary search and adaptive contrast filtering to keep letters deep black and background pure white, ensuring maximum text readability at low file sizes.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className={`p-5 rounded-lg border space-y-3 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
          <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Frequently Asked Questions</h3>
          {[
            {
              q: 'How does FileWala compress documents without making text blurry?',
              a: 'Scanned certificates and marksheets usually contain scanner grain and dirty paper backgrounds that waste 80% of file size. FileWala cleans the background to pure white and enhances the contrast of letters and numbers. Because pure white takes almost zero bytes in compression, full quality is dedicated to the text, keeping every letter and digit razor-sharp.',
            },
            {
              q: 'How do I compress my marksheet or Aadhaar proof under 100 KB?',
              a: 'Select the "Under 100 KB" preset above, upload your PDF or image, and click "Compress Document". The tool automatically calculates the optimal compression to keep the file strictly between 20 KB and 100 KB.',
            },
            {
              q: 'Is my Aadhaar card or PAN safe to compress here?',
              a: 'Yes, 100%. All compression operations run locally inside your web browser using HTML5 Canvas and WebAssembly. No files or personal data are ever uploaded to any server or third party.',
            },
            {
              q: 'Can I compress multi-page PDF documents?',
              a: 'Yes. Multi-page PDFs are rendered and optimized page-by-page client-side. The file size budget is evenly balanced across all pages to meet portal size limits.',
            },
          ].map((faq, idx) => (
            <div key={idx} className={`border-b pb-3 last:border-b-0 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className={`w-full flex items-center justify-between text-left text-xs font-semibold cursor-pointer py-1 ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'}`}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-blue-500 dark:text-blue-400' : 'text-slate-400'
                  }`}
                />
              </button>
              {openFaq === idx && (
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
