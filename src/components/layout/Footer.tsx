import React from 'react';
import { ArrowUpRight, ShieldCheck, Keyboard, Linkedin, Instagram, Github } from 'lucide-react';
import { RedditIcon } from '../ui/RedditIcon';
import { MainNavSection } from './Navbar';

export interface FooterProps {
  onSelectSection: (section: MainNavSection, subToolId?: string) => void;
  onGoHome?: () => void;
  onOpenShortcutsHelp?: () => void;
  onNavigatePage?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'desktop' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectSection,
  onGoHome,
  onOpenShortcutsHelp,
  onNavigatePage,
}) => {
  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    action?: () => void
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    action?.();
  };

  return (
    <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-800/80 pt-20 pb-16 sm:pt-28 sm:pb-24 mt-28 sm:mt-36 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid: Generous column layout with ample breathing distance */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 sm:gap-14 lg:gap-20 mb-20">
          
          {/* COLUMN 1: Brand & Identity (Exact Navbar Logo, Chota Text, Generous Spacing) */}
          <div className="md:col-span-5 lg:col-span-5 space-y-6">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, onGoHome)}
              className="flex items-center gap-1 sm:gap-1.5 cursor-pointer select-none group w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-md"
              title="FileWala Tool Home"
              aria-label="FileWala Tool Home"
            >
              {/* Public Logo Image acting as [F] */}
              <img
                src="/favicon-192x192.png?v=8"
                alt="FileWala Tool Logo"
                draggable={false}
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain select-none shrink-0 transition-transform duration-150 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo.png?v=8';
                }}
              />

              {/* Typography: ileWala TOOL */}
              <span className="font-bold text-xl sm:text-2xl tracking-tight text-white leading-none">
                ileWala <span className="font-bold">TOOL</span>
              </span>
            </a>

            <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
              Private, fast, and 100% in-browser file utilities. Your sensitive documents and photos are processed locally and never touch any server.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>100% Client-Side Private Engine</span>
              </div>

              <a
                href="https://www.reddit.com/r/filewalatool/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-[11px] font-mono text-orange-400 hover:bg-orange-500/15 hover:border-orange-500/60 transition-colors"
                title="Join our Reddit community: r/filewalatool"
              >
                <RedditIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>r/filewalatool</span>
              </a>
            </div>
          </div>

          {/* COLUMN 2: Tool Categories (Chota Text, Distanced Links) */}
          <div className="md:col-span-2 lg:col-span-2 space-y-5">
            <h4 className="font-semibold uppercase tracking-widest text-[11px] font-mono text-zinc-300">
              Tools
            </h4>
            <ul className="space-y-4 text-xs">
              <li>
                <a
                  href="/image-tools"
                  onClick={(e) => handleLinkClick(e, () => onSelectSection('image-tools'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Image Tools</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/pdf-tools"
                  onClick={(e) => handleLinkClick(e, () => onSelectSection('pdf-tools'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">PDF Tools</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/document-tools"
                  onClick={(e) => handleLinkClick(e, () => onSelectSection('document-tools'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Govt &amp; Exam Forms</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/convert-tools"
                  onClick={(e) => handleLinkClick(e, () => onSelectSection('convert'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Format Converter</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: Pages & Legal (Chota Text, Distanced Links) */}
          <div className="md:col-span-3 lg:col-span-3 space-y-5">
            <h4 className="font-semibold uppercase tracking-widest text-[11px] font-mono text-zinc-300">
              Important Pages
            </h4>
            <ul className="space-y-4 text-xs">
              <li>
                <a
                  href="/desktop"
                  onClick={(e) => handleLinkClick(e, () => onNavigatePage?.('desktop'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150 flex items-center gap-1.5">
                    <span>Desktop App</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
                      .EXE
                    </span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => handleLinkClick(e, () => onNavigatePage?.('about'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">About Us</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, () => onNavigatePage?.('contact'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Contact Us</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => handleLinkClick(e, () => onNavigatePage?.('privacy'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Privacy Policy</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLinkClick(e, () => onNavigatePage?.('terms'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Terms &amp; Conditions</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="/disclaimer"
                  onClick={(e) => handleLinkClick(e, () => onNavigatePage?.('disclaimer'))}
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-white"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">Disclaimer</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.reddit.com/r/filewalatool/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-150 cursor-pointer flex items-center justify-between group text-zinc-400 hover:text-orange-400"
                  title="Official Reddit Community: r/filewalatool"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150 flex items-center gap-1.5">
                    <RedditIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Reddit Community</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-orange-400 transition-colors" />
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: Security Guarantees (Chota Text, Distanced Items) */}
          <div className="md:col-span-2 lg:col-span-2 space-y-5">
            <h4 className="font-semibold uppercase tracking-widest text-[11px] font-mono text-zinc-300">
              Security
            </h4>
            <ul className="space-y-4 text-xs text-zinc-400">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Zero Cloud Uploads</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span>Local WebAssembly</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span>In-Memory Clean</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                <span>Offline Capable</span>
              </li>
            </ul>
          </div>

        </div>

        {/* BOTTOM BAR: Distanced, Chota Text, High Contrast */}
        <div className="pt-10 sm:pt-12 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 text-xs text-zinc-500">
          <p>© 2025 FileWala TOOL. All rights reserved.</p>

          <p className="text-xs text-zinc-400">
            Crafted with precision by <span className="text-zinc-200 font-medium">Mohammad Sufiyan</span> (@mdsufidev)
          </p>

          <div className="flex items-center gap-3">
            {onOpenShortcutsHelp && (
              <button
                type="button"
                onClick={onOpenShortcutsHelp}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer mr-1"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Shortcuts</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">?</kbd>
              </button>
            )}

            <a
              href="https://linkedin.com/in/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
              title="LinkedIn"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://instagram.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Instagram"
              aria-label="Instagram profile"
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://github.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
              title="GitHub"
              aria-label="GitHub profile"
            >
              <Github className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://www.reddit.com/r/filewalatool/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 flex items-center justify-center transition-colors cursor-pointer"
              title="Reddit Community (r/filewalatool)"
              aria-label="Reddit Community (r/filewalatool)"
            >
              <RedditIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
