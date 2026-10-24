import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage, Language } from '../../core/languageContext';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Esc key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  const languagesList: {
    code: Language;
    label: string;
    sublabel: string;
    badge: string;
  }[] = [
    {
      code: 'en',
      label: 'English',
      sublabel: 'English (US / IN)',
      badge: 'EN',
    },
    {
      code: 'hi',
      label: 'हिन्दी',
      sublabel: 'Hindi (भारत)',
      badge: 'HI',
    },
  ];

  const currentLangObj = languagesList.find((l) => l.code === language) || languagesList[0];

  return (
    <div ref={containerRef} className={`relative inline-flex items-center select-none ${className}`}>
      {/* Click Trigger Button with Dropdown Indicator */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Select Language (English / हिन्दी)"
        className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors duration-150 cursor-pointer leading-none shrink-0 ${
          isOpen
            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-950 dark:text-white'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <Languages className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
        <span className="hidden xl:inline font-medium leading-none">{currentLangObj.label}</span>
        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 leading-none">
          {currentLangObj.badge}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-zinc-900 dark:text-zinc-100' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu with Click Options */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Language options"
          className="absolute right-0 top-full mt-1.5 w-48 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 z-50 animate-in fade-in duration-100"
        >
          <div className="px-2 py-1 mb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-850">
            Language · भाषा
          </div>

          {languagesList.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectLanguage(item.code)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    ({item.badge})
                  </span>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
