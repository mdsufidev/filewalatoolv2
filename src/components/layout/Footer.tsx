import React from 'react';
import { ArrowUpRight, ShieldCheck, Keyboard, Linkedin, Instagram, Github } from 'lucide-react';
import { MainNavSection } from './Navbar';
import { useLanguage } from '../../core/languageContext';

export interface FooterProps {
  onSelectSection: (section: MainNavSection, subToolId?: string) => void;
  onGoHome?: () => void;
  onOpenShortcutsHelp?: () => void;
  onNavigatePage?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'desktop') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectSection,
  onGoHome,
  onOpenShortcutsHelp,
  onNavigatePage,
}) => {
  const { t } = useLanguage();

  return (
    <footer className="bg-black text-zinc-400 border-t border-zinc-900 py-14 mt-16 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid: 1 col on mobile, 3 cols on tablet, 4 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-10 mb-12">
          {/* ========================================================= */}
          {/* COLUMN 1: Brand & Identity */}
          {/* ========================================================= */}
          <div className="space-y-3.5">
            <div
              onClick={onGoHome}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group w-fit"
              title="FileWala Tool Home"
            >
              <img
                src="/favicon-192x192.png?v=8"
                alt="FileWala Tool Logo"
                draggable={false}
                className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain select-none shrink-0 transition-transform duration-150 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/logo.png?v=8";
                }}
              />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg sm:text-xl tracking-tight leading-none text-white">
                  File<span className="text-zinc-300">Wala</span>
                </span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 leading-none">
                  TOOL
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed max-w-sm text-zinc-400">
              Minimal, private, and 100% client-side file tools. Your documents and photos never leave your device.
            </p>

            <div className="pt-1 space-y-1">
              <p className="text-xs text-zinc-400">
                Built by <span className="font-semibold text-white">Mohammad Sufiyan</span> (@mdsufidev).
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>100% Client-Side · Zero uploads</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: Quick Links (Tools) */}
          {/* ========================================================= */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-[11px] text-white">
              Our Tools
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('image-tools')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Image Tools</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('pdf-tools')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">PDF Tools</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('document-tools')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Govt &amp; Exam Forms</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectSection('convert')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Format Converter</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
            </ul>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 3: Company & Legal */}
          {/* ========================================================= */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-[11px] text-white">
              Important Pages
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage?.('desktop')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-300 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150 flex items-center gap-1.5">
                    <span>Windows Desktop App</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
                      .EXE
                    </span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage?.('about')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">About Us</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage?.('contact')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Contact Us</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage?.('terms')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Terms &amp; Conditions</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage?.('disclaimer')}
                  className="transition-colors duration-150 cursor-pointer text-left flex items-center justify-between w-full group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Disclaimer</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150" />
                </button>
              </li>
            </ul>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 4: Client-Side Security & Specs */}
          {/* ========================================================= */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-[11px] text-white">
              Privacy &amp; Security
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>HTML5 Canvas 2D Engine</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span>pdf-lib Local WebAssembly</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span>Zero Server Uploads or Logs</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Memory Garbage Collection</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                <span>Works Offline When Cached</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM BAR: Divider, Copyright, Creator & Social Links */}
        {/* ========================================================= */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          {/* Left Side: Copyright */}
          <p>© 2025 FileWalaTool. All rights reserved.</p>

          {/* Center: Creator Credit */}
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Made with passion by</span>
            <span className="font-semibold text-zinc-200">Mohammad Sufiyan</span>
            <span className="text-zinc-500">(@mdsufidev)</span>
            <span className="hidden md:inline">from Kushinagar</span>
          </p>

          {/* Right Side: Social Media Icons (LinkedIn, Instagram, GitHub) */}
          <div className="flex items-center gap-2.5">
            {onOpenShortcutsHelp && (
              <button
                type="button"
                onClick={onOpenShortcutsHelp}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs font-medium transition-colors duration-150 cursor-pointer mr-1"
                title="Keyboard Shortcuts Cheat Sheet (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Shortcuts</span>
                <kbd className="text-[10px] font-mono px-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">?</kbd>
              </button>
            )}

            {/* LinkedIn Profile */}
            <a
              href="https://linkedin.com/in/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7.5 h-7.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              title="LinkedIn - Mohammad Sufiyan (@mdsufidev)"
              aria-label="LinkedIn profile of Mohammad Sufiyan"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>

            {/* Instagram Profile */}
            <a
              href="https://instagram.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7.5 h-7.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              title="Instagram - @mdsufidev"
              aria-label="Instagram profile of Mohammad Sufiyan"
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>

            {/* GitHub Profile */}
            <a
              href="https://github.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7.5 h-7.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              title="GitHub - @mdsufidev"
              aria-label="GitHub profile of mdsufidev"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
