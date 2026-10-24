import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Scale,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';

interface TermsAndConditionsProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact') => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  onBackHome,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { language } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-in fade-in duration-200">
      {/* Top Return Button */}
      <div className="mb-8">
        <button
          onClick={onBackHome}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
          <Scale className="w-3.5 h-3.5" />
          <span>Legal Agreement &amp; User Terms</span>
        </div>
        <h1
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Terms and Conditions
        </h1>
        <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Effective Date: October 2026 · Standard Terms of Use for FileWalaTool
        </p>
      </div>

      {/* Structured Terms List */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 space-y-8 ${
          isDark
            ? 'bg-slate-900/40 border-slate-800 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
        }`}
      >
        {/* Term 1 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            1. Acceptance of Terms
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            By accessing or using FileWalaTool (the &ldquo;Service&rdquo;), you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        {/* Term 2 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-500" />
            2. 100% Client-Side Processing Architecture
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            FileWalaTool processes all images, PDF documents, and vector graphics locally within the client&apos;s browser environment (using HTML5 Canvas, WebAssembly, and JavaScript APIs). We do not collect, transmit, store, or view your source or target files. You acknowledge and understand that the processing speed and capabilities depend directly on your device&apos;s hardware.
          </p>
        </section>

        {/* Term 3 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            3. Lawful and Permitted Use Only
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            You agree not to use FileWalaTool for any unlawful purpose. Specifically, you agree not to process:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>Forged, fraudulent, or counterfeit government identity documents or impersonation credentials.</li>
            <li>Content that infringes upon third-party copyrights, trademarks, or proprietary rights.</li>
            <li>Malicious files, exploits, or materials intended to disrupt computer systems.</li>
            <li>Defamatory, obscene, or unlawful visual materials.</li>
          </ul>
        </section>

        {/* Term 4 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            4. No Liability for Data Loss or Corruption
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            While FileWalaTool employs tested compression, cropping, and conversion routines, client-side browser processing can occasionally fail due to memory limits, browser crashes, or corrupted input streams.
          </p>
          <p className="text-xs sm:text-sm leading-relaxed">
            <strong>Always retain backup copies of your original files</strong>. FileWalaTool and its developer shall have no liability for any data loss, file corruption, degraded image quality, or formatting discrepancies resulting from conversion or compression.
          </p>
        </section>

        {/* Term 5 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            5. Intellectual Property
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            The source code, user interface, brand assets, and design system of FileWalaTool are owned by <strong>mdsufidev (Mohammad Sufiyan)</strong>. You may not reverse-engineer, mirror, or repackage this service for commercial distribution without explicit written permission.
          </p>
          <p className="text-xs sm:text-sm leading-relaxed">
            All files uploaded and modified remain 100% your own property; FileWalaTool claims zero rights, licenses, or ownership over your personal documents.
          </p>
        </section>

        {/* Term 6 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-500" />
            6. Disclaimer of Warranties &amp; Modifications
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express or implied. We reserve the right to modify, suspend, or update these tools at any time without prior notice.
          </p>
        </section>
      </div>

      {/* Quick Footer Links */}
      {onNavigate && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('disclaimer')}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Privacy Disclaimer
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('about')}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              About the Developer
            </button>
          </div>
          <button
            onClick={() => onNavigate('contact')}
            className="text-slate-700 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
          >
            Need help? Contact Us →
          </button>
        </div>
      )}
    </div>
  );
};
