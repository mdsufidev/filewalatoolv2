import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  ChevronDown,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface GovtToolsSeoGuideProps {
  onSelectTool?: (section: 'document-tools', subToolId: string) => void;
  className?: string;
  activeSubToolId?: string;
}

export const GovtToolsSeoGuide: React.FC<GovtToolsSeoGuideProps> = ({
  onSelectTool,
  className = '',
  activeSubToolId,
}) => {
  const { language } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const portalSpecs = [
    {
      portal: 'UPSC Civil Services / OTR',
      exam: 'IAS, IFS, IPS, NDA, CDS, CMS',
      photoSize: '350 × 350 px (1:1 Ratio)',
      photoKb: '20 KB to 300 KB',
      sigSize: '350 × 350 px',
      sigKb: '20 KB to 300 KB',
      dpi: '200 DPI',
      specialRule: language === 'hi' ? 'नीचे सफेद पट्टी पर नाम व फोटो की तारीख (DOP) अनिवार्य' : 'Mandatory Name & Date of Photo (DOP) printed on bottom banner',
      toolId: 'upsc-photo-maker',
      toolName: 'UPSC Photo Maker',
    },
    {
      portal: 'SSC (Staff Selection Commission)',
      exam: 'CGL, CHSL, MTS, GD, CPO, Steno',
      photoSize: '100 × 120 px (3.5 × 4.5 cm)',
      photoKb: '20 KB to 50 KB (Strict)',
      sigSize: '140 × 60 px (4.0 × 2.0 cm)',
      sigKb: '10 KB to 20 KB (Strict)',
      dpi: '200 DPI',
      specialRule: language === 'hi' ? 'बिना टोपी व चश्मे के सीधा चेहरा, सिग्नेचर 10–20 KB में ही हो' : 'No cap, no tinted glasses. Signature strictly 10–20 KB in horizontal ratio',
      toolId: 'ssc-resizer',
      toolName: 'SSC Resizer',
    },
    {
      portal: 'PAN Card (Protean NSDL / UTIITSL)',
      exam: 'New PAN Card (Form 49A / 49AA)',
      photoSize: '200 × 230 px (2.5 × 3.5 cm)',
      photoKb: '20 KB to 50 KB',
      sigSize: '354 × 157 px (4.5 × 2.0 cm)',
      sigKb: 'Under 50 KB',
      dpi: '200 DPI (Strict Header)',
      specialRule: language === 'hi' ? 'सख्त 200 DPI रिज़ॉल्यूशन, सिग्नेचर केवल सफेद बैकग्राउंड पर' : 'Strict 200 DPI embedded metadata; signature must have pure white background',
      toolId: 'pan-photo-resize',
      toolName: 'PAN Photo Resizer',
    },
    {
      portal: 'MEA Passport Seva (PSK)',
      exam: 'Fresh Passport, Reissue, Tatkaal',
      photoSize: '350 × 450 px (35 × 45 mm)',
      photoKb: 'Under 300 KB',
      sigSize: '400 × 200 px (4.0 × 2.0 cm)',
      sigKb: 'Under 100 KB',
      dpi: '300 DPI',
      specialRule: language === 'hi' ? 'चेहरा 70–80% हिस्से में दिखे, बैकग्राउंड शुद्ध सफेद या हल्का' : '70–80% facial coverage, pure white background, sharp natural contrast',
      toolId: 'passport-photo-resize',
      toolName: 'Passport Photo Resizer',
    },
    {
      portal: 'Sarkari Certificates & Marksheets',
      exam: 'EPFO, BPSC, UPPSC, State PSC, IBPS',
      photoSize: 'PDF or JPG/PNG Document',
      photoKb: 'Strictly Under 100 KB / 200 KB',
      sigSize: 'N/A',
      sigKb: 'Under 50 KB',
      dpi: '150–200 DPI',
      specialRule: language === 'hi' ? 'रोल नंबर, सील व हस्ताक्षर स्पष्ट दिखें, बैकग्राउंड साफ हो' : 'Aadhaar, Caste & Marksheets compressed without text blurring or seal distortion',
      toolId: 'gov-compressor',
      toolName: 'Gov Document Compressor',
    },
  ];

  const faqs = [
    {
      q: language === 'hi'
        ? 'सरकारी पोर्टल पर फोटो या सिग्नेचर क्यों रिजेक्ट हो जाते हैं?'
        : 'Why do government job and identity portals reject uploaded photos?',
      a: language === 'hi'
        ? 'अधिकांश सरकारी पोर्टल (जैसे UPSC, SSC, PAN और Passport Seva) ऑटोमेटेड सर्वर-साइड वैलिडेशन बॉट्स का उपयोग करते हैं। यदि फ़ाइल का साइज़ निर्धारित सीमा से मात्र 1 KB भी अधिक होता है (उदा. SSC में 50.1 KB), या डाइमेंशन्स (पिक्सेल) गलत होते हैं, या JPEG हेडर में 200 DPI की जगह 72 DPI होता है, तो पोर्टल तुरंत फ़ाइल को रिजेक्ट कर देता है। FileWala टूल इन सभी मानकों को पहले से लॉक रखता है।'
        : 'Most Indian portals (UPSC, SSC, NSDL, MEA) employ strict automated server-side verification scripts. If an image exceeds the ceiling by even 1 KB (e.g. 50.1 KB on SSC), has non-compliant pixel dimensions, or lacks the required 200 DPI JFIF metadata, the upload is instantly blocked. FileWala locks all parameters automatically so your file passes verification on the first attempt.',
    },
    {
      q: language === 'hi'
        ? 'UPSC फॉर्म में फोटो पर नाम और तारीख (Name & DOP) कैसे जोड़ें?'
        : 'How does the UPSC Photo Maker add the candidate name and Date of Photo (DOP)?',
      a: language === 'hi'
        ? 'संघ लोक सेवा आयोग (UPSC) के नवीनतम नियमों के अनुसार, उम्मीदवार की तस्वीर पर उसका पूरा नाम और जिस तारीख को फोटो खींची गई (DOP) वह सफेद नीचे वाली पट्टी पर छपी होनी चाहिए। FileWala का UPSC Photo Maker सीधे आपके ब्राउज़र में कैनवास की मदद से उम्मीदवार का नाम और DOP स्टैम्प जोड़ता है और 350x350 px, 20-300 KB में फ़ाइल तैयार करता है।'
        : 'According to the official UPSC Civil Services & OTR guidelines, the candidate photograph must feature the applicant full name and the photograph capture date (Date of Photo - DOP) printed clearly across a white bottom banner. FileWala renders this text overlay in-memory on HTML5 Canvas and exports a certified 350x350 px JPEG between 20 KB and 300 KB.',
    },
    {
      q: language === 'hi'
        ? 'PAN कार्ड फोटो व सिग्नेचर के लिए 200 DPI रिज़ॉल्यूशन क्यों जरूरी है?'
        : 'Why is 200 DPI resolution mandatory for PAN Card photos and signatures?',
      a: language === 'hi'
        ? 'Protean (NSDL) और UTIITSL के प्रिंटिंग सिस्टम पैन कार्ड पर फोटो और सिग्नेचर को 200 डॉट्स प्रति इंच (DPI) पर प्रिंट करते हैं ताकि कार्ड पर विवरण धुंधला न हो। सामान्य मोबाइल कैमरे केवल 72 या 96 DPI पर फोटो सेव करते हैं। FileWala का पैन टूल JPEG फाइल के JFIF हेडर में बाइनरी स्तर पर 200 DPI टैग एम्बेड करता है।'
        : 'Protean (formerly NSDL) and UTIITSL industrial card printers require exactly 200 DPI (Dots Per Inch) metadata in the JPEG header so biometric signatures and photos do not pixelate during plastic card thermal printing. Standard mobile phone cameras only save files at 72 or 96 DPI. FileWala automatically writes the exact 200 DPI JFIF header tag directly into the binary byte stream.',
    },
    {
      q: language === 'hi'
        ? 'SSC CGL / CHSL / MTS में सिग्नेचर का साइज़ 10 KB से 20 KB में कैसे लाएं?'
        : 'How does the SSC Resizer compress signatures strictly between 10 KB and 20 KB?',
      a: language === 'hi'
        ? 'SSC पोर्टल की सख्त शर्त है कि सिग्नेचर 10 KB से कम नहीं होना चाहिए और 20 KB से अधिक नहीं होना चाहिए। FileWala का एल्गोरिद्म बाइनरी सर्च के ज़रिए कम्प्रेशन क्वालिटी को स्वचालित रूप से एडजस्ट करता है, ताकि फ़ाइल का साइज़ ठीक 14 से 18 KB के बीच बने और सिग्नेचर का बैकग्राउंड बिल्कुल साफ और सफेद रहे।'
        : 'Staff Selection Commission enforces an unforgiving boundary: signatures below 10 KB or above 20 KB are blocked. FileWala applies an automated binary search compression loop that calibrates quality quantization matrices to lock your file weight safely between 14 KB and 18 KB with 140x60 px dimensions and clean white canvas.',
    },
    {
      q: language === 'hi'
        ? 'मार्कशीट या आधार कार्ड को 100 KB से कम कंप्रेस करने पर अक्षर धुंधले क्यों नहीं होते?'
        : 'How does FileWala compress certificates under 100 KB without making text unreadable?',
      a: language === 'hi'
        ? 'साधारण टूल्स पूरे डॉक्यूमेंट को ब्लर कर देते हैं जिससे रोल नंबर व नाम नहीं दिखता। FileWala का Gov Document Compressor स्मार्ट हाई-पास टेक्स्ट क्लैरिटी फिल्टर का उपयोग करता है। यह बैकग्राउंड के शोर और पीलेपन को हटाकर केवल टेक्स्ट के किनारों को शार्प करता है, जिससे 90 KB की फ़ाइल में भी हर एक अक्षर शीशे जैसा साफ दिखाई देता है।'
        : 'Generic cloud compressors uniformly downsample images, turning roll numbers and official seals into unreadable smudges. FileWala Gov Form Compressor applies an adaptive high-pass text sharpening and background-whitening filter. It eliminates paper grain and shadows while boosting black text contrast, keeping numbers razor-sharp even at 85–95 KB file sizes.',
    },
    {
      q: language === 'hi'
        ? 'क्या मेरे आधार कार्ड या मार्कशीट किसी सर्वर पर अपलोड होते हैं?'
        : 'Are my Aadhaar card, marksheets, or biometric signatures uploaded to any server?',
      a: language === 'hi'
        ? 'बिल्कुल नहीं! FileWala 100% क्लाइंट-साइड वेब असेंबली व HTML5 कैनवास तकनीक पर चलता है। आपकी फाइलें आपके फोन या कंप्यूटर की रैम (RAM) में ही प्रोसेस होती हैं। आपका कोई भी संवेदनशील डेटा किसी सर्वर पर नहीं भेजा जाता और न ही कोई लॉग रखा जाता है।'
        : 'No, never. FileWala runs 100% inside your local device memory using client-side WebAssembly and HTML5 Canvas. Your documents, Aadhaar numbers, biometric scans, and signatures never leave your browser and are never uploaded or retained anywhere.',
    },
  ];

  return (
    <section className={`w-full max-w-7xl mx-auto space-y-12 select-none ${className}`}>
      {/* ========================================================= */}
      {/* 1. OFFICIAL PORTAL SPECIFICATIONS MATRIX (Table Layout) */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 mb-1.5">
              <span>Official Criteria Database</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {language === 'hi'
                ? 'सरकारी पोर्टल फोटो व सिग्नेचर मानक निर्देशिका (2026)'
                : 'Indian Govt Portal Photo & Signature Specifications (2026 Guidelines)'}
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Updated for UPSC, SSC, PAN &amp; MEA
          </span>
        </div>

        {/* Responsive Table */}
        <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 font-mono text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold">Portal &amp; Exam</th>
                <th className="py-3 px-4 font-semibold">Photo Dimensions</th>
                <th className="py-3 px-4 font-semibold">Photo KB Limit</th>
                <th className="py-3 px-4 font-semibold">Signature Limits</th>
                <th className="py-3 px-4 font-semibold">DPI</th>
                <th className="py-3 px-4 font-semibold">Special Requirement</th>
                <th className="py-3 px-4 font-semibold text-right">Quick Tool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {portalSpecs.map((spec) => {
                const isCurrentTool = activeSubToolId === spec.toolId;
                return (
                  <tr
                    key={spec.portal}
                    className={`transition-colors duration-150 ${
                      isCurrentTool
                        ? 'bg-zinc-100/70 dark:bg-zinc-850/80 font-medium'
                        : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-850/40'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-950 dark:text-zinc-100">
                        {spec.portal}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {spec.exam}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {spec.photoSize}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {spec.photoKb}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <div>{spec.sigSize}</div>
                      <div className="text-[10px] text-zinc-500">{spec.sigKb}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {spec.dpi}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs leading-relaxed text-[11px]">
                      {spec.specialRule}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {onSelectTool && (
                        <button
                          type="button"
                          onClick={() => onSelectTool('document-tools', spec.toolId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-900 dark:text-zinc-100 transition-colors duration-150 cursor-pointer"
                        >
                          <span>{language === 'hi' ? 'खोलें' : 'Launch'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. REJECTION PREVENTION GUIDE (Editorial Content) */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi'
              ? 'सरकारी फॉर्म्स में फोटो रिजेक्शन से कैसे बचें?'
              : 'How to Prevent Form Rejection on Indian Government Portals'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'हजारों उम्मीदवारों के फॉर्म केवल इन 4 सामान्य गलतियों के कारण खारिज हो जाते हैं:'
              : 'Over 15% of online recruitment applications are rejected due to non-compliant digital uploads.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* Card 1 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <span className="font-mono text-xs font-bold">01</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'सख्त KB सीमा (Byte Bounds)' : 'Strict Byte Boundaries'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'यदि फॉर्म 20–50 KB मांगता है, तो 19.9 KB या 50.1 KB दोनों रिजेक्ट हो जाएंगे। FileWala फ़ाइल को सटीक सुरक्षित रेंज (जैसे 35 KB) में लॉक करता है।'
                : 'If an SSC portal mandates 20–50 KB, both 19.9 KB and 50.1 KB fail server validation. FileWala locks byte sizes in the exact safe centroid (e.g. 35 KB).'}
            </p>
          </div>

          {/* Card 2 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <span className="font-mono text-xs font-bold">02</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? '200 / 300 DPI हेडर टैग' : 'True DPI JFIF Encoding'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'PAN (NSDL) और पासपोर्ट पोर्टल DPI हेडर चेक करते हैं। फोन के 72 DPI की बजाय हमारा इंजन वास्तविक 200/300 DPI JFIF हेडर लिखता है।'
                : 'Protean NSDL and Passport Seva verify printer DPI markers. Rather than standard 72 DPI phone output, FileWala injects binary 200/300 DPI JFIF tags.'}
            </p>
          </div>

          {/* Card 3 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <span className="font-mono text-xs font-bold">03</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'साफ सफेद सिग्नेचर बैकग्राउंड' : 'Pure White Signature Canvas'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'कागज की परछाईं या पीलेपन वाले हस्ताक्षर खारिज हो जाते हैं। हमारा टूल बैकग्राउंड को 100% शुद्ध सफेद (#FFFFFF) कर देता है।'
                : 'Signatures captured on notebook lines or under dim yellow lighting fail OCR verification. Our threshold filter purifies backings to clean #FFFFFF.'}
            </p>
          </div>

          {/* Card 4 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <span className="font-mono text-xs font-bold">04</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'नाम व तारीख स्टैम्प (UPSC DOP)' : 'UPSC Date of Photo (DOP)'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'UPSC सिविल सेवा में 10 दिन से अधिक पुरानी फोटो या बिना DOP/नाम वाली फोटो अमान्य है। टूल तुरंत सही फॉन्ट में स्टैम्प लगा देता है।'
                : 'UPSC requires the photograph to be taken within 10 days of notification with candidate Name and DOP stamped in clear dark uppercase typography.'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. AUTHORITATIVE SARKARI EXAM FAQ SECTION */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'सरकारी फॉर्म्स व फोटो टूल्स: अक्सर पूछे जाने वाले सवाल' : 'Frequently Asked Questions (Sarkari Form Uploads)'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'उम्मीदवारों, साइबर कैफ़े ऑपरेटरों और छात्रों के लिए संपूर्ण सहायता गाइड।'
              : 'Comprehensive answers to common questions about Indian competitive exam uploads.'}
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left text-xs sm:text-sm font-semibold text-zinc-950 dark:text-zinc-100 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-zinc-950 dark:text-zinc-100' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
