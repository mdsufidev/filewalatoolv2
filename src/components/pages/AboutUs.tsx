import React from 'react';
import {
  ShieldCheck,
  Zap,
  MapPin,
  Mail,
  ArrowLeft,
  Cpu,
  Lock,
  ExternalLink,
  Award,
  Linkedin,
  Instagram,
  Github,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface AboutUsProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact') => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ onBackHome, onNavigate }) => {
  const { language } = useLanguage();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 select-none animate-in fade-in duration-150">
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
            About FileWala
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL HERO (Swiss / Notion Minimalist Aesthetic) */}
      {/* ========================================================= */}
      <div className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-750 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
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
            : 'FileWala is an independent, client-side web utility suite engineered to solve document rejection and photo sizing for Indian competitive exams, recruitment portals, and everyday digital work.'}
        </p>
      </div>

      {/* ========================================================= */}
      {/* DEVELOPER PROFILE SECTION (Open Editorial Layout, No Boxes) */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Creator Identity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 shrink-0">
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
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                Solo Engineer
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                Active Project
              </span>
            </div>

            {/* Social Connect Links */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="https://linkedin.com/in/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150"
              >
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </a>

              <a
                href="https://instagram.com/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram</span>
              </a>

              <a
                href="https://github.com/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>

              <a
                href="mailto:support@filewalatool.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150"
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
      {/* KEY METRICS (Flat Open Row with 1px Dividers, Crisp Font-Mono) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-y border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">40+</div>
          <div className="text-xs text-zinc-500 font-mono">
            {language === 'hi' ? 'दस्तावेज़ व फ़ोटो टूल्स' : 'Browser Utilities'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">100%</div>
          <div className="text-xs text-zinc-500 font-mono">
            {language === 'hi' ? 'ऑन-डिवाइस मेमोरी' : 'Client-Side RAM'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">0 KB</div>
          <div className="text-xs text-zinc-500 font-mono">
            {language === 'hi' ? 'सर्वर अपलोड या लॉग्स' : 'Zero Cloud Logs'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">₹0</div>
          <div className="text-xs text-zinc-500 font-mono">
            {language === 'hi' ? 'हमेशा पूरी तरह मुफ़्त' : 'Free Forever'}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ARCHITECTURAL PILLARS (Unboxed 4-Column Open Layout) */}
      {/* ========================================================= */}
      <div className="space-y-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'मुख्य तकनीकी सिद्धांत' : 'Core Architecture Principles'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'क्लाउड कन्वर्टर्स की तुलना में FileWala कैसे अधिक सुरक्षित और तेज़ है:'
              : 'How FileWala guarantees security and performance compared to cloud converters.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Pillar 1 */}
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
              <Lock className="w-4.5 h-4.5 stroke-[1.75]" />
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
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
              <Zap className="w-4.5 h-4.5 stroke-[1.75]" />
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
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
              <Award className="w-4.5 h-4.5 stroke-[1.75]" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'सरकारी नियमों के अनुसार सटीक' : 'Pre-Engineered Portal Limits'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'UPSC (नाम व तारीख स्टैम्प), SSC (20-50KB), PAN Card (200 DPI), और Passport Seva (35x45mm) के मानक पहले से सेट हैं।'
                : 'Exact dimension, DPI, and byte boundaries for UPSC (Name & Date stamp), SSC (20-50KB), PAN (200 DPI), and Passport Seva.'}
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
              <Cpu className="w-4.5 h-4.5 stroke-[1.75]" />
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
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-5">
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
              className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 font-mono text-zinc-500">
            <span>Handcrafted by Mohammad Sufiyan (@mdsufidev) in Kushinagar, UP</span>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="inline-flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
            >
              <span>{language === 'hi' ? 'संपर्क करें' : 'Contact Developer'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
