'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Crop,
  Layers,
  Scissors,
  Image as ImageIcon,
  FileCheck,
  Zap,
  Award,
  Sparkles,
  ArrowRight,
  FileText,
  Sliders,
  Smile,
  Type,
  FileCode,
} from 'lucide-react';
import { DetectedFileSummary, DetectedToolTarget } from '../../utils/fileTypeDetector';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';

interface ToolSelectorModalProps {
  isOpen: boolean;
  files: File[] | null;
  summary: DetectedFileSummary | null;
  onSelectTool: (target: DetectedToolTarget, files: File[]) => void;
  onClose: () => void;
}

interface ToolOption {
  target: DetectedToolTarget;
  title: string;
  tagline: string;
  badge?: string;
  accentColor: string;
}

export const ToolSelectorModal: React.FC<ToolSelectorModalProps> = ({
  isOpen,
  files,
  summary,
  onSelectTool,
  onClose,
}) => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Generate thumbnail preview for dropped image files
  useEffect(() => {
    if (!files || files.length === 0) {
      setImagePreview(null);
      return;
    }
    const first = files[0];
    if (first && first.type.startsWith('image/')) {
      const url = URL.createObjectURL(first);
      setImagePreview(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImagePreview(null);
    }
  }, [files]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build comprehensive, curated tool options based on the detected file category
  const toolOptions = useMemo<ToolOption[]>(() => {
    if (!summary || !files || files.length === 0) return [];

    const first = files[0];
    const category = summary.category;
    const isImage = category === 'image' || first.type.startsWith('image/');
    const isPdf = category === 'pdf' || first.type.includes('pdf') || first.name.toLowerCase().endsWith('.pdf');
    const isHeic = category === 'heic' || first.name.toLowerCase().endsWith('.heic');

    if (isImage) {
      const options: ToolOption[] = [
        {
          target: {
            section: 'image-tools',
            subToolId: 'compressor',
            name: 'Image Compressor',
            tagline: 'Reduce PNG, JPEG, WebP file sizes by up to 90% with live split slider',
            iconType: 'compress',
            badge: 'Popular -90%',
          },
          title: language === 'hi' ? 'कंप्रेस इमेज (Compress)' : 'Image Compressor',
          tagline:
            language === 'hi'
              ? 'बिना क्वालिटी खोए फोटो साइज कम करें'
              : 'Reduce PNG, JPEG, WebP file sizes by up to 90%',
          badge: 'Popular',
          accentColor: 'from-emerald-500 to-teal-600',
        },
        {
          target: {
            section: 'image-tools',
            subToolId: 'resizer',
            name: 'Image Resizer',
            tagline: 'Resize dimensions by pixels or percentage with aspect ratio lock',
            iconType: 'resize',
            badge: 'Dimensions',
          },
          title: language === 'hi' ? 'रीसाइज़ इमेज (Resize)' : 'Image Resizer',
          tagline:
            language === 'hi'
              ? 'पिक्सेल या प्रतिशत के अनुसार चौड़ाई और ऊंचाई बदलें'
              : 'Scale dimensions by pixels or presets with aspect lock',
          badge: 'Presets',
          accentColor: 'from-blue-500 to-indigo-600',
        },
        {
          target: {
            section: 'image-tools',
            subToolId: 'cropper',
            name: 'Crop & Rotate',
            tagline: 'Crop aspect ratios (1:1, 16:9, 4:3), rotate 90°, and flip',
            iconType: 'crop',
            badge: 'Framing',
          },
          title: language === 'hi' ? 'क्रॉप और रोटेट (Crop)' : 'Crop & Rotate',
          tagline:
            language === 'hi'
              ? 'सोशल मीडिया आस्पेक्ट रेशियो और रोटेशन सेट करें'
              : 'Crop aspect ratios (1:1, 16:9, 4:3) and rotate',
          badge: 'Aspect Ratio',
          accentColor: 'from-amber-500 to-orange-600',
        },
        {
          target: {
            section: 'convert',
            subToolId: 'png-to-webp',
            name: 'Format Converter',
            tagline: 'Transcode between WebP, PNG, JPG, and AVIF client-side',
            iconType: 'convert',
            badge: 'Convert',
          },
          title: language === 'hi' ? 'फॉर्मेट कन्वर्टर (Convert)' : 'Format Converter',
          tagline:
            language === 'hi'
              ? 'WebP, JPG, PNG या AVIF में तेजी से बदलें'
              : 'Convert format to WebP, JPG, PNG or AVIF',
          badge: 'Next-Gen',
          accentColor: 'from-violet-500 to-purple-600',
        },
        {
          target: {
            section: 'image-tools',
            subToolId: 'watermark',
            name: 'Add Watermark',
            tagline: 'Apply custom text copyright stamp or logo overlay',
            iconType: 'word',
            badge: 'Branding',
          },
          title: language === 'hi' ? 'वॉटरमार्क लगाएं (Watermark)' : 'Add Watermark',
          tagline:
            language === 'hi'
              ? 'अपनी फोटो पर कॉपीराइट टेक्स्ट या लोगो लगाएं'
              : 'Apply custom text watermark or logo stamp',
          badge: 'Branding',
          accentColor: 'from-sky-500 to-cyan-600',
        },
        {
          target: {
            section: 'image-tools',
            subToolId: 'adjust',
            name: 'Filters & Adjust',
            tagline: 'Fine-tune exposure, brightness, contrast, and monochrome',
            iconType: 'govt',
            badge: 'Creative',
          },
          title: language === 'hi' ? 'फिल्टर और एडजस्ट' : 'Filters & Adjust',
          tagline:
            language === 'hi'
              ? 'ब्राइटनेस, कंट्रास्ट और कलर टोन सेट करें'
              : 'Fine-tune exposure, contrast, and color balance',
          badge: 'Photo Edit',
          accentColor: 'from-rose-500 to-pink-600',
        },
        {
          target: {
            section: 'document-tools',
            subToolId: 'gov-compressor',
            name: 'Gov Form Compressor',
            tagline: 'Strict <100 KB, <200 KB, or <500 KB limit for govt portals',
            iconType: 'govt',
            badge: 'Govt Ready',
          },
          title: language === 'hi' ? 'सरकारी फॉर्म कंप्रेसर' : 'Gov Form Compressor',
          tagline:
            language === 'hi'
              ? 'EPFO/SSC/UPSC के लिए 20KB, 50KB, 100KB साइज'
              : 'Strict <50KB, <100KB limits for official portals',
          badge: 'Govt Size',
          accentColor: 'from-emerald-600 to-green-700',
        },
        {
          target: {
            section: 'pdf-tools',
            subToolId: 'image-to-pdf',
            name: 'Image to PDF',
            tagline: 'Compile photos into a clean, ready-to-share PDF document',
            iconType: 'file',
            badge: 'PDF',
          },
          title: language === 'hi' ? 'इमेज से पीडीएफ (PDF)' : 'Image to PDF',
          tagline:
            language === 'hi'
              ? 'फोटो को पीडीएफ डॉक्यूमेंट में बदलें'
              : 'Compile image into a clean printable PDF',
          badge: 'Document',
          accentColor: 'from-red-500 to-rose-600',
        },
      ];
      return options;
    }

    if (isPdf) {
      const options: ToolOption[] = [
        {
          target: {
            section: 'pdf-tools',
            subToolId: 'compress-pdf',
            name: 'Compress PDF',
            tagline: 'Reduce PDF file size while preserving text clarity and graphics',
            iconType: 'compress',
            badge: 'Recommended',
          },
          title: language === 'hi' ? 'कंप्रेस पीडीएफ (Compress)' : 'Compress PDF',
          tagline:
            language === 'hi'
              ? 'पीडीएफ का साइज कम करें बिना टेक्स्ट ब्लर किए'
              : 'Reduce PDF file size while preserving sharp text',
          badge: 'Recommended',
          accentColor: 'from-emerald-500 to-teal-600',
        },
        {
          target: {
            section: 'pdf-tools',
            subToolId: 'merge-pdf',
            name: 'Merge PDF',
            tagline: 'Combine multiple PDF documents into a single organized file',
            iconType: 'merge',
            badge: 'Combine',
          },
          title: language === 'hi' ? 'पीडीएफ मर्ज करें (Merge)' : 'Merge PDF',
          tagline:
            language === 'hi'
              ? 'कई पीडीएफ फाइलों को एक साथ जोड़ें'
              : 'Combine multiple PDF documents into one file',
          badge: 'Multi-Page',
          accentColor: 'from-blue-500 to-indigo-600',
        },
        {
          target: {
            section: 'pdf-tools',
            subToolId: 'split-pdf',
            name: 'Split PDF',
            tagline: 'Extract specific pages or separate into multiple documents',
            iconType: 'split',
            badge: 'Pages',
          },
          title: language === 'hi' ? 'पीडीएफ स्प्लिट करें (Split)' : 'Split PDF',
          tagline:
            language === 'hi'
              ? 'पेज अलग करें या जरूरी पन्ने निकालें'
              : 'Extract specific pages or split document',
          badge: 'Extract',
          accentColor: 'from-amber-500 to-orange-600',
        },
        {
          target: {
            section: 'pdf-tools',
            subToolId: 'pdf-to-jpg',
            name: 'PDF to Images',
            tagline: 'Export each PDF page as high-resolution JPG or PNG',
            iconType: 'image',
            badge: 'Export',
          },
          title: language === 'hi' ? 'पीडीएफ से इमेज (PDF to JPG)' : 'PDF to Images',
          tagline:
            language === 'hi'
              ? 'पीडीएफ के पन्नों को फोटो में बदलें'
              : 'Export every page as high-res JPG or PNG',
          badge: 'JPG / PNG',
          accentColor: 'from-violet-500 to-purple-600',
        },
        {
          target: {
            section: 'pdf-tools',
            subToolId: 'pdf-to-word',
            name: 'PDF to Word (DOCX)',
            tagline: 'Convert document into editable Microsoft Word format',
            iconType: 'word',
            badge: 'DOCX',
          },
          title: language === 'hi' ? 'पीडीएफ से वर्ड (Word)' : 'PDF to Word',
          tagline:
            language === 'hi'
              ? 'एडिटेबल माइक्रोसॉफ्ट वर्ड में बदलें'
              : 'Convert document into editable Word document',
          badge: 'Editable',
          accentColor: 'from-sky-500 to-blue-700',
        },
      ];
      return options;
    }

    if (isHeic) {
      return [
        {
          target: {
            section: 'convert',
            subToolId: 'heic-to-jpg',
            name: 'HEIC to JPG Converter',
            tagline: 'Convert Apple iPhone photos to universal high-quality JPEG in-browser',
            iconType: 'convert',
            badge: 'Direct Decoder',
          },
          title: 'HEIC to JPG Converter',
          tagline: 'Convert Apple iPhone photos to universal high-quality JPEG',
          badge: 'Recommended',
          accentColor: 'from-blue-500 to-indigo-600',
        },
        {
          target: {
            section: 'image-tools',
            subToolId: 'compressor',
            name: 'Image Compressor',
            tagline: 'Compress and optimize file size',
            iconType: 'compress',
          },
          title: 'Image Compressor',
          tagline: 'Compress and optimize file size',
          badge: 'Optimize',
          accentColor: 'from-emerald-500 to-teal-600',
        },
      ];
    }

    // Default alternatives from summary
    const all = [summary.primaryTarget, ...(summary.alternativeTargets || [])];
    return all.map((target, idx) => ({
      target,
      title: target.name,
      tagline: target.tagline,
      badge: target.badge || (idx === 0 ? 'Recommended' : undefined),
      accentColor: idx === 0 ? 'from-blue-500 to-indigo-600' : 'from-slate-600 to-slate-800',
    }));
  }, [summary, files, language]);

  if (!isOpen || !files || files.length === 0) return null;

  const firstFile = files[0];
  const fileCount = files.length;
  const fileName = firstFile.name;
  const fileSize = summary?.formattedSize || `${(firstFile.size / 1024).toFixed(1)} KB`;

  const renderIcon = (iconType: string, className = 'w-5 h-5') => {
    switch (iconType) {
      case 'compress':
        return <Minimize2 className={className} />;
      case 'resize':
        return <Maximize2 className={className} />;
      case 'crop':
        return <Crop className={className} />;
      case 'merge':
        return <Layers className={className} />;
      case 'split':
        return <Scissors className={className} />;
      case 'word':
        return <FileCheck className={className} />;
      case 'image':
        return <ImageIcon className={className} />;
      case 'convert':
        return <Zap className={className} />;
      case 'govt':
        return <Award className={className} />;
      default:
        return <FileText className={className} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-selector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg border overflow-hidden transition-colors duration-150 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 sm:px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 ${
            isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
              <Sparkles className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div className="min-w-0">
              <h2
                id="tool-selector-title"
                className="text-base sm:text-lg font-bold truncate leading-tight tracking-tight"
              >
                {language === 'hi' ? 'अपनी फाइल के लिए टूल चुनें' : 'Choose a Tool for Your File'}
              </h2>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'hi'
                  ? 'चुनें कि आप इस फाइल को कैसे प्रोसेस करना चाहते हैं'
                  : 'Select an action to launch with your uploaded file preloaded'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropped File Overview Strip */}
        <div
          className={`px-5 sm:px-7 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200/70 bg-slate-100/60'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {imagePreview ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700/50 shrink-0 bg-slate-900">
                <img
                  src={imagePreview}
                  alt={fileName}
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-white border-slate-200 text-blue-600'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm truncate block">{fileName}</span>
                {fileCount > 1 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold shrink-0">
                    +{fileCount - 1} more
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] opacity-75 font-mono">
                <span>{fileSize}</span>
                <span>•</span>
                <span className="truncate">{summary?.detectedMimeOrExt || 'File'}</span>
              </div>
            </div>
          </div>

          <span
            className={`hidden sm:inline-block text-[11px] font-medium px-2.5 py-1 rounded-lg border ${
              isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            100% Client-Side Engine
          </span>
        </div>

        {/* Scrollable Tool Selection Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {toolOptions.map((opt) => {
              return (
                <button
                  key={`${opt.target.section}-${opt.target.subToolId}`}
                  onClick={() => onSelectTool(opt.target, files)}
                  type="button"
                  className={`group relative text-left p-3.5 rounded-lg border transition-colors duration-150 cursor-pointer flex items-start gap-3 select-none ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-850'
                      : 'bg-white border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0"
                  >
                    {renderIcon(opt.target.iconType, 'w-4 h-4')}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3
                        className={`text-sm font-bold truncate leading-snug group-hover:text-blue-500 transition-colors ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {opt.title}
                      </h3>
                      {opt.badge && (
                        <span
                          className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded-full shrink-0 border ${
                            isDark
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs line-clamp-2 leading-relaxed ${
                        isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600 group-hover:text-slate-700'
                      }`}
                    >
                      {opt.tagline}
                    </p>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 mt-3 transition-transform duration-200 group-hover:translate-x-1 opacity-0 group-hover:opacity-100 ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 sm:px-7 py-3.5 border-t flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Press <kbd className="px-1.5 py-0.5 rounded border border-slate-600/40 font-mono text-[10px]">Esc</kbd> to cancel
          </span>

          <button
            onClick={onClose}
            type="button"
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
