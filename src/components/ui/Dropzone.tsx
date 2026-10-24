import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { isValidImageFile } from '../../utils/memory';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/svg+xml',
  className = '',
  compact = false,
  title = 'Drag & drop image here',
  description = 'or browse files from your computer',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { language, t } = useLanguage();

  const defaultTitle = language === 'hi' ? 'यहाँ क्लिक करके फ़ोटो या फ़ाइल चुनें' : 'Click to choose your file';
  const defaultDesc =
    language === 'hi'
      ? 'या फ़ाइल यहाँ खींच कर लाएं (फ़ोन या कंप्यूटर से)'
      : 'or drag and drop here (from phone or laptop)';
  const displayTitle = title === 'Drag & drop image here' ? defaultTitle : title;
  const displayDesc = description === 'or browse files from your computer' ? defaultDesc : description;

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const incoming = Array.from(fileList);
      const allowsPdf = accept.toLowerCase().includes('pdf');
      const validFiles = incoming.filter((f) => {
        if (allowsPdf && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
          return true;
        }
        return isValidImageFile(f) || f.type.startsWith('image/');
      });

      if (validFiles.length === 0) {
        setErrorMessage(
          allowsPdf
            ? 'Please upload a valid image (PNG, JPG, WebP) or PDF file.'
            : 'Please upload a valid image file (PNG, JPG, WebP, AVIF, GIF, BMP).'
        );
        return;
      }

      const filesToPass = multiple ? validFiles : [validFiles[0]];
      onFilesSelected(filesToPass);
    },
    [accept, multiple, onFilesSelected]
  );

  // Global paste handler when dropzone is in view
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        handleFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center border border-dashed rounded-lg transition-colors duration-150 cursor-pointer ${
          compact ? 'p-6' : 'p-10 md:p-12'
        } ${
          isDragOver
            ? isDark
              ? 'border-zinc-400 bg-zinc-800/60'
              : 'border-zinc-500 bg-zinc-100/70'
            : isDark
              ? 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700'
              : 'border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-400'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
            }
            e.target.value = '';
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center max-w-md">
          <div
            className={`rounded-md border flex items-center justify-center transition-colors duration-150 ${
              compact ? 'w-10 h-10 mb-2.5' : 'w-12 h-12 mb-3.5'
            } ${
              isDark
                ? 'bg-zinc-850 border-zinc-750 text-zinc-300'
                : 'bg-white border-zinc-200 text-zinc-700'
            }`}
          >
            <UploadCloud className="w-5 h-5 stroke-[1.8]" />
          </div>

          <h3
            className={`text-sm md:text-base font-semibold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            {isDragOver
              ? language === 'hi'
                ? 'फ़ाइल अभी यहाँ छोड़ें'
                : 'Drop files here right now'
              : displayTitle}
          </h3>

          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {displayDesc}
          </p>

          <div
            className={`flex flex-wrap items-center justify-center gap-2 mt-3.5 text-[11px] font-mono ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            <span>
              {language === 'hi'
                ? 'JPG, PNG, WebP, PDF समर्थित'
                : 'Supports JPG, PNG, WebP, AVIF, GIF, BMP'}
            </span>
            <span>·</span>
            <span>
              {language === 'hi'
                ? 'पेस्ट (Ctrl+V) भी कर सकते हैं'
                : 'Paste (Ctrl+V) anywhere'}
            </span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {language === 'hi'
                ? '🔒 100% प्राइवेट (डिवाइस में प्रोसेस)'
                : '🔒 100% Private (In-Browser)'}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          className={`flex items-center gap-2 mt-3 text-xs p-2.5 rounded-md border ${
            isDark
              ? 'bg-red-950/30 border-red-900/50 text-red-300'
              : 'bg-red-50/80 border-red-200 text-red-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
