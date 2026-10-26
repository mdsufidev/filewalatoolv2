'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { MainNavSection } from '../layout/Navbar';
import { getToolRouteUrl } from '../../core/urlRoutes';

export interface MasterNavTool {
  id: string;
  name: string;
  subToolId: string;
  section: MainNavSection;
}

export interface MasterNavCategory {
  id: MainNavSection;
  name: string;
  hubUrl: string;
  tools: MasterNavTool[];
}

export const MASTER_NAV_DATA: MasterNavCategory[] = [
  {
    id: 'document-tools',
    name: 'Govt & Exam Forms',
    hubUrl: '/document-tools',
    tools: [
      { id: 'upsc-photo-maker', name: 'UPSC Photo Maker', subToolId: 'upsc-photo-maker', section: 'document-tools' },
      { id: 'ssc-resizer', name: 'SSC Photo & Sign', subToolId: 'ssc-resizer', section: 'document-tools' },
      { id: 'pan-photo-resize', name: 'PAN Photo Resizer', subToolId: 'pan-photo-resize', section: 'document-tools' },
      { id: 'signature-resize', name: 'PAN Signature Resizer', subToolId: 'signature-resize', section: 'document-tools' },
      { id: 'passport-photo-resize', name: 'Passport Photo Resizer', subToolId: 'passport-photo-resize', section: 'document-tools' },
      { id: 'passport-signature-resize', name: 'Passport Signature', subToolId: 'passport-signature-resize', section: 'document-tools' },
      { id: 'gov-compressor', name: 'Gov Form Compressor', subToolId: 'gov-compressor', section: 'document-tools' },
    ],
  },
  {
    id: 'image-tools',
    name: 'Image Tools',
    hubUrl: '/image-tools',
    tools: [
      { id: 'compressor', name: 'Image Compressor', subToolId: 'compressor', section: 'image-tools' },
      { id: 'resizer', name: 'Image Resizer', subToolId: 'resizer', section: 'image-tools' },
      { id: 'bg-remover', name: 'Background Remover', subToolId: 'bg-remover', section: 'image-tools' },
      { id: 'cropper', name: 'Image Cropper', subToolId: 'cropper', section: 'image-tools' },
      { id: 'batch', name: 'Batch Processor', subToolId: 'batch', section: 'image-tools' },
      { id: 'adjust', name: 'Filters & Adjust', subToolId: 'adjust', section: 'image-tools' },
      { id: 'rounded', name: 'Rounded Corners', subToolId: 'rounded', section: 'image-tools' },
      { id: 'watermark', name: 'Image Watermarker', subToolId: 'watermark', section: 'image-tools' },
    ],
  },
  {
    id: 'pdf-tools',
    name: 'PDF Tools',
    hubUrl: '/pdf-tools',
    tools: [
      { id: 'merge-pdf', name: 'Merge PDF', subToolId: 'merge-pdf', section: 'pdf-tools' },
      { id: 'compress-pdf', name: 'Compress PDF', subToolId: 'compress-pdf', section: 'pdf-tools' },
      { id: 'split-pdf', name: 'Split PDF', subToolId: 'split-pdf', section: 'pdf-tools' },
      { id: 'pdf-to-jpg', name: 'PDF to Images', subToolId: 'pdf-to-jpg', section: 'pdf-tools' },
      { id: 'image-to-pdf', name: 'Image to PDF', subToolId: 'image-to-pdf', section: 'pdf-tools' },
      { id: 'rotate-pdf', name: 'Rotate PDF', subToolId: 'rotate-pdf', section: 'pdf-tools' },
      { id: 'pdf-to-word', name: 'PDF to Word', subToolId: 'pdf-to-word', section: 'pdf-tools' },
      { id: 'pdf-to-text', name: 'PDF to Text (OCR)', subToolId: 'pdf-to-text', section: 'pdf-tools' },
    ],
  },
  {
    id: 'convert',
    name: 'Converters',
    hubUrl: '/convert-tools',
    tools: [
      { id: 'heic-to-jpg', name: 'HEIC to JPG', subToolId: 'heic-to-jpg', section: 'convert' },
      { id: 'png-to-webp', name: 'PNG to WebP', subToolId: 'png-to-webp', section: 'convert' },
      { id: 'webp-to-jpg', name: 'WebP to JPG', subToolId: 'webp-to-jpg', section: 'convert' },
      { id: 'jpg-to-png', name: 'JPG to PNG', subToolId: 'jpg-to-png', section: 'convert' },
      { id: 'png-to-jpg', name: 'PNG to JPG', subToolId: 'png-to-jpg', section: 'convert' },
      { id: 'svg-to-png', name: 'SVG to PNG', subToolId: 'svg-to-png', section: 'convert' },
      { id: 'avif-to-jpg', name: 'AVIF to JPG', subToolId: 'avif-to-jpg', section: 'convert' },
    ],
  },
];

export interface MasterDetailNavMenuProps {
  initialCategory?: MainNavSection;
  activeToolId?: string;
  activeSection?: MainNavSection | null;
  onSelectTool: (section: MainNavSection, subToolId: string) => void;
  onSelectCategoryHub: (section: MainNavSection) => void;
  onClose?: () => void;
  className?: string;
  mobileDrilldownCat?: MasterNavCategory | null;
  onMobileDrilldownChange?: (cat: MasterNavCategory | null) => void;
}

