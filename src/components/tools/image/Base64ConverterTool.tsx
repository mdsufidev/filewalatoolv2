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

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Change Image</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            {/* Left Column: Image Canvas Preview (lg:col-span-7 xl:col-span-8) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between h-full gap-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {file.name}
                </span>
                <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {formatBytes(file.size)}
                </span>
              </div>

              <div
                className="relative rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 h-[380px] sm:h-[430px] lg:h-[480px] xl:h-[510px] flex-1 min-h-[360px] sm:min-h-[400px] lg:min-h-[460px] xl:min-h-[490px] flex items-center justify-center p-2.5 overflow-hidden select-none"
                style={{
                  backgroundImage: isDark
                    ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                    : 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <img
                  src={base64String}
                  alt={file.name}
                  className="max-h-[340px] sm:max-h-[390px] lg:max-h-[440px] xl:max-h-[470px] max-w-full object-contain rounded-lg shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Encoded locally in memory
                </span>
                <span className="font-mono">{formatBytes(base64Length)} Base64 payload</span>
              </div>
            </div>

            {/* Right Column: Code Snippet & Actions (lg:col-span-5 xl:col-span-4) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full">
              <div className="p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 space-y-3 transition-colors bg-white dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Output Format
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">~{formatBytes(base64Length)}</span>
                  </div>

                  {/* Format Selector Pills */}
                  <div className="grid grid-cols-3 gap-1">
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
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-center truncate ${
                          format === fmt.id
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>

                  {/* Text Area */}
                  <div className="relative pt-1">
                    <textarea
                      readOnly
                      rows={5}
                      value={outputText}
                      className="w-full h-[140px] p-2.5 font-mono text-[11px] bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-750 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none select-all leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {/* Primary Action Button: Red CTA */}
                <div className="pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Snippet Code'}</span>
                  </button>
                </div>
              </div>
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
