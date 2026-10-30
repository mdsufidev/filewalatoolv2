import React from 'react';
import {
  ShieldCheck,
  Zap,
  MapPin,
  Mail,
  ArrowLeft,
  Cpu,
  Award,
  Building2,
  FileText,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface AboutUsProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'privacy') => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ onBackHome, onNavigate }) => {
  const { language } = useLanguage();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12 sm:space-y-16 select-none animate-in fade-in duration-150">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
            About FileWala
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EDITORIAL HERO (2D Flat, High Contrast, Crisp Typography) */}
      {/* ========================================================= */}
      <div className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900">
          <span>Handcrafted in India • 100% In-Browser</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
          {language === 'hi'
            ? 'बिना सर्वर अपलोड के सुरक्षित, तेज़ और प्रामाणिक फ़ाइल टूल्स।'
            : 'Private, in-browser file utilities. Built for zero compromise.'}
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal max-w-3xl">
          {language === 'hi'
            ? 'FileWala एक स्वतंत्र वेब टूलकिट है जिसे भारतीय छात्रों, नौकरी आवेदकों और साइबर कैफ़े ऑपरेटरों के लिए बनाया गया है। बिना किसी क्लाउड अपलोड, बिना किसी कतार और बिना किसी फीस के—आपकी फाइलें केवल आपके डिवाइस की RAM में प्रोसेस होती हैं।'
            : 'FileWala is an independent, 100% client-side web utility suite engineered to solve document rejection and photo sizing for Indian competitive exams, recruitment portals, and everyday digital work.'}
        </p>
      </div>

      {/* ========================================================= */}
      {/* DEVELOPER PROFILE SECTION (Real Brand Logos & 2D Flat UI) */}
      {/* ========================================================= */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Creator Identity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-zinc-200 dark:ring-zinc-800 bg-zinc-100 dark:bg-zinc-850 shrink-0 shadow-xs">
                <img
                  src="/founder-muhammad-sufiyan.webp"
                  alt="Mohammad Sufiyan - Founder of FileWalaTool (@mdsufidev)"
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' fill='%2318181b'/%3E%3Ccircle cx='80' cy='60' r='32' fill='%2371717a'/%3E%3Cpath d='M30 140c0-28 22-45 50-45s50 17 50 45z' fill='%2352525b'/%3E%3Ctext x='80' y='152' text-anchor='middle' fill='%23e4e4e7' font-size='12' font-family='sans-serif' font-weight='bold'%3Emdsufidev%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Mohammad Sufiyan
                </h2>
                <p className="font-mono text-zinc-500 text-xs sm:text-sm">@mdsufidev</p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Kushinagar, UP, India</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                Solo Engineer
              </span>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                Active Project
              </span>
            </div>

            {/* Authentic Brand Logos (2D Flat) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* LinkedIn: Real Brand Logo */}
              <a
                href="https://linkedin.com/in/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0A66C2] hover:bg-[#084e96] text-white shadow-xs transition-transform hover:scale-105 active:scale-95 no-underline cursor-pointer"
                title="LinkedIn (@mdsufidev)"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.67 1.67 0 1 0 0 3.34 1.67 1.67 0 0 0 0-3.34Z" />
                </svg>
                <span>LinkedIn</span>
              </a>

              {/* Instagram: Real Brand Gradient */}
              <a
                href="https://instagram.com/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-95 text-white shadow-xs transition-transform hover:scale-105 active:scale-95 no-underline cursor-pointer"
                title="Instagram (@mdsufidev)"
              >
                <svg className="w-3.5 h-3.5 fill-none stroke-white stroke-[2]" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>

              {/* GitHub: Real Brand Dark Logo */}
              <a
                href="https://github.com/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#24292e] hover:bg-[#181717] text-white shadow-xs transition-transform hover:scale-105 active:scale-95 no-underline cursor-pointer"
                title="GitHub (@mdsufidev)"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </a>

              {/* Reddit: Real Brand Orange Logo */}
              <a
                href="https://www.reddit.com/r/filewalatool/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FF4500] hover:bg-[#e03d00] text-white shadow-xs transition-transform hover:scale-105 active:scale-95 no-underline cursor-pointer"
                title="Reddit Community (r/filewalatool)"
              >
                <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill="#FF4500" />
                  <path
                    d="M16.67 11.5c-.32 0-.6.13-.81.33-1-.69-2.38-1.14-3.92-1.19l.74-3.48 2.42.51c.02.59.5 1.07 1.1 1.07.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1c-.44 0-.82.26-.99.63l-2.72-.57a.3.3 0 0 0-.35.23l-.86 4.02c-1.57.04-2.98.49-4 1.18-.21-.2-.49-.32-.8-.32-.65 0-1.18.53-1.18 1.18 0 .46.26.85.64 1.05a2.7 2.7 0 0 0-.03.41c0 2.07 2.41 3.75 5.38 3.75s5.38-1.68 5.38-3.75c0-.14-.01-.27-.04-.4.4-.2.67-.6.67-1.06 0-.65-.53-1.18-1.18-1.18zm-6.92 1.42c.38 0 .7.31.7.7s-.32.7-.7.7-.7-.31-.7-.7.31-.7.7-.7zm4.5 2.82c-.65.65-1.9.7-2.25.7-.35 0-1.6-.05-2.25-.7a.26.26 0 0 1 .37-.37c.45.45 1.38.53 1.88.53.5 0 1.43-.08 1.88-.53a.26.26 0 0 1 .37.37zm-.25-2.12c-.38 0-.7-.31-.7-.7s.31-.7.7-.7.7.31.7.7-.32.7-.7.7z"
                    fill="#FFFFFF"
                  />
                </svg>
                <span>Reddit</span>
              </a>

              {/* Email */}
              <a
                href="mailto:support@filewalatool.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white shadow-xs transition-transform hover:scale-105 active:scale-95 no-underline cursor-pointer"
                title="Email Support"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Right Column: Mission Narrative & Story */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi'
                ? 'कुशीनगर से FileWala तक: हमारा उद्देश्य'
                : 'From Kushinagar to FileWala: The Mission'}
            </h3>

            <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 font-normal">
              <p>
                {language === 'hi' ? (
                  <>
                    नमस्ते! मैं कुशीनगर, उत्तर प्रदेश से मोहम्मद सुफियान (@mdsufidev) हूँ। मैंने FileWala को पूरी तरह स्वतंत्र रूप से डिज़ाइन और कोड किया है। जब ग्रामीण इलाकों और छोटे शहरों के छात्र सरकारी परीक्षाओं (जैसे <strong className="text-zinc-950 dark:text-zinc-100">UPSC</strong>, <strong className="text-zinc-950 dark:text-zinc-100">SSC</strong>, <strong className="text-zinc-950 dark:text-zinc-100">State PSCs</strong>, <strong className="text-zinc-950 dark:text-zinc-100">PAN कार्ड</strong> या <strong className="text-zinc-950 dark:text-zinc-100">पासपोर्ट सेवा</strong>) के लिए फॉर्म भरते हैं, तो सिर्फ 2 KB अधिक होने या गलत DPI की वजह से अक्सर फॉर्म रिजेक्ट हो जाते हैं।
                  </>
                ) : (
                  <>
                    Hello! I am Mohammad Sufiyan (@mdsufidev) from Kushinagar, Uttar Pradesh. I designed and engineered FileWala completely from scratch. When candidates apply for competitive exams and identity portals in India—such as <strong className="text-zinc-950 dark:text-zinc-100">UPSC</strong>, <strong className="text-zinc-950 dark:text-zinc-100">SSC</strong>, <strong className="text-zinc-950 dark:text-zinc-100">State PSCs</strong>, <strong className="text-zinc-950 dark:text-zinc-100">PAN Cards</strong>, or <strong className="text-zinc-950 dark:text-zinc-100">Passport Seva</strong>—thousands face portal rejection simply because an image is 2 KB over the ceiling or lacks required DPI and date stamps.
                  </>
                )}
              </p>

              <p>
                {language === 'hi' ? (
                  <>
                    लोगों को सिर्फ एक फोटो या सिग्नेचर का साइज़ बदलने के लिए कई किलोमीटर दूर साइबर कैफ़े जाना पड़ता है और पैसे देने पड़ते हैं। इसके अलावा आम कन्वर्टर वेबसाइट्स संवेदनशील आधार कार्ड और निजी हस्ताक्षर अनजान विदेशी सर्वरों पर अपलोड कर देती हैं जिससे डेटा चोरी और प्राइवेसी का गंभीर खतरा रहता है।
                  </>
                ) : (
                  <>
                    Applicants in small towns frequently travel miles to cyber cafés and pay fees just to resize a photo. Furthermore, generic online converter tools upload sensitive biometric IDs and signatures to unvetted cloud servers, creating severe privacy risks.
                  </>
                )}
              </p>

              <p>
                {language === 'hi' ? (
                  <>
                    मैंने <strong className="text-zinc-950 dark:text-zinc-100">FileWala</strong> इसी समस्या के सीधे समाधान के लिए बनाया। पूरा टूलकिट आधुनिक ब्राउज़र कैनवास और वेब असेंबली आर्किटेक्चर पर चलता है। कोई बैकएंड डेटाबेस नहीं, कोई फ़ाइल अपलोड नहीं, कोई विज्ञापन वॉटरमार्क नहीं—सब कुछ 100% ऑन-डिवाइस और हमेशा मुफ़्त है।
                  </>
                ) : (
                  <>
                    I engineered <strong className="text-zinc-950 dark:text-zinc-100">FileWala</strong> to solve this directly. The entire suite operates on in-browser HTML5 Canvas and WebAssembly. No backend databases, no file queues, and zero fees—ever.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KEY METRICS (2D Flat, High-Density Cards) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 py-2">
        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 text-center sm:text-left">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">40+</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">
            {language === 'hi' ? 'दस्तावेज़ व फ़ोटो टूल्स' : 'Browser Utilities'}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 text-center sm:text-left">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">100%</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">
            {language === 'hi' ? 'ऑन-डिवाइस मेमोरी' : 'Client-Side RAM'}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 text-center sm:text-left">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-600 dark:text-blue-400">0 KB</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">
            {language === 'hi' ? 'सर्वर अपलोड या लॉग्स' : 'Zero Cloud Logs'}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 text-center sm:text-left">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">₹0</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">
            {language === 'hi' ? 'हमेशा पूरी तरह मुफ़्त' : 'Free Forever'}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* THE 4 COMPREHENSIVE PRODUCT SUITES (Real 2D Flat Icon Tiles) */}
      {/* ========================================================= */}
      <div className="space-y-6 sm:space-y-8 pt-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'चार मुख्य टूलकिट' : 'The Four Core Product Suites'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            {language === 'hi'
              ? 'भारतीय भर्ती नियमों और डिजिटल वर्कफ़्लो के लिए विशेष रूप से तैयार किए गए टूल्स:'
              : 'Precision-engineered utilities calibrated to official portal guidelines and digital workflows:'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Suite 1: Govt & Exam Forms */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                  Govt &amp; Exam Forms
                </h3>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  PAN • UPSC • SSC • Passport
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Specialized presets for Indian competitive exams and ID portals. Includes UPSC Photo Maker with Name &amp; DOP banner (latest 10-day notice rule), SSC Photo (3.5×4.5 cm / 20–50 KB) &amp; Signature (140×60 px), PAN Card dual-portal specifications (NSDL Protean 197×276 px vs UTIITSL 213×213 px), Passport Seva 630×810 px digital upload, and Gov Form Document Compressor (&lt; 100/200/500 KB).
            </p>
          </div>

          {/* Suite 2: PDF Suite */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                  In-Browser PDF Suite
                </h3>
                <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                  Merge • Compress • Split • OCR
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Zero-upload PDF processing powered by WebAssembly and pdf-lib. Merge multiple PDF files, compress documents under 1 MB without blur, split pages or custom ranges, convert PDFs to high-resolution JPEG/PNG images, convert images to PDF, rotate orientations, and extract text via in-browser OCR.
            </p>
          </div>

          {/* Suite 3: Image Utilities */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                  Modern Image Utilities
                </h3>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Crop • Resize • Background • Watermark
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              High-speed image processing with HTML5 Canvas 2D. Perceptual image compressor with dynamic quality controls (save up to 90%), pixel-perfect image resizer with aspect ratio lock, client-side background remover, precision cropper, image watermarker, meme generator, and batch processing.
            </p>
          </div>

          {/* Suite 4: Format Converters */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                  Format Converters
                </h3>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  HEIC • WebP • AVIF • SVG
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Seamless local conversion between next-generation and standard graphic formats: HEIC to JPG (iPhone camera photos), PNG to WebP, WebP to JPG, AVIF to JPG, SVG to PNG vector rasterization, and JPG to PNG transparency conversions without server roundtrips.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ARCHITECTURAL PILLARS (Real 2D Flat Icon Tiles) */}
      {/* ========================================================= */}
      <div className="space-y-6 sm:space-y-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'मुख्य तकनीकी सिद्धांत' : 'Core Architecture Principles'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'क्लाउड कन्वर्टर्स की तुलना में FileWala कैसे अधिक सुरक्षित और तेज़ है:'
              : 'How FileWala guarantees security and performance compared to cloud converters.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Pillar 1 */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3 select-none">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              Zero Cloud Uploads
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? '100% क्लाइंट-साइड प्राइवेसी' : '100% Client-Side Privacy'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'शून्य सर्वर अपलोड। आपके आधार कार्ड, मार्कशीट, हस्ताक्षर और निजी फोटो सीधे आपके ब्राउज़र में प्रोसेस होते हैं।'
                : 'Zero server uploads. Your private documents, ID proofs, signatures, and personal photos are processed strictly inside browser memory.'}
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3 select-none">
            <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              WASM • Canvas 2D
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'तुरंत गति व ऑफलाइन क्षमता' : 'Instant In-Memory Speed'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'HTML5 Canvas 2D और WebAssembly आपके डिवाइस के CPU का उपयोग करते हैं। कोई कतार नहीं, कोई इंतज़ार नहीं।'
                : 'Powered by HTML5 Canvas 2D and WebAssembly on your device CPU. No upload delays, no queues, and works offline.'}
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3 select-none">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              Portal Calibrated
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'सरकारी नियमों के अनुसार सटीक' : 'Pre-Engineered Portal Limits'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'UPSC (नाम व तारीख स्टैम्प), SSC (20-50KB), PAN Card (200 DPI), और Passport Seva (630x810 px) के मानक पहले से सेट हैं।'
                : 'Exact dimension, DPI, and byte boundaries for UPSC (Name & Date stamp), SSC (20-50KB), PAN (200 DPI), and Passport Seva.'}
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3 select-none">
            <div className="w-11 h-11 rounded-xl bg-purple-500 text-white flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              Multi-Threaded
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'हार्डवेयर एफिशिएंसी' : 'Hardware Acceleration'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'मल्टी-थ्रेडेड रीसैंपलिंग और तुरंत मेमोरी क्लीनअप यह सुनिश्चित करते हैं कि आपका फोन या लैपटॉप हमेशा सुगम रहे।'
                : 'Multi-threaded image resampling, Web Workers for PDF operations, and instant garbage collection keep your system fast and responsive.'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ENGINEERING STACK & FOOTER (Open Layout) */}
      {/* ========================================================= */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-5">
        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Core Technologies
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            'React 19',
            'TypeScript',
            'Tailwind CSS',
            'HTML5 Canvas 2D',
            'WebAssembly',
            'pdf-lib',
            'pdfjs-dist',
            'Zero Cloud Telemetry',
          ].map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 font-mono">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span>Handcrafted by Mohammad Sufiyan (@mdsufidev) in Kushinagar, UP</span>
          </div>

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
              onClick={() => onNavigate?.('disclaimer')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
            >
              Compliance Disclaimer
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
        </div>
      </div>
    </div>
  );
};
