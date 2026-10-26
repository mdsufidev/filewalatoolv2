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
  Building2,
  AlertTriangle,
  Scale,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface DisclaimerProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'privacy' | 'desktop') => void;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ onBackHome, onNavigate }) => {
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
            Compliance &amp; Non-Affiliation
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL HERO */}
      {/* ========================================================= */}
      <div className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Statutory Regulatory Notice</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
          Privacy &amp; Compliance Disclaimer
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          {language === 'hi'
            ? 'FileWalaTool एक स्वतंत्र, गैर-सरकारी वेब टूलकिट है। यह किसी भी सरकारी विभाग या आयोग से संबद्ध नहीं है। इसका उद्देश्य केवल छात्रों और आवेदकों को फ़ाइल का आकार और रिज़ॉल्यूशन ठीक करने में तकनीकी सहायता प्रदान करना है।'
            : 'FileWalaTool is an independent, non-governmental digital utility engineered to assist applicants, cyber café operators, and candidates in preparing compliant document files. Please read these official disclaimers carefully.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span>Effective: October 2026</span>
          <span>•</span>
          <span>Status: Independent Non-Governmental Utility</span>
          <span>•</span>
          <span>Processing: 100% Client-Side In-Browser</span>
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
            <h2>Absolute Non-Affiliation with Government Bodies &amp; Commissions</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              <strong>FileWalaTool is NOT affiliated with, authorized by, endorsed by, or in any way officially connected with the Government of India, any State Government, or any governmental department or examination body.</strong>
            </p>
            <p>
              Specifically, FileWalaTool has no official relationship or affiliation with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
              <li><strong>UPSC</strong> (Union Public Service Commission)</li>
              <li><strong>SSC</strong> (Staff Selection Commission)</li>
              <li><strong>NSDL e-Gov / Protean</strong> (Protean eGov Technologies Limited)</li>
              <li><strong>UTIITSL</strong> (UTI Infrastructure Technology And Services Limited)</li>
              <li><strong>Ministry of External Affairs</strong> / Passport Seva Portal</li>
              <li><strong>EPFO</strong> (Employees&apos; Provident Fund Organisation)</li>
              <li><strong>NTA</strong> (National Testing Agency)</li>
              <li>Any State Public Service Commission (UPPSC, BPSC, MPPSC, RPSC, MPSC, etc.) or State Police Recruitment Board</li>
            </ul>
            <p>
              All portal names, exam titles, trademarks, and registered brand names mentioned on FileWalaTool are used strictly for identifying the specific technical dimensional guidelines and educational reference under <em>Nominative Fair Use</em> principles.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">02.</span>
            <h2>Informational and Formatting Utility Purpose Only</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              FileWalaTool does not submit forms, issue identity documents, register exam applications, or process government transactions on your behalf.
            </p>
            <p>
              Our software functions solely as a client-side digital workstation to help you crop images, adjust pixel dimensions (e.g. 213×213 px for UTIITSL or 197×276 px for NSDL), compress file sizes to target ranges (e.g. 20–50 KB), embed Name and Date text strips, and merge or split PDF documents prior to your own manual submission on official portals.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">03.</span>
            <h2>100% Client-Side Operation &amp; Zero Server Transmission</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              We guarantee that <strong>no user files, photographs, biometric signatures, certificates, or personal identity proofs are ever uploaded, transmitted, or stored on our servers</strong>.
            </p>
            <p>
              All file operations are performed in your browser&apos;s volatile RAM utilizing HTML5 Canvas 2D and WebAssembly. You can verify this independently at any time using your browser&apos;s Network developer tools (<kbd className="font-mono text-xs px-1 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">F12</kbd>).
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">04.</span>
            <h2>Candidate Responsibility for Output Verification</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              Government agencies and exam recruitment commissions update their notification standards, live camera mandates, file size tolerances, and DPI requirements periodically.
            </p>
            <p>
              While FileWalaTool makes every effort to keep presets updated to current published standards:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
              <li>Candidates are solely responsible for cross-checking the generated file against the official recruitment notification of the exam they are applying for.</li>
              <li>Inspect your file before final upload to ensure: clarity of facial features, lack of distortion or compression artifacts, correct spelling of candidate name, correct Date of Photograph (DOP), and valid file size (in KB).</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">05.</span>
            <h2>Limitation of Liability</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              In no event shall FileWalaTool, its founder (Mohammad Sufiyan / @mdsufidev), or contributors be held liable for any damages, losses, or expenses whatsoever arising in connection with the use of this website.
            </p>
            <p>
              This includes, without limitation:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
              <li>Rejection or cancellation of an application form by any examination board or government department.</li>
              <li>Missed application deadlines or server timeout errors on government submission portals.</li>
              <li>Data loss or browser memory crashes resulting from large file inputs on user devices.</li>
              <li>Any indirect, incidental, or consequential damages resulting from document conversion or compression.</li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">06.</span>
            <h2>Reporting Portal Specification Changes</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p>
              If an Indian government portal (UPSC, SSC, NSDL, Passport Seva, etc.) issues a new notification changing photo or signature dimensions, DPI, or file size limits, please notify us immediately so we can update our presets for all users:
            </p>
            <div className="pt-2 font-mono text-xs space-y-1 text-zinc-800 dark:text-zinc-200">
              <div><strong>Specification Updates:</strong> support@filewalatool.com</div>
              <div><strong>Lead Developer:</strong> Mohammad Sufiyan (@mdsufidev)</div>
              <div><strong>Location:</strong> Kushinagar, Uttar Pradesh, India</div>
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
            onClick={() => onNavigate?.('terms')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Terms &amp; Conditions
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
