import React, { useState } from 'react';
import { Copy, Check, Code, FileCode, CheckCircle2, RefreshCw } from 'lucide-react';
import { Dropzone } from '../../ui/Dropzone';
import { Button } from '../../ui/Button';
import { formatBytes } from '../../../utils/memory';

export const Base64ConverterTool: React.FC<{
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onNotify }) => {
  const [file, setFile] = useState<File | null>(null);
  const [base64String, setBase64String] = useState<string>('');
  const [format, setFormat] = useState<'raw' | 'data-uri' | 'html' | 'css' | 'markdown'>('data-uri');
  const [copied, setCopied] = useState<boolean>(false);

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

  const getFormattedOutput = () => {
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
  };

  const handleCopy = () => {
    const text = getFormattedOutput();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify('Copied to Clipboard!', `${format.toUpperCase()} snippet copied.`, 'success');
  };

  const outputText = getFormattedOutput();
  const base64Length = outputText.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-1.5 max-w-xl mx-auto">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950">
          Image to Base64 Converter
        </h3>
        <p className="text-xs text-zinc-500">
          Target Keyword: <em>Convert image to Base64 string online</em>
        </p>
        <p className="text-xs text-zinc-400">
          Ideal for developers embedding small SVGs, icons, and avatars directly into HTML/CSS without external HTTP requests.
        </p>
      </div>

      {!file ? (
        <Dropzone
          onFilesSelected={(files) => handleFile(files[0])}
          title="Drop image to convert to Base64"
          description="PNG, JPG, SVG, WebP, GIF supported"
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center p-1">
                <img src={base64String} alt="Preview" className="max-h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 truncate max-w-xs">{file.name}</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                  <span>File: {formatBytes(file.size)}</span>
                  <span>·</span>
                  <span>Base64: ~{formatBytes(base64Length)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null);
                setBase64String('');
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Choose Another Image
            </Button>
          </div>

          {/* Format Selector Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
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
                  className={`px-3 py-1.5 rounded-xl font-medium border transition-colors cursor-pointer ${
                    format === fmt.id
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
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
              className="w-full p-4 font-mono text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 select-all leading-relaxed"
            />
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white font-semibold text-xs shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
