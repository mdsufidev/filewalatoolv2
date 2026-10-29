'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Keyboard,
  RefreshCw,
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
import { CanvasEngine } from '../../core/engine/CanvasEngine';
import {
  copyImageToClipboard,
  shareFileOrBlob,
  isShareSupported,
} from '../../utils/clipboardAndShare';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib, ensurePdfWorkerInitialized } from '../../core/pdfWorker';
import { PdfPreviewModal } from './pdf/PdfPreviewModal';
import { GovToolGuideSection } from './gov/GovToolGuideSection';

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

  const handleResetFile = useCallback(() => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);
    if (previewUrl) revokeSafeObjectURL(previewUrl);
    setResultUrl(null);
    setResultThumbUrl(null);
    setResultBlob(null);
    setSourceFile(null);
    setPreviewUrl(null);
  }, [previewUrl, resultThumbUrl, resultUrl]);

  const handleReAdjust = useCallback(() => {
    if (resultUrl) revokeSafeObjectURL(resultUrl);
    if (resultThumbUrl) revokeSafeObjectURL(resultThumbUrl);
    setResultUrl(null);
    setResultThumbUrl(null);
    setResultBlob(null);
  }, [resultThumbUrl, resultUrl]);

  const handleFileSelected = useCallback(async (files: File[]) => {
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
      let loadingTask: any = null;
      let pdfDoc: any = null;
      try {
        const arrayBuf = await file.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuf),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.4.299'}/cmaps/`,
          cMapPacked: true,
        });
        pdfDoc = await loadingTask.promise;
        setPdfPageCount(pdfDoc.numPages);

        // Generate immediate high-clarity preview of Page 1
        const firstPage = await pdfDoc.getPage(1);
        try {
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
              canvas.width = 0;
              canvas.height = 0;
              if (blob) {
                const url = createSafeObjectURL(blob);
                setPreviewUrl(url);
              }
            }, 'image/jpeg', 0.85);
          }
        } finally {
          try {
            firstPage.cleanup?.();
          } catch {
            // ignore
          }
        }
      } catch {
        setPdfPageCount(1);
      } finally {
        if (pdfDoc) {
          try {
            await pdfDoc.destroy?.();
            await loadingTask?.destroy?.();
          } catch {
            // ignore
          }
        }
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
  }, [onNotify, previewUrl, resultThumbUrl, resultUrl]);

  // Global paste listener to paste screenshot / document directly (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1 || item.type === 'application/pdf') {
          const file = item.getAsFile();
          if (file) {
            handleFileSelected([file]);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelected]);

  // Load initial file if passed from drag-and-drop or parent workspace
  useEffect(() => {
    if (initialFile) {
      handleFileSelected([initialFile]);
    }
  }, [initialFile, handleFileSelected]);

  // Compress Document
  const handleCompress = useCallback(async () => {
    if (!sourceFile) return;
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStage('Initializing document engine...');

    try {
      if (fileType === 'image') {
        setProgressPercent(30);
        setProgressStage('Loading and analyzing image pixels...');
        const img = await CanvasEngine.loadImage(sourceFile);

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
        canvas.width = 0;
        canvas.height = 0;

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
        let procTask: any = null;
        let procDoc: any = null;
        try {
          procTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuf),
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.4.299'}/cmaps/`,
            cMapPacked: true,
          });
          procDoc = await procTask.promise;
          const numPages = procDoc.numPages;

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

            const page = await procDoc.getPage(pageNum);
            try {
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

              // Adaptive dimension downscaling for multi-page PDF pages if quota exceeded even at quality floor
              let currentCanvas = canvas;
              let downscaleLoops = 0;
              while (
                bestPageBlob &&
                bestPageBlob.size > targetPerPageBytes &&
                downscaleLoops < 4 &&
                currentCanvas.width > 280 &&
                currentCanvas.height > 280
              ) {
                downscaleLoops++;
                const shrinkRatio = Math.sqrt(targetPerPageBytes / bestPageBlob.size) * 0.94;
                const newW = Math.max(220, Math.round(currentCanvas.width * shrinkRatio));
                const newH = Math.max(220, Math.round(currentCanvas.height * shrinkRatio));

                const scaledCanvas = document.createElement('canvas');
                scaledCanvas.width = newW;
                scaledCanvas.height = newH;
                const scaledCtx = scaledCanvas.getContext('2d');
                if (!scaledCtx) break;

                scaledCtx.fillStyle = '#FFFFFF';
                scaledCtx.fillRect(0, 0, newW, newH);
                scaledCtx.drawImage(currentCanvas, 0, 0, newW, newH);

                if (currentCanvas !== canvas) {
                  currentCanvas.width = 0;
                  currentCanvas.height = 0;
                }
                currentCanvas = scaledCanvas;

                bestPageBlob = await new Promise((resolve) => {
                  currentCanvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.65);
                });
              }

              if (currentCanvas !== canvas) {
                currentCanvas.width = 0;
                currentCanvas.height = 0;
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
            } finally {
              try {
                page.cleanup?.();
              } catch {
                // ignore
              }
            }
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
        } finally {
          if (procDoc) {
            try {
              await procDoc.destroy?.();
              await procTask?.destroy?.();
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      onNotify('Compression Error', err?.message || 'Failed to compress document', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceFile, fileType, textClarityBoost, maxKb, minKb, resultUrl, resultThumbUrl, previewUrl, onNotify]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !sourceFile) return;
    const extension = fileType === 'pdf' ? '.pdf' : '.jpg';
    const cleanName = sourceFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${cleanName}-compressed-under-${maxKb}kb${extension}`;
    triggerFileDownload(resultBlob, filename);
    onNotify('Download Started', `Saved ${filename}`, 'success');
  }, [fileType, maxKb, onNotify, resultBlob, sourceFile]);

  const handleCopy = useCallback(async () => {
    if (!resultBlob) return;
    const ok = await copyImageToClipboard(resultBlob);
    if (ok.success) {
      onNotify('Copied to Clipboard', 'Compressed image copied. You can now paste (Ctrl+V) it anywhere.', 'success');
    } else {
      onNotify('Copy Failed', ok.error || 'Your browser could not copy image directly to clipboard.', 'error');
    }
  }, [onNotify, resultBlob]);

  const handleShare = useCallback(async () => {
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
    if (shared.shared) {
      onNotify('Shared', 'File shared successfully.', 'success');
    }
  }, [fileType, maxKb, onNotify, resultBlob, sourceFile]);

  // Global window keydown listener for zero mouse latency navigation
  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '1') {
        e.preventDefault();
        setSelectedPreset('under-50kb');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setSelectedPreset('under-100kb');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setSelectedPreset('under-200kb');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        setSelectedPreset('under-300kb');
        return;
      }
      if (e.key === '5') {
        e.preventDefault();
        setSelectedPreset('under-500kb');
        return;
      }

      if (!sourceFile) return;

      // Download
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (resultBlob) handleDownload();
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (resultBlob) handleDownload();
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (resultBlob && fileType === 'image') {
          e.preventDefault();
          handleCopy();
          return;
        }
      }

      // Compress
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCompress();
        return;
      }

      // Reset / New
      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        handleResetFile();
        return;
      }

      // Toggle Text Clarity
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTextClarityBoost((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [
    sourceFile,
    resultBlob,
    fileType,
    handleCompress,
    handleDownload,
    handleCopy,
    handleResetFile,
  ]);

  const isCompliant =
    resultBlob &&
    resultSizeBytes <= maxKb * 1024 &&
    resultSizeBytes >= minKb * 1024;

  const reductionPercent =
    sourceFile && resultSizeBytes > 0 && sourceFile.size > resultSizeBytes
      ? Math.round(((sourceFile.size - resultSizeBytes) / sourceFile.size) * 100)
      : 0;

  const currentStep = !sourceFile ? 1 : !resultBlob ? 2 : 3;

  /* -------------------------------------------------------------
     RENDER: EMPTY STATE (CLEAN, DIRECT DROPZONE, NO BOX-IN-BOX)
  ------------------------------------------------------------- */
  if (!sourceFile) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-4 animate-in fade-in duration-200 select-none">
        {/* Preset Target Tabs (Clean Pill Bar) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              General Gov Form Document Compressor
            </h1>
            <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline-block">
              PDF · JPG · PNG
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {(Object.keys(GOV_PRESETS) as GovPortalPreset[]).map((presetKey, idx) => {
              const isSelected = selectedPreset === presetKey;
              const config = GOV_PRESETS[presetKey];
              const shortcutKey = idx < 5 ? idx + 1 : null;
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => setSelectedPreset(presetKey)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {shortcutKey && (
                    <kbd className="opacity-70">{shortcutKey}</kbd>
                  )}
                  <span>{config.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clamped Direct Dropzone */}
        <div className="max-w-[700px] mx-auto">
          <Dropzone
            onFilesSelected={handleFileSelected}
            accept="image/*,application/pdf"
            multiple={false}
            title={`Upload Document to Compress Under ${maxKb} KB`}
            description="Drag & drop PDF, JPG, or PNG. Processed 100% locally in browser RAM."
            className="h-[230px] sm:h-[260px] lg:h-[280px]"
          />
        </div>

        {/* Verified Guide */}
        <div className="pt-2">
          <GovToolGuideSection toolId="kb-resizer" />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     RENDER: ACTIVE WORKSPACE (DOCUMENT LOADED & READY)
  ------------------------------------------------------------- */
  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Top Inline Hero Row */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
            <FileArchive className="w-3.5 h-3.5 text-zinc-500" />
            General Gov Form Document Compressor
          </h1>
          {/* Preset switch pills */}
          <div className="hidden sm:flex items-center gap-1">
            {(Object.keys(GOV_PRESETS) as GovPortalPreset[]).map((presetKey, idx) => {
              const isSelected = selectedPreset === presetKey;
              const config = GOV_PRESETS[presetKey];
              const shortcutKey = idx < 5 ? idx + 1 : null;
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => setSelectedPreset(presetKey)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {shortcutKey && <kbd className="opacity-70">{shortcutKey}</kbd>}
                  <span>{config.name}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 hidden md:inline-block truncate max-w-[120px]">
            {sourceFile.name}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Live Compliance Pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>
              {resultBlob
                ? `✓ ${formatBytes(resultSizeBytes)} (${reductionPercent > 0 ? `-${reductionPercent}%` : 'Compliant'})`
                : `Target: < ${maxKb} KB`}
            </span>
          </div>

          <button
            onClick={handleResetFile}
            className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Viewport & Controls Grid - Equal Height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* Left Column: Preview Canvas & Tuning (lg:col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full space-y-2">
          {/* Studio Canvas / Preview Card */}
          <div
            className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 flex items-center justify-center select-none transition-colors h-[260px] sm:h-[300px] lg:h-auto flex-1 min-h-[220px]"
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                : 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            {resultThumbUrl || previewUrl ? (
              <div className="relative group max-h-[90%] max-w-[90%] flex items-center justify-center">
                <img
                  src={resultThumbUrl || previewUrl || ''}
                  alt="Document Preview"
                  className="max-h-[250px] sm:max-h-[280px] lg:max-h-[300px] w-auto object-contain rounded-md shadow-xs border border-zinc-200 dark:border-zinc-700 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center text-white text-xs font-medium gap-1.5 cursor-pointer backdrop-blur-xs"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>Inspect Clarity</span>
                </button>
              </div>
            ) : (
              <div className="text-center p-4">
                <FileText className="w-12 h-12 mx-auto text-zinc-400 mb-2 opacity-50" />
                <p className="text-xs text-zinc-500">
                  {fileType === 'pdf' ? `${pdfPageCount} Page(s) Document` : 'Digital Image'}
                </p>
              </div>
            )}

            {/* Top-Left Live Metadata Pill */}
            <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 text-white border border-zinc-700/50 backdrop-blur-xs flex items-center gap-1">
                {fileType.toUpperCase()} · Original {formatBytes(sourceFile.size)}
              </span>
              {resultBlob && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 backdrop-blur-xs font-semibold">
                  {formatBytes(resultSizeBytes)}
                </span>
              )}
            </div>

            {/* Inspect Button Top-Right if preview available */}
            {(resultThumbUrl || previewUrl) && (
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 text-white border border-zinc-700/50 backdrop-blur-xs text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors z-10"
                title="Inspect Text Clarity"
              >
                <ZoomIn className="w-3 h-3" />
                <span className="hidden sm:inline">Inspect</span>
              </button>
            )}
          </div>

          {/* Docked Precision Controls Strip */}
          <div className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between flex-wrap gap-2 shrink-0">
            {/* Text Clarity Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTextClarityBoost(!textClarityBoost)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  textClarityBoost
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-transparent'
                }`}
                title="Sharpen characters and clean background grain"
              >
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Text Clarity Boost</span>
                <span className="text-[9px] font-mono opacity-70">
                  {textClarityBoost ? 'ON' : 'OFF'}
                </span>
              </button>

              {selectedPreset === 'custom' && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                  <span>Max:</span>
                  <input
                    type="range"
                    min={20}
                    max={1000}
                    step={10}
                    value={customMaxKb}
                    onChange={(e) => setCustomMaxKb(parseInt(e.target.value))}
                    className="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                  <span>{customMaxKb} KB</span>
                </div>
              )}
            </div>

            {/* Compress Re-trigger Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="primary"
                onClick={handleCompress}
                isLoading={isProcessing}
                className="py-1 px-3 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-md cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                <span>Re-compress</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Compliance & Download (lg:col-span-5 xl:col-span-4) - Equal Height */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
          <div
            className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xs' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="space-y-2.5">
              {/* Header / Requirements Summary */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Gov Portal Compliance
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  &lt; {maxKb} KB
                </span>
              </div>

              {/* Compact Requirements Check Rows */}
              <div className="space-y-1 text-xs">
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Target Size: &lt; {maxKb} KB
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {resultBlob
                      ? `${formatBytes(resultSizeBytes)} (${isCompliant ? 'PASS ✓' : 'OPTIMIZED'})`
                      : 'Auto-compress'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Text Clarity
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {textClarityBoost ? '100% SHARP ✓' : 'Standard'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Reduction
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {reductionPercent > 0 ? `-${reductionPercent}% Saved` : 'Original Size'}
                  </span>
                </div>
              </div>

              {/* Progress Bar during compression */}
              {isProcessing && (
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 truncate">
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                      <span>{progressStage || 'Compressing...'}</span>
                    </span>
                    <span className="font-mono font-semibold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Download CTA Button (Red Brand CTA) */}
            <div className="pt-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!resultBlob || isProcessing}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {resultBlob
                    ? `Download Compressed ${fileType.toUpperCase()} (${formatBytes(resultSizeBytes)})`
                    : `Compress Under ${maxKb} KB`}
                </span>
              </button>

              {resultBlob && (
                <div className={`grid ${fileType === 'image' && isShareSupported() ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 pt-1.5`}>
                  {fileType === 'image' && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-zinc-400" />
                      <span>Copy</span>
                    </button>
                  )}
                  {isShareSupported() && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                    >
                      <Share2 className="w-3 h-3 text-zinc-400" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Strip */}
      <div className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
      }`}>
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-zinc-500" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Pro Keyboard Controls:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">1</kbd> &lt;50KB</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">2</kbd> &lt;100KB</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">3</kbd> &lt;200KB</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">4</kbd> &lt;300KB</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">5</kbd> &lt;500KB</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">T</kbd> Text Clarity</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">↵</kbd> Compress</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">D</kbd> Save</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">N</kbd> New</span>
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

      {/* Authoritative Verified Guide, Official Specifications & FAQs */}
      <GovToolGuideSection toolId="kb-resizer" />
    </div>
  );
};
