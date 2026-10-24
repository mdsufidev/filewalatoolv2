import React, { useState, useEffect } from 'react';
import {
  Clock,
  Download,
  RefreshCw,
  Trash2,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  HardDrive,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  RecentFileRecord,
  getRecentFiles,
  downloadRecentFile,
  removeRecentFile,
  clearRecentFiles,
  setPendingReProcess,
  MAX_RECENT_FILES,
} from '../../utils/recentFiles';
import { formatBytes } from '../../utils/memory';
import { useTheme } from '../../core/themeContext';

interface RecentFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchTool: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const RecentFilesModal: React.FC<RecentFilesModalProps> = ({
  isOpen,
  onClose,
  onLaunchTool,
  onNotify,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [files, setFiles] = useState<RecentFileRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [selectedAltTool, setSelectedAltTool] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFiles(getRecentFiles());
      setConfirmClear(false);
      setSelectedAltTool(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setFiles(getRecentFiles());
    };
    window.addEventListener('filewala:recent-files-updated', handleUpdate);
    return () => window.removeEventListener('filewala:recent-files-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleDownload = (file: RecentFileRecord) => {
    downloadRecentFile(file);
    onNotify?.(
      'Download Started',
      `Re-downloading ${file.name} directly from local browser cache.`,
      'success'
    );
  };

  const handleReProcess = (
    file: RecentFileRecord,
    altSection?: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    altToolId?: string
  ) => {
    const section = altSection || file.toolSection;
    const toolId = altToolId || file.toolId;

    setPendingReProcess(file, toolId, section);
    onClose();
    onLaunchTool(section, toolId);

    onNotify?.(
      'File Loaded For Re-Processing',
      `${file.name} pre-loaded into workspace without re-uploading.`,
      'info'
    );
  };

  const handleDelete = (id: string, name: string) => {
    removeRecentFile(id);
    onNotify?.('Removed from History', `${name} cleared from recent files.`, 'info');
  };

  const handleClearAll = () => {
    clearRecentFiles();
    setConfirmClear(false);
    onNotify?.('History Cleared', 'All recent files removed from localStorage.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg border overflow-hidden transition-colors duration-150 z-10 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
              <Clock className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Recent Files History</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {files.length}/{MAX_RECENT_FILES} Saved
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Re-download or resume editing your last 5 generated documents without re-uploading
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Local Storage Privacy Pill */}
        <div
          className={`px-6 py-2.5 flex items-center justify-between text-xs border-b ${
            isDark
              ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
              : 'bg-slate-50 border-slate-100 text-slate-600'
          }`}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Stored 100% locally in your browser's localStorage. Zero cloud telemetry.
          </span>

          {files.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}

          {confirmClear && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-400">Clear all 5 files?</span>
              <button
                onClick={handleClearAll}
                className="px-2 py-0.5 rounded bg-rose-600 text-white font-medium text-[10px] hover:bg-rose-500 transition-colors cursor-pointer"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {files.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <Clock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">No Recent Files Yet</h3>
                <p className={`text-xs max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Documents, resized photos, and compressed files you generate will appear here automatically. You can re-download or re-process them at any time.
                </p>
              </div>
            </div>
          ) : (
            files.map((file, idx) => {
              const isPdf = file.mimeType.includes('pdf') || file.name.endsWith('.pdf');
              const isImage = file.mimeType.startsWith('image/');

              return (
                <div
                  key={file.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* File Thumbnail & Meta */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Visual Thumbnail or Icon */}
                      <div
                        className={`w-12 h-12 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center bg-slate-900/40 ${
                          isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}
                      >
                        {file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : isPdf ? (
                          <FileText className="w-6 h-6 text-rose-500" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-blue-500" />
                        )}
                      </div>

                      {/* Text info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold truncate" title={file.name}>
                            {file.name}
                          </h4>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-400'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            {formatBytes(file.sizeBytes)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="text-blue-400 font-medium">{file.toolName}</span>
                          <span>·</span>
                          <span className="font-mono">{formatTimeAgo(file.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Re-Download, Re-Process, Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {/* Re-Download Button */}
                      <button
                        onClick={() => handleDownload(file)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                        title="Download this file directly"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      {/* Re-Process in Tool Button */}
                      <button
                        onClick={() => handleReProcess(file)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          isDark
                            ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                        }`}
                        title={`Open in ${file.toolName} without re-uploading`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Re-Process</span>
                      </button>

                      {/* Delete item */}
                      <button
                        onClick={() => handleDelete(file.id, file.name)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-rose-400 ${
                          isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100'
                        }`}
                        title="Remove from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Alternative Tool Quick Launch (Dropdown / Pills) */}
                  {selectedAltTool === file.id && (
                    <div
                      className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-1.5 text-xs ${
                        isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-[11px] font-medium mr-1">Re-process in:</span>
                      {[
                        { label: 'PAN Resizer', section: 'document-tools', id: 'pan-photo-resize' },
                        { label: 'Passport Resizer', section: 'document-tools', id: 'passport-photo-resize' },
                        { label: 'UPSC Maker', section: 'document-tools', id: 'upsc-photo-maker' },
                        { label: 'SSC Resizer', section: 'document-tools', id: 'ssc-resizer' },
                        { label: 'Compressor', section: 'image-tools', id: 'compressor' },
                        { label: 'Converter', section: 'convert', id: 'image-converter' },
                      ].map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleReProcess(file, tool.section as any, tool.id)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                          }`}
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Toggle alternative tools row */}
                  {selectedAltTool !== file.id && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => setSelectedAltTool(file.id)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Open in another tool...</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
          }`}
        >
          <span>Maximum {MAX_RECENT_FILES} recent documents stored</span>
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
