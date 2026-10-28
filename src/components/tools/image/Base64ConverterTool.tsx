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
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header Section */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Client-Side Engine · Zero Uploads</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Image to Base64 Converter
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Convert image files into Base64 strings, Data URIs, HTML tags, or CSS embed snippets with zero server upload.
        </p>
      </div>

      {!file ? (
        <div className="max-w-3xl mx-auto">
          <Dropzone
            onFilesSelected={(files) => handleFile(files[0])}
            title="Drop image to convert to Base64"
            description="PNG, JPG, SVG, WebP, GIF supported · 100% Client-Side"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Workspace Top Header Bar */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 border rounded-xl ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center p-1 shrink-0">
                <img src={base64String} alt="Preview" className="max-h-full object-contain" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold truncate max-w-xs">{file.name}</h4>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                  <span>File: {formatBytes(file.size)}</span>
                  <span>·</span>
                  <span>Base64: ~{formatBytes(base64Length)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Choose Another Image</span>
              </button>

              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            {/* Format Selector Pills (Soft Tiles) */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500">
                Embed Output Format
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: 'data-uri', label: 'Data URI (data:image/...)' },
                  { id: 'html', label: 'HTML <img> Tag' },
                  { id: 'css', label: 'CSS Background URL' },
                  { id: 'markdown', label: 'Markdown Image' },
                  { id: 'raw', label: 'Raw Base64 String' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setFormat(fmt.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
                rows={8}
                value={outputText}
                className="w-full p-4 font-mono text-xs bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none select-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
      {/* Educational Guide, Specs, Pro Tips & Schema-Matched FAQs */}
      <ImageToolGuideSection toolId="image-to-base64" />
    </div>
  );
};