export const MasterDetailNavMenu: React.FC<MasterDetailNavMenuProps> = ({
  initialCategory = 'document-tools',
  activeToolId,
  activeSection,
  onSelectTool,
  onSelectCategoryHub,
  onClose,
  className = '',
  mobileDrilldownCat,
  onMobileDrilldownChange,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<MainNavSection>(initialCategory);
  const [internalMobileDrilldown, setInternalMobileDrilldown] = useState<MasterNavCategory | null>(null);

  const effectiveDrilldownCat =
    mobileDrilldownCat !== undefined ? mobileDrilldownCat : internalMobileDrilldown;

  const setDrilldownCat = (cat: MasterNavCategory | null) => {
    if (onMobileDrilldownChange) {
      onMobileDrilldownChange(cat);
    }
    setInternalMobileDrilldown(cat);
  };

  useEffect(() => {
    setActiveCategoryId(initialCategory);
  }, [initialCategory]);

  const activeCategory =
    MASTER_NAV_DATA.find((c) => c.id === activeCategoryId) || MASTER_NAV_DATA[0];

  const handleToolClick = (section: MainNavSection, subToolId: string) => {
    onSelectTool(section, subToolId);
    if (onClose) onClose();
  };

  const handleHubClick = (section: MainNavSection) => {
    onSelectCategoryHub(section);
    if (onClose) onClose();
  };

  return (
    <div className={`select-none ${className}`}>
      {/* ========================================================= */}
      {/* DESKTOP VIEW: Two-Panel Cascading Flyout (Side-by-Side)   */}
      {/* Matching Reference Image Exactly                          */}
      {/* ========================================================= */}
      <div className="hidden md:flex flex-row-reverse items-start gap-2.5 animate-in fade-in-0 zoom-in-95 duration-150">
        {/* RIGHT CARD: MAIN TOOLS (Master Categories) */}
        <div className="w-[220px] bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-zinc-950/10 dark:shadow-black/60 p-2 shrink-0">
          <div className="px-3 pt-2 pb-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            MAIN TOOLS
          </div>

          <div className="space-y-1 pt-0.5">
            {MASTER_NAV_DATA.map((cat) => {
              const isActive = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={() => setActiveCategoryId(cat.id)}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-semibold'
                      : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:text-zinc-950 dark:hover:text-white font-medium'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {isActive ? (
                    <ChevronLeft className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500 opacity-60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* LEFT CARD: SUBMENU FLYOUT (Detail Tools List) */}
        <div className="w-[260px] bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-zinc-950/10 dark:shadow-black/60 p-2 shrink-0 animate-in fade-in-50 duration-150">
          {/* Header Title */}
          <div className="px-3.5 pt-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {activeCategory.name}
            </h3>
          </div>

          {/* Sub-tools List */}
          <div className="py-1 space-y-0.5">
            {activeCategory.tools.map((tool) => {
              const toolUrl = getToolRouteUrl(tool.section, tool.subToolId);
              const isCurrentTool = activeToolId === tool.subToolId;
              return (
                <a
                  key={tool.id}
                  href={toolUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToolClick(tool.section, tool.subToolId);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-lg text-sm transition-colors cursor-pointer truncate block ${
                    isCurrentTool
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-850 font-medium'
                  }`}
                >
                  {tool.name}
                </a>
              );
            })}
          </div>

          {/* Footer Link: View all → */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 px-3.5 pb-1">
            <a
              href={activeCategory.hubUrl}
              onClick={(e) => {
                e.preventDefault();
                handleHubClick(activeCategory.id);
              }}
              className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE VIEW: Drill-down Flow (< 768px)                     */}
      {/* ========================================================= */}
      <div className="md:hidden w-full bg-white dark:bg-zinc-950 p-1">
        {effectiveDrilldownCat ? (
          /* Step 2: Selected Category Tool List */
          <div className="space-y-2 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 px-1">
              <button
                type="button"
                onClick={() => setDrilldownCat(null)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                aria-label="Back to Main Tools"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-base text-zinc-950 dark:text-white">
                {effectiveDrilldownCat.name}
              </h3>
            </div>

            <div className="space-y-1 py-1">
              {effectiveDrilldownCat.tools.map((tool) => {
                const toolUrl = getToolRouteUrl(tool.section, tool.subToolId);
                const isCurrentTool = activeToolId === tool.subToolId;
                return (
                  <a
                    key={tool.id}
                    href={toolUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      handleToolClick(tool.section, tool.subToolId);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer block ${
                      isCurrentTool
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-semibold'
                        : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 font-medium'
                    }`}
                  >
                    {tool.name}
                  </a>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 px-3 pb-2">
              <a
                href={effectiveDrilldownCat.hubUrl}
                onClick={(e) => {
                  e.preventDefault();
                  handleHubClick(effectiveDrilldownCat.id);
                }}
                className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer hover:underline"
              >
                <span>View all {effectiveDrilldownCat.name}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          /* Step 1: Main Tools Menu */
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              MAIN TOOLS
            </div>

            {MASTER_NAV_DATA.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setDrilldownCat(cat)}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer"
              >
                <span>{cat.name}</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
