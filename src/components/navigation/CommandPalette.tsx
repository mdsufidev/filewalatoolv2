'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { ALL_TOOLS, CATEGORIES_CONFIG, ToolCategory, ToolItem } from '../../core/toolsData';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { ToolIconBadge } from '../tools/ToolIconBadge';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ToolCategory>('all');
  const [activeIndex, setActiveIndex] = useState(0);

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, tToolName, tToolDesc, language } = useLanguage();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter tools based on query & selected category
  const filteredTools = useMemo(() => {
    let list = ALL_TOOLS;

    if (selectedFilter !== 'all') {
      list = list.filter((t) => t.category === selectedFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.targetKeyword.toLowerCase().includes(q) ||
          t.subToolId.toLowerCase().includes(q) ||
          (t.badge && t.badge.toLowerCase().includes(q))
      );
    }

    return list;
  }, [query, selectedFilter]);

  // Reset active index when query or filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, selectedFilter]);

  // Auto-focus input when opened & reset search
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedFilter('all');
      setActiveIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle keyboard navigation within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (filteredTools.length === 0 ? 0 : (prev + 1) % filteredTools.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          filteredTools.length === 0
            ? 0
            : (prev - 1 + filteredTools.length) % filteredTools.length
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredTools.length > 0 && filteredTools[activeIndex]) {
          const tool = filteredTools[activeIndex];
          onSelectTool(tool.actionSection, tool.subToolId);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredTools, activeIndex, onSelectTool, onClose]
  );

  // Keep selected item scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 sm:px-6 select-none animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onKeyDown={handleKeyDown}
    >
      {/* Neutral Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Flat 2D Palette Container (Linear / Notion Style) */}
      <div
        className="relative w-full max-w-2xl rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xl flex flex-col overflow-hidden z-10 animate-in zoom-in-98 duration-100"
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 gap-3 bg-white dark:bg-zinc-900"
        >
          <Search className="w-4 h-4 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'टूल का नाम या काम खोजें (उदा. compress, merge, pdf, pan)...'
                : 'Search any tool or action (e.g. compress, merge, pdf, pan)...'
            }
            className="w-full bg-transparent text-xs sm:text-sm outline-none font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd
              className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filter Pills (2D Flat Segmented Strip) */}
        <div
          className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 overflow-x-auto no-scrollbar text-xs"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mr-1 shrink-0">
            {language === 'hi' ? 'फ़िल्टर:' : 'Filter:'}
          </span>
          {CATEGORIES_CONFIG.map((cat) => {
            const isSelected = selectedFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFilter(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer border ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {t(
                  'cat.' +
                    (cat.id === 'all'
                      ? 'all'
                      : cat.id === 'image-tools'
                      ? 'imageTools'
                      : cat.id === 'pdf-tools'
                      ? 'pdfTools'
                      : cat.id === 'convert'
                      ? 'convert'
                      : 'documentTools'),
                  cat.name
                )}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[360px] sm:max-h-[400px] overflow-y-auto p-2 space-y-0.5 divide-y-0"
        >
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="w-7 h-7 mx-auto stroke-[1.5] text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {language === 'hi'
                  ? `"${query}" के लिए कोई टूल नहीं मिला`
                  : `No tools found matching "${query}"`}
              </p>
              <p className="text-xs text-zinc-500">
                {language === 'hi'
                  ? 'जैसे "compress", "pdf", "pan", "crop" या "passport" लिखकर खोजें।'
                  : 'Try searching for "compress", "pdf", "pan", "crop", or "passport".'}
              </p>
            </div>
          ) : (
            filteredTools.map((tool, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={tool.id}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onSelectTool(tool.actionSection, tool.subToolId);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-md transition-colors duration-100 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ToolIconBadge
                      toolId={tool.id}
                      category={tool.category}
                      iconName={tool.icon}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm truncate">
                          {tToolName(tool.id, tool.name)}
                        </span>
                        {tool.badge && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0"
                          >
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[11px] truncate mt-0.5 text-zinc-500 dark:text-zinc-400"
                      >
                        {tToolDesc(tool.id, tool.description)}
                      </p>
                    </div>
                  </div>

                  {/* Launch action pill */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-opacity ${
                        isActive
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                          : 'opacity-0 group-hover:opacity-100 text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>{language === 'hi' ? 'खोलें' : 'Launch'}</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints (Flat 2D Strip) */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-[11px] font-mono text-zinc-500"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px]">↓</kbd>
              <span className="font-sans ml-1">{language === 'hi' ? 'नेविगेट' : 'Navigate'}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px]">↵</kbd>
              <span className="font-sans ml-1">{language === 'hi' ? 'खोलें' : 'Select'}</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px]">esc</kbd>
              <span className="font-sans ml-1">{language === 'hi' ? 'बंद करें' : 'Close'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-sans text-[11px]">
              {filteredTools.length} {language === 'hi' ? 'टूल्स' : 'tools'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
