import React from 'react';
import { ShieldCheck, Cpu, Flame, Layers } from 'lucide-react';
import { MainNavSection } from './Navbar';
import { useLanguage } from '../../core/languageContext';
import { Logo } from '../ui/Logo';

interface HeroSectionProps {
  onSelectSection: (section: MainNavSection) => void;
  activeSection: MainNavSection;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectSection,
  activeSection,
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="relative pt-8 pb-12 overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors">
      <div className="relative max-w-4xl mx-auto px-4 text-center space-y-5">
        {/* Flat Minimalist 2D Status Tag */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{t('hero.pill', 'Zero Server Uploads · 100% Client-Side Engine')}</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="mb-2">
            <img
              src="/web-app-manifest-192x192.png"
              alt="FileWalaTool Logo"
              draggable={false}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md select-none"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect x='18' y='28' width='30' height='22' rx='4' fill='%23E11D2A'/%3E%3Cpath d='M34 16h38l14 14v40H34z' fill='%23fff' stroke='%23E11D2A' stroke-width='4'/%3E%3Cpath d='M18 44h26l7 8h51c2.2 0 4 1.8 4 4v34c0 4.4-3.6 8-8 8H22c-4.4 0-8-3.6-8-8V48c0-2.2 1.8-4 4-4z' fill='%230F172A'/%3E%3Cpath d='M38 84Q60 70 90 32' stroke='%23E11D2A' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E";
              }}
            />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.1]">
            FileWala<span className="text-[#E11D2A]">Tool</span> {language === 'hi' ? 'सुइट' : 'Suite'}
          </h1>
        </div>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-zinc-600 dark:text-slate-400 leading-relaxed font-normal">
          {language === 'hi' ? (
            <>
              सरकारी फॉर्म्स (<strong>UPSC, SSC, PAN</strong>) के लिए फोटो-साइन रिसाइज़ करें, <strong>PDF मर्ज व कंप्रेस</strong> करें और फॉर्मेट बदलें। 100% प्राइवेट और पूरी तरह मुफ़्त।
            </>
          ) : (
            <>
              High-performance browser tools for <strong>UPSC, SSC, PAN photos</strong>, <strong>PDF Merge & Compress</strong>, and <strong>Format Conversion</strong>. Completely private, offline-capable, and blazing fast.
            </>
          )}
        </p>

        {/* Feature Badges Bar */}
        <div className="flex flex-wrap items-center justify-center gap-5 pt-1 text-xs font-medium text-zinc-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('hero.featurePrivacy', 'Files Never Leave Your Device')}</span>
          </div>
          <span className="text-zinc-300 dark:text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-zinc-700 dark:text-slate-300" />
            <span>{t('hero.featureGpu', 'Instant 2s In-Browser Processing')}</span>
          </div>
          <span className="text-zinc-300 dark:text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>{t('hero.featureFree', '100% Free Forever')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
