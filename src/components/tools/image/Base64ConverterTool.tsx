import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, Code, FileCode, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { ImageToolGuideSection } from './ImageToolGuideSection';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { formatBytes } from '../../../utils/memory';
import { useTheme } from '../../../core/themeContext';

export const Base64ConverterTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onNotify }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [base64String, setBase64String] = useState<string>('');
  const [format, setFormat] = useState<'raw' | 'data-uri' | 'html' | 'css' | 'markdown'>('data-uri');
  const [copied, setCopied] = useState<boolean>(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64String(result);
      onNotify('Base64 Encoded!', `Processed ${f.name}`, 'success');
    };
    reader.readAsDataURL(f);
  };

  const getFormattedOutput = useCallback(() => {
    if (!base64String) return '';
    const rawData = base64String.split(',')[1] || '';

    switch (format) {
      case 'raw':
        return rawData;
      case 'data-uri':
        return base64String;
      case 'html':
        return `<img src="${base64String}" alt="${file?.name || 'image'}" />`;
      case 'css':
        return `background-image: url("${base64String}");`;
      case 'markdown':
        return `![${file?.name || 'image'}](${base64String})`;
    }
  }, [base64String, format, file?.name]);

  const handleCopy = useCallback(() => {
    const text = getFormattedOutput();
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
          onNotify('Copied to Clipboard!', `${format.toUpperCase()} snippet copied.`, 'success');
        })
        .catch((err) => {
          onNotify('Copy Failed', err?.message || 'Clipboard access blocked by browser.', 'error');
        });
    } else {
      onNotify('Copy Failed', 'Clipboard API not supported in this browser.', 'error');
    }
  }, [getFormattedOutput, format, onNotify]);

  const handleReset = useCallback(() => {
    setFile(null);
    setBase64String('');
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        if (file) {
          e.preventDefault();
          handleReset();
          onNotify('Reset', 'Cleared workspace.', 'info');
          return;
        }
      }

      if (e.key === 'c' || e.key === 'C' || e.key === 'Enter') {
        if (base64String) {
          e.preventDefault();
          handleCopy();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [file, base64String, handleCopy, handleReset, onNotify]);

  const outputText = getFormattedOutput();
  const base64Length = outputText.length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 select-none">
      {/* Header Section */}
      {!file ? (
        <div className="space-y-3 sm:space-y-3.5">
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Client-Side Engine · Zero Uploads</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Image to Base64 Converter
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Convert image files into Base64 strings, Data URIs, HTML tags, or CSS embed snippets with zero server upload.
            </p>
          </div>

          <div className="max-w-[700px] mx-auto">
            <Dropzone
              onFilesSelected={(files) => handleFile(files[0])}
              title="Drop image to convert to Base64"
              description="PNG, JPG, SVG, WebP, GIF supported · 100% Client-Side"
              className="h-[230px] sm:h-[260px] lg:h-[280px]"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {/* Active Workspace Top Header Bar */}
          <div className="flex items-center justify-between gap-2 px-1 py-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Image to Base64
              </span>
              <span className="hidden md:inline-block text-[11px] font-mono text-zinc-400 truncate max-w-[120px]">
                {file.name}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400">
                ({formatBytes(file.size)} → ~{formatBytes(base64Length)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change Image</span>
              </button>

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <div
            className={`p-3 sm:p-4 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            {/* Format Selector Pills (Soft Tiles) */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Output Format
              </span>
              <div className="flex flex-wrap gap-1 text-xs">
                {[
                  { id: 'data-uri', label: 'Data URI' },
                  { id: 'html', label: 'HTML <img>' },
                  { id: 'css', label: 'CSS url()' },
                  { id: 'markdown', label: 'Markdown' },
                  { id: 'raw', label: 'Raw Base64' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      format === fmt.id
                        ? isDark
                          ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                          : 'bg-zinc-900 text-white shadow-xs font-semibold'
                        : isDark
                          ? 'bg-zinc-850 text-zinc-400 hover:text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Area */}
            <div className="relative">
              <textarea
                readOnly
                rows={6}
                value={outputText}
                className="w-full max-h-[180px] sm:max-h-[220px] p-2.5 sm:p-3 font-mono text-[11px] bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none select-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <div className="pt-2">
        <ImageToolGuideSection toolId="image-to-base64" />
      </div>
    </div>
  );
};
