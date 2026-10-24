import React, { useEffect } from 'react';
import { X, Command, Keyboard, ArrowRight } from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Global Navigation',
      items: [
        {
          keys: ['⌘', 'K'],
          altKeys: ['Ctrl', 'K'],
          description: 'Open Command Palette & fast tool search',
        },
        {
          keys: ['Esc'],
          description: 'Exit active tool to catalog, or close active modals',
        },
        {
          keys: ['H'],
          description: 'Return to Home / All 35+ tools view',
        },
        {
          keys: ['/'],
          description: 'Quick-focus search from catalog page',
        },
      ],
    },
    {
      title: 'Category Quick-Switch',
      items: [
        {
          keys: ['1'],
          description: 'Jump to Image Tools suite (16 tools)',
        },
        {
          keys: ['2'],
          description: 'Jump to PDF Document Tools suite (7 tools)',
        },
        {
          keys: ['3'],
          description: 'Jump to Format Converter suite (10 tools)',
        },
        {
          keys: ['4'],
          description: 'Jump to Document & PAN Portal suite (2 tools)',
        },
      ],
    },
    {
      title: 'Controls & System',
      items: [
        {
          keys: ['?'],
          description: 'Open this Keyboard Shortcuts cheat sheet',
        },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-lg border flex flex-col overflow-hidden z-10 transition-all animate-in fade-in duration-150 ${
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
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-md border flex items-center justify-center ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-800'
              }`}
            >
              <Keyboard className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">
                {language === 'hi' ? 'कीबोर्ड शॉर्टकट' : 'Keyboard Shortcuts'}
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {language === 'hi'
                  ? 'FileWala को सुपरफास्ट स्पीड से इस्तेमाल करें'
                  : 'Navigate FileWala at maximum speed with zero mouse latency'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white'
                : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:text-zinc-900'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutSections.map((section) => (
            <div key={section.title} className="space-y-2.5">
              <h4
                className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {section.title}
              </h4>
              <div
                className={`rounded-lg border overflow-hidden divide-y ${
                  isDark
                    ? 'border-zinc-800 divide-zinc-800 bg-zinc-850/40'
                    : 'border-zinc-200 divide-zinc-100 bg-zinc-50/50'
                }`}
              >
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs gap-3"
                  >
                    <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className={`min-w-[24px] text-center px-1.5 py-0.5 text-[11px] font-mono rounded border font-semibold ${
                            isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                              : 'bg-white border-zinc-300 text-zinc-800'
                          }`}
                        >
                          {k}
                        </kbd>
                      ))}
                      {item.altKeys && (
                        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          or {item.altKeys.join('+')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-t text-xs ${
            isDark
              ? 'border-zinc-800 bg-zinc-900 text-zinc-400'
              : 'border-zinc-100 bg-zinc-50 text-zinc-500'
          }`}
        >
          <span>Press <kbd className="font-mono font-semibold">?</kbd> anywhere to open</span>
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200 hover:text-white'
                : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-950'
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
