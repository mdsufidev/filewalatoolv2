import React from 'react';
import {
  ShieldCheck,
  ServerOff,
  Cpu,
  EyeOff,
  ArrowLeft,
  Lock,
  FileCheck,
  Database,
  Cookie,
  Terminal,
  Scale,
  Trash2,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface PrivacyPolicyProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'desktop') => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBackHome, onNavigate }) => {
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
            Legal &amp; Privacy Architecture
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL HERO */}
      {/* ========================================================= */}
      <div className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Cryptographically Verifiable Local Processing</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
          Privacy Policy &amp; Zero-Upload Guarantee
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          {language === 'hi'
            ? 'FileWala पर आपकी निजता (Privacy) किसी वादे पर नहीं, बल्कि हमारे सॉफ़्टवेयर के आर्किटेक्चर पर आधारित है। आपकी फ़ाइलें, फ़ोटो, हस्ताक्षर और पीडीएफ दस्तावेज़ कभी भी इंटरनेट या किसी रिमोट सर्वर पर अपलोड नहीं होते।'
            : 'FileWala is engineered around a strict cryptographic premise: what never leaves your device can never be leaked, intercepted, or stolen. All document calculations, compression passes, and image conversions execute locally in your web browser RAM.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span>Effective: October 2026</span>
          <span>•</span>
          <span>Standard: DPDP Act 2023 (India) &amp; GDPR Harmonized</span>
          <span>•</span>
          <span>Scope: FileWalaTool.com</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TECHNICAL HIGHLIGHT STRIP (Flat 2D, No Heavy Card Enclosure) */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-950 dark:text-zinc-100">
              <ServerOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Zero Document Uploads</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              No cloud storage bucket (AWS S3, Google Cloud, Azure) is connected to our file processing pipeline. Files reside solely in local browser memory.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-950 dark:text-zinc-100">
              <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Client-Side Wasm &amp; Canvas</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Calculations are executed natively by your computer’s CPU and GPU via HTML5 2D Canvas, WebAssembly (WASM), and Web Workers.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-950 dark:text-zinc-100">
              <Trash2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Instant Garbage Collection</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              When you close the browser tab or click &ldquo;Clear&rdquo;, volatile RAM references are immediately dereferenced and purged by the browser engine.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL SECTIONS (Numbered Linear Flow) */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-12 max-w-4xl">

        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">01.</span>
            <h2>Absolute Zero-Upload Architecture</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              Traditional online converters and photo resizers require candidates to upload their sensitive files (such as UPSC photos, PAN card images, Aadhaar certificates, and handwritten signatures) to a remote backend server. Those files are saved in server temporary folders, processed on a cloud CPU, and sent back as a download link—creating serious privacy vulnerabilities and data leakage risks.
            </p>
            <p>
              <strong>FileWala operates on a fundamentally different paradigm.</strong> We do not operate file upload servers. When you drag and drop a file or pick it from your device, your browser reads the binary stream into local JavaScript memory (<code className="font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850">ArrayBuffer</code> / <code className="font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850">Blob</code>). The image scaling, bi-cubic interpolation, DPI header injection, PDF page manipulation, and format transcoding take place entirely inside your browser sandbox.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">02.</span>
            <h2>Verification via Browser DevTools (Network Tab)</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              We believe privacy statements should be independently verifiable by anyone without trusting marketing claims. Any student, cyber café owner, or cybersecurity researcher can verify FileWala&apos;s zero-upload architecture using standard browser tools:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-700 dark:text-zinc-300">
              <li>Open your web browser Developer Tools by pressing <kbd className="font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">F12</kbd> or <kbd className="font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">Ctrl + Shift + I</kbd>.</li>
              <li>Switch to the <strong>Network</strong> tab and filter by <strong>Fetch/XHR</strong>.</li>
              <li>Select any image or PDF file and perform resizing, compression, cropping, or conversion.</li>
              <li>Observe the outgoing requests: You will notice <strong>0 outgoing payload bytes</strong> containing your file data. No <code className="font-mono text-xs">POST</code>, <code className="font-mono text-xs">PUT</code>, or multipart upload requests are initiated for your files.</li>
            </ol>
            <p>
              The only network calls made by FileWala are initial HTTP GET requests to fetch static application bundles (HTML, CSS, JavaScript, and compiled WASM decoders) during initial page load. Once loaded, tools work completely offline.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">03.</span>
            <h2>Compliance with India&apos;s DPDP Act 2023 &amp; Global Standards</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              Under India&apos;s <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and international regulations including the European Union <strong>General Data Protection Regulation (GDPR)</strong>, FileWala is designed under the principle of <em>Data Protection by Design and by Default</em>.
            </p>
            <p>
              Because FileWala never receives, collects, or retains your document data on any server, FileWala does not act as a data repository or data fiduciary for your files. Your files remain at all times under your direct, exclusive physical custody on your local computing device.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">04.</span>
            <h2>Biometric Safety &amp; Protection of Identity Proofs</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              Competitive exam candidates frequently handle sensitive identity materials, including Aadhaar cards, PAN cards, voter identification, marks sheets, caste certificates, and high-resolution biometric facial photos.
            </p>
            <p>
              We enforce strict architectural safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-700 dark:text-zinc-300">
              <li><strong>Zero OCR Scraping:</strong> Text recognition and document compression run entirely in browser volatile RAM. No candidate name, roll number, or Aadhaar number is extracted or logged.</li>
              <li><strong>Zero Biometric Facial Ingestion:</strong> Facial crop landmarks and signature boundaries are calculated locally without biometric profiling or facial recognition pipelines.</li>
              <li><strong>No Artificial Intelligence Training:</strong> User photographs, signatures, and PDFs are never used, saved, or indexed to train or fine-tune AI, machine learning, or computer vision models.</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">05.</span>
            <h2>Ephemeral In-Memory Lifecycle &amp; Garbage Collection</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              When a document or photo is loaded into FileWala:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-700 dark:text-zinc-300">
              <li>The file is represented as an ephemeral object URL (<code className="font-mono text-xs">blob:https://filewalatool.com/...</code>) in your browser’s volatile RAM.</li>
              <li>When you switch tools, click the &ldquo;Clear&rdquo; button, or close the browser tab, <code className="font-mono text-xs">URL.revokeObjectURL()</code> is invoked immediately.</li>
              <li>The browser&apos;s native garbage collector immediately reclaims the RAM allocated for the image or PDF buffers. No traces remain in your browser cache or system temporary files.</li>
            </ol>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">06.</span>
            <h2>Operational Data &amp; Contact Inquiries</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              The only non-document data handled by FileWala consists of minimal operational preferences:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-700 dark:text-zinc-300">
              <li><strong>Local Storage Preferences:</strong> Your selected visual theme (Light/Dark mode) and interface language (Hindi/English) are saved strictly inside your own browser&apos;s <code className="font-mono text-xs">localStorage</code>. This data never leaves your device.</li>
              <li><strong>Contact Form Inquiries (Firebase Firestore):</strong> If you choose to contact us via the Contact Us form, the text fields you voluntarily submit (Name, Email, Subject, Message) are transmitted over encrypted TLS/HTTPS and stored in Google Firebase Firestore (<code className="font-mono text-xs">contact_messages</code>) solely to allow our developer team to respond. Inquiries follow a 30-day retention schedule, after which they are deleted. Form submissions are strictly isolated from all document utilities.</li>
              <li><strong>Optional Account Authentication:</strong> If you use Firebase Auth to sign in, authentication credentials and tokens are managed directly by Google Firebase Auth according to Google’s industry-standard security protocols.</li>
            </ul>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">07.</span>
            <h2>Content Delivery &amp; Security Infrastructure</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
            <p>
              FileWala is served via standard static hosting infrastructure and CDN delivery. The CDN distributes compiled client-side JavaScript, CSS, and web fonts. We do not use third-party user behavioral tracking pixels, biometric surveillance scripts, or invasive data brokers.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50 font-bold text-base sm:text-lg">
            <span className="font-mono text-zinc-400 dark:text-zinc-600 text-sm">08.</span>
            <h2>Privacy Officer &amp; Inquiries</h2>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p>
              If you have any questions regarding this Privacy Policy, client-side data handling, or wish to report a security disclosure:
            </p>
            <div className="pt-2 font-mono text-xs space-y-1 text-zinc-800 dark:text-zinc-200">
              <div><strong>Project Lead:</strong> Mohammad Sufiyan (@mdsufidev)</div>
              <div><strong>Location:</strong> Kushinagar, Uttar Pradesh, India</div>
              <div>
                <strong>Official Email:</strong>{' '}
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
            onClick={() => onNavigate?.('terms')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Terms &amp; Conditions
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
