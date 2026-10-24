import React from 'react';
import { ShieldCheck, X, EyeOff, ServerOff, Cpu, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { LogoIcon, setAppLogo } from '../ui/Logo';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-lg rounded-lg p-6 sm:p-7 space-y-6 border transition-colors ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <ShieldCheck className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {language === 'hi' ? 'फ़ाइलवाला गोपनीयता गारंटी' : 'FileWala Privacy Guarantee'}
              </h3>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {language === 'hi' ? '100% ऑन-डिवाइस प्रोसेस' : '100% In-Browser RAM Only'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`space-y-4 text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          <p>
            Unlike traditional cloud tools that upload your private files to remote servers for processing, <strong className={isDark ? 'text-white' : 'text-zinc-950'}>FileWala executes all transformations locally inside your browser sandbox</strong>.
          </p>

          <div className="space-y-2.5 pt-1">
            <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${isDark ? 'bg-zinc-850/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <ServerOff className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
              <div>
                <span className={`font-semibold block ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  Zero Server Uploads
                </span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  No network requests carry your images or PDF documents. Check DevTools Network tab — zero bytes are posted.
                </span>
              </div>
            </div>

            <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${isDark ? 'bg-zinc-850/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <Cpu className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
              <div>
                <span className={`font-semibold block ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  Hardware Accelerated Memory
                </span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Processing relies on your device's WebAssembly and HTML5 Canvas pipeline. Fast, confidential, and offline-ready.
                </span>
              </div>
            </div>

            <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${isDark ? 'bg-zinc-850/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <EyeOff className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
              <div>
                <span className={`font-semibold block ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  Zero Data Retention & AI Mining
                </span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Your sensitive PAN cards, ID documents, and private photos are never used to train neural networks or stored in cloud databases.
                </span>
              </div>
            </div>

            {/* Custom Brand Logo Settings */}
            <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${isDark ? 'bg-zinc-850/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-md border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                  <LogoIcon size={24} />
                </div>
                <div>
                  <span className={`font-semibold text-xs block ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                    Brand Logo
                  </span>
                  <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Official FileWalaTool mark or custom logo
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  id="privacy-logo-file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        if (result) setAppLogo(result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="privacy-logo-file"
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200'
                      : 'bg-white border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Upload Image</span>
                </label>
                <button
                  type="button"
                  title="Reset to default vector logo"
                  onClick={() => setAppLogo(null)}
                  className={`p-1 text-[11px] rounded-md border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-white border-zinc-300 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`pt-4 border-t flex justify-end ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-150 cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
