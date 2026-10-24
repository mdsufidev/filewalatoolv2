'use client';

import React, { useState } from 'react';
import {
  FileText,
  Minimize2,
  Maximize2,
  Crop,
  Layers,
  Scissors,
  Image as ImageIcon,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Zap,
  Sparkles,
  Award,
  X,
  UploadCloud,
} from 'lucide-react';
import { DetectedFileSummary, DetectedToolTarget } from '../../utils/fileTypeDetector';
import { useTheme } from '../../core/themeContext';

interface GlobalDropOverlayProps {
  isVisible: boolean;
  detectedSummary: DetectedFileSummary | null;
  activeToolName?: string | null;
  onSelectAndLaunch: (target: DetectedToolTarget, files: File[]) => void;
  onCancel: () => void;
  droppedFiles: File[] | null;
}

export const GlobalDropOverlay: React.FC<GlobalDropOverlayProps> = ({
  isVisible,
  detectedSummary,
  activeToolName,
  onSelectAndLaunch,
  onCancel,
  droppedFiles,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoveredTarget, setHoveredTarget] = useState<DetectedToolTarget | null>(null);

  if (!isVisible && !droppedFiles) return null;

  const summary = detectedSummary;
  const primary = summary?.primaryTarget;
  const alternatives = summary?.alternativeTargets || [];

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

  const handleDropOnAlternative = (
    e: React.DragEvent,
    altTarget: DetectedToolTarget
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    onSelectAndLaunch(altTarget, files.length > 0 ? files : droppedFiles || []);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global File Drop Zone"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 transition-all duration-150 animate-in fade-in select-none pointer-events-none"
    >
      {/* Main Flat 2D Drop HUD Card (Swiss / Linear Minimalist) */}
      <div
        className={`relative w-full max-w-2xl rounded-lg border-2 border-dashed p-6 sm:p-8 flex flex-col items-center text-center transition-colors duration-150 pointer-events-auto ${
          isDark
            ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
            : 'bg-white border-zinc-400 text-zinc-900'
        }`}
      >
        {/* Close / Dismiss button */}
        <button
          onClick={onCancel}
          type="button"
          aria-label="Close drag overlay"
          className={`absolute top-4 right-4 p-1.5 rounded-md transition-colors cursor-pointer ${
            isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Central Drop Icon (Flat 2D, No Bouncy Animations) */}
        <div className="mb-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            {activeToolName ? (
              <UploadCloud className="w-6 h-6 stroke-[1.75]" />
            ) : summary ? (
              renderIcon(hoveredTarget?.iconType || primary?.iconType || 'file', 'w-6 h-6 stroke-[1.75]')
            ) : (
              <UploadCloud className="w-6 h-6 stroke-[1.75]" />
            )}
          </div>
        </div>

        {/* Dynamic File Detection Header */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <span>
              {activeToolName
                ? `Active Tool: ${activeToolName}`
                : summary?.categoryLabel || 'Files Ready from Computer'}
            </span>
            {summary?.formattedSize && (
              <span className="opacity-75 font-normal">
                • {summary.formattedSize}
              </span>
            )}
          </div>

          <h2
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-zinc-950'
            }`}
          >
            {activeToolName ? (
              <>Drop to Load Into {activeToolName}</>
            ) : (
              <>Drop to Choose Tool Action</>
            )}
          </h2>

          <p
            className={`text-xs sm:text-sm max-w-md mx-auto ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            {activeToolName
              ? `Your file will immediately load into your open ${activeToolName} workspace.`
              : 'Release your file to choose between Compress, Resize, Crop, and more tools.'}
          </p>
        </div>

        {/* Quick Alternative Tools if on home/catalog */}
        {!activeToolName && alternatives.length > 0 && (
          <div className="w-full text-left space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Or drop directly onto a tool:
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Direct Launch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alternatives.slice(0, 4).map((alt) => {
                const isSelected = hoveredTarget?.subToolId === alt.subToolId;
                return (
                  <div
                    key={alt.subToolId}
                    onDragEnter={() => setHoveredTarget(alt)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoveredTarget(alt);
                    }}
                    onDrop={(e) => handleDropOnAlternative(e, alt)}
                    className={`p-2.5 rounded-lg border transition-colors duration-150 cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? isDark
                          ? 'bg-zinc-800 border-zinc-500'
                          : 'bg-zinc-100 border-zinc-950'
                        : isDark
                        ? 'bg-zinc-850/60 border-zinc-800 hover:border-zinc-700'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? isDark
                            ? 'bg-zinc-700 border-zinc-600 text-white'
                            : 'bg-white border-zinc-300 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-800 border-zinc-750 text-zinc-300'
                          : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {renderIcon(alt.iconType, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">
                        {alt.name}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {alt.tagline}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Privacy & Trust Footer Bar */}
        <div
          className={`w-full pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
            isDark
              ? 'border-zinc-800 text-zinc-400'
              : 'border-zinc-200 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>100% In-Browser Privacy • Zero Server Uploads</span>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">ESC</kbd> to cancel
          </div>
        </div>
      </div>
    </div>
  );
};
