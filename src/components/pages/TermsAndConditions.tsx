import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Scale,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Cpu,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface TermsAndConditionsProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'privacy') => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  onBackHome,
  onNavigate,
}) => {
  const { language } = useLanguage();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14 select-none animate-in fade-in duration-150">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
            Legal &amp; Terms of Service
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL HERO */}
      {/* ========================================================= */}
      <div className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900">
          <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Agreement for In-Browser Utilities</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
          Terms and Conditions
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          {language === 'hi'
            ? 'FileWalaTool का उपयोग करने से पहले कृपया इन नियमों और शर्तों को ध्यानपूर्वक पढ़ें। हमारी सेवाएं 100% क्लाइंट-साइड ब्राउज़र प्रोसेसिंग पर कार्य करती हैं, जिसका अर्थ है कि आपकी फ़ाइलों का पूर्ण स्वामित्व और जिम्मेदारी आपकी है।'
            : 'These Terms and Conditions govern your access to and use of FileWalaTool.com and its suite of in-browser image, PDF, and government document preparation utilities.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span>Effective Date: October 2026</span>
          <span>•</span>
          <span>Jurisdiction: Uttar Pradesh, India</span>
          <span>•</span>
          <span>Applies to Web Edition</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL SECTIONS (Numbered Linear Flow, No Card Wrappers) */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-12 max-w-4xl">

        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">01.</span>
            <h2>Acceptance of Terms</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              By accessing, browsing, or utilizing FileWalaTool (the &ldquo;Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, you must refrain from using the Service.
            </p>
            <p>
              These terms apply equally to individual candidates, students, job applicants, cyber café operators, document scanning professionals, and institutional users.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">02.</span>
            <h2>100% Client-Side Processing Architecture</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              FileWalaTool operates completely within the client&apos;s browser runtime environment. We do not transmit, receive, or store your original or converted files on remote servers. All file resizing, image cropping, compression, and conversion processes occur strictly within your browser&apos;s local memory (RAM) utilizing HTML5 Canvas 2D, WebAssembly, and JavaScript APIs.
            </p>
            <p>
              You acknowledge that processing speed, memory limits, and file size handling capabilities depend directly on your device&apos;s local hardware (CPU, available RAM, and graphics acceleration).
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">03.</span>
            <h2>100% User Ownership &amp; Intellectual Property Rights</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              <strong>You retain 100% ownership and copyright over all files, photographs, signatures, identity documents, and PDFs</strong> that you process using FileWalaTool. FileWalaTool claims zero rights, licenses, or ownership over your files.
            </p>
            <p>
              Conversely, the software code, application architecture, user interface design, logos, trademarks, and algorithmic workflows of FileWalaTool are the exclusive intellectual property of <strong>Mohammad Sufiyan (@mdsufidev)</strong>. You may not reverse-engineer, decompile, mirror, scrape, or repackage the Service for commercial resale without prior written authorization.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">04.</span>
            <h2>Lawful and Permitted Use</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              You agree to use FileWalaTool strictly for lawful purposes. You expressly agree not to use the Service to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-700 dark:text-zinc-300">
              <li>Fabricate, forge, alter, or produce counterfeit government identity cards, educational certificates, or fraudulent impersonation credentials.</li>
              <li>Infringe upon the copyright, trademark, trade secret, or privacy rights of any third party.</li>
              <li>Attempt to inject malicious payloads, exploits, or harmful code through crafted file headers.</li>
              <li>Process content that violates applicable national or international laws, including defamatory, obscene, or unlawful materials.</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">05.</span>
            <h2>Government Portal Guidelines &amp; User Verification Duty</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              FileWalaTool provides preset dimensions, DPI configurations, and KB limits designed to match published guidelines of Indian government portals—including UPSC, SSC, NSDL (Protean), UTIITSL, and Passport Seva.
            </p>
            <p>
              However, recruitment commissions and portal authorities reserve the right to amend their file formatting rules, live capture mandates, or compression thresholds without notice. <strong>It remains the sole responsibility of the user to verify the final downloaded file</strong> (checking visual sharpness, date and name correctness, aspect ratio, and file size in KB) against the official notification of the specific exam or service before submitting.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">06.</span>
            <h2>Limitation of Liability &amp; No Warranty</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express, implied, or statutory.
            </p>
            <p>
              <strong>Always maintain backup copies of your original files.</strong> Under no circumstances shall FileWalaTool, its developer (Mohammad Sufiyan), or contributors be liable for any direct, indirect, incidental, special, or consequential damages—including missed application deadlines, form rejections by government portals, data loss, browser memory crashes, or degraded image fidelity.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">07.</span>
            <h2>Governing Law &amp; Jurisdiction</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any legal dispute, controversy, or claim arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the competent courts located in <strong>Kushinagar, Uttar Pradesh, India</strong>.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">08.</span>
            <h2>Modifications to Terms &amp; Inquiries</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p>
              We reserve the right to revise or update these Terms and Conditions at our sole discretion. Any revisions become effective immediately upon posting to this URL. Continued use of FileWalaTool constitutes acceptance of the revised terms.
            </p>
            <div className="pt-2 font-mono text-xs space-y-1 text-zinc-800 dark:text-zinc-200">
              <div><strong>Developer:</strong> Mohammad Sufiyan (@mdsufidev)</div>
              <div>
                <strong>Legal Inquiries:</strong>{' '}
                <a href="mailto:support@filewalatool.com" className="underline hover:text-zinc-950 dark:hover:text-white">
                  support@filewalatool.com
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ========================================================= */}
      {/* BOTTOM CROSS-NAVIGATION LINKS */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('privacy')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.('disclaimer')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Compliance Disclaimer
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.('about')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            About FileWala
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.('contact')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Contact Support
          </button>
        </div>

        <div>
          <span>© {new Date().getFullYear()} FileWalaTool • Kushinagar, UP</span>
        </div>
      </div>

    </div>
  );
};
