import React from 'react';
import {
  ShieldAlert,
  ServerOff,
  EyeOff,
  Lock,
  ArrowLeft,
  FileCheck,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';

interface DisclaimerProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact') => void;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ onBackHome, onNavigate }) => {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
          <ServerOff className="w-3.5 h-3.5" />
          <span>Zero Server Uploads Guarantee</span>
        </div>
        <h1
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Privacy &amp; Compliance Disclaimer
        </h1>
        <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Last updated: October 2026 · 100% Client-Side Processing Architecture
        </p>
      </div>

      {/* Primary Highlight Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border mb-10 transition-colors ${
          isDark
            ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold">
              100% Client-Side Data Privacy Notice
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed">
              <strong>FileWalaTool operates 100% on the client side</strong>. We do not upload, save, transmit, or store any user files, photographs, signatures, identity proofs, or documents on our servers. All file resizing, image cropping, compression, and conversion processes occur strictly within your browser&apos;s local sandbox memory.
            </p>
          </div>
        </div>
      </div>

      {/* Structured Sections */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 space-y-8 ${
          isDark
            ? 'bg-slate-900/40 border-slate-800 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
        }`}
      >
        {/* Section 1 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            1. No Remote Storage &amp; Data Transmission
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            When you select or drop a file into FileWalaTool, it is loaded into your browser using standard HTML5 Canvas 2D and WebAssembly APIs. Neither our website operators nor any third-party infrastructure receives your files. Once you close your browser tab or click &ldquo;Clear&rdquo;, your files are immediately evicted from your device&apos;s temporary memory.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            2. Government Portal Independence &amp; Affiliation
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            FileWalaTool is an independent, non-governmental web utility designed to assist users in preparing document files that comply with published dimensional (pixel), DPI (resolution), and file size (KB) specifications.
          </p>
          <p className="text-xs sm:text-sm leading-relaxed">
            We are <strong>not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected</strong> with Protean eGov Technologies (NSDL), UTI Infrastructure Technology And Services Limited (UTIITSL), Ministry of External Affairs (Passport Seva), Union Public Service Commission (UPSC), Staff Selection Commission (SSC), Employees&apos; Provident Fund Organisation (EPFO), or any state or central governmental department. All product names, logos, and brands are property of their respective owners.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            3. Final Verification Responsibility
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            While FileWalaTool applies rigorous mathematical algorithms to produce compliant files under official thresholds (e.g., 200×230 px, 20–50 KB, 200 DPI JPEG for PAN; 350×450 px at 300 DPI for Passports), governmental guidelines and portal criteria may change without prior notice.
          </p>
          <p className="text-xs sm:text-sm leading-relaxed">
            Users are solely responsible for inspecting their generated files (visual clarity, legible signatures, uncropped biometric markers, and correct dates) prior to final submission on any official recruitment or service portal.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-500" />
            4. Limitation of Liability
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed">
            Under no circumstances shall FileWalaTool or its developer (Mohammad Sufiyan / mdsufidev) be held liable for any missed deadlines, rejected form submissions, technical errors, data loss, or indirect damages arising out of the use or inability to use this browser-based software.
          </p>
        </section>
      </div>

      {/* Quick Footer Links */}
      {onNavigate && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('terms')}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('about')}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              About Creator
            </button>
          </div>
          <button
            onClick={() => onNavigate('contact')}
            className="text-slate-700 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
          >
            Questions? Contact Support →
          </button>
        </div>
      )}
    </div>
  );
};
