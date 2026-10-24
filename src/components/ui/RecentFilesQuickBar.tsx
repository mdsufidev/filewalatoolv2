import React, { useState, useEffect } from 'react';
import {
  Clock,
  Download,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  HardDrive,
  Trash2,
} from 'lucide-react';
import {
  RecentFileRecord,
  getRecentFiles,
  downloadRecentFile,
  setPendingReProcess,
} from '../../utils/recentFiles';
import { formatBytes } from '../../utils/memory';
import { useTheme } from '../../core/themeContext';

interface RecentFilesQuickBarProps {
  onOpenRecentModal: () => void;
  onLaunchTool: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export const RecentFilesQuickBar: React.FC<RecentFilesQuickBarProps> = ({
  onOpenRecentModal,
  onLaunchTool,
  onNotify,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);

  useEffect(() => {
    setRecentFiles(getRecentFiles());

    const handleUpdate = () => {
      setRecentFiles(getRecentFiles());
    };
    window.addEventListener('filewala:recent-files-updated', handleUpdate);
    return () => window.removeEventListener('filewala:recent-files-updated', handleUpdate);
  }, []);

  if (recentFiles.length === 0) return null;

  const handleDownload = (file: RecentFileRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadRecentFile(file);
    onNotify?.(
      'Download Started',
      `Re-downloading ${file.name} directly from local browser cache.`,
      'success'
    );
  };

  const handleReProcess = (file: RecentFileRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingReProcess(file, file.toolId, file.toolSection);
    onLaunchTool(file.toolSection, file.toolId);
    onNotify?.(
      'Document Loaded',
      `${file.name} pre-loaded for editing without re-uploading.`,
      'info'
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-8 animate-in fade-in duration-200">
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Recent Files</h3>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {recentFiles.length} of 5
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                1-click re-download or re-process without re-uploading
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRecentModal}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              isDark
                ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-800'
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Quick Cards Scroll / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {recentFiles.map((file) => {
            const isPdf = file.mimeType.includes('pdf') || file.name.endsWith('.pdf');

            return (
              <div
                key={file.id}
                onClick={(e) => handleReProcess(file, e)}
                className={`p-2.5 rounded-xl border transition-all group flex flex-col justify-between cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90'
                    : 'bg-slate-50/80 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
                title={`Click to re-process in ${file.toolName}`}
              >
                <div>
                  {/* Thumbnail / Icon banner */}
                  <div
                    className={`relative w-full h-20 rounded-lg overflow-hidden border mb-2 flex items-center justify-center bg-slate-900/60 ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                      />
                    ) : isPdf ? (
                      <FileText className="w-8 h-8 text-rose-500" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-blue-500" />
                    )}

                    <div className="absolute top-1 right-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/80 text-white backdrop-blur-xs">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Tool */}
                  <h4
                    className="text-xs font-semibold truncate transition-colors group-hover:text-blue-400"
                    title={file.name}
                  >
                    {file.name}
                  </h4>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate max-w-[90px]" title={file.toolName}>
                      {file.toolName}
                    </span>
                    <span className="font-mono">{formatRelativeTime(file.timestamp)}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={(e) => handleDownload(file, e)}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                      isDark
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title="Download now"
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={(e) => handleReProcess(file, e)}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer border ${
                      isDark
                        ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                    title="Re-process without re-uploading"
                  >
                    <RefreshCw className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
