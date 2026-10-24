import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

export const DICTIONARY: Translations = {
  // Brand & Top bar
  'app.name': { en: 'FileWalaTool', hi: 'फ़ाइलवाला टूल' },
  'app.tagline': {
    en: 'Human-Friendly Govt Form & Document Suite',
    hi: 'सरकारी फॉर्म्स व फ़ाइलों के लिए आसान और सुरक्षित टूल',
  },
  'badge.pro': { en: 'PRO', hi: 'प्रो' },
  'badge.clientSide': {
    en: '100% Private (On-Device)',
    hi: '100% प्राइवेट (फ़ोन/लैपटॉप में)',
  },
  'badge.zeroUploads': {
    en: 'Files Never Uploaded to Server',
    hi: 'फ़ाइलें कभी सर्वर पर नहीं जातीं',
  },
  'badge.filesNeverLeave': {
    en: 'Your Documents Stay 100% Private',
    hi: 'दस्तावेज़ आपके डिवाइस में ही सुरक्षित हैं',
  },

  // Navbar Links
  'nav.imageTools': { en: 'Image Tools', hi: 'फ़ोटो टूल्स' },
  'nav.imageToolsShort': { en: 'Images', hi: 'फ़ोटो' },
  'nav.pdfTools': { en: 'PDF Tools', hi: 'PDF टूल्स' },
  'nav.convert': { en: 'Convert Format', hi: 'फॉर्मेट बदलें' },
  'nav.documentTools': { en: 'Govt Exam Forms', hi: 'सरकारी फॉर्म्स' },
  'nav.documentToolsShort': { en: 'Forms', hi: 'फॉर्म्स' },
  'nav.search': {
    en: 'Search tools (e.g. UPSC, 20KB, Merge PDF)...',
    hi: 'यहाँ खोजें (जैसे: UPSC, 20KB, PDF जोड़ें)...',
  },
  'nav.searchAll': {
    en: 'Search all 40+ friendly tools...',
    hi: 'सभी 40+ टूल्स आसानी से खोजें...',
  },
  'nav.recents': { en: 'Recent Files', hi: 'हाल की फ़ाइलें' },
  'nav.shortcuts': { en: 'Keyboard Shortcuts', hi: 'शॉर्टकट कीज़' },
  'nav.exploreSuite': { en: 'Explore All Tools', hi: 'सभी टूल्स देखें' },
  'nav.exploreAll': { en: 'All Tools', hi: 'पूरा देखें' },

  // Hero Section
  'hero.pill': {
    en: '🔒 100% Private · No Server Uploads · Safe for Aadhaar & Marksheets',
    hi: '🔒 100% सुरक्षित · फ़ाइल कभी सर्वर पर नहीं जाती · आधार व मार्कशीट के लिए पूरी तरह सेफ',
  },
  'hero.title': {
    en: 'Stop Stressing Over Form Requirements — Ready in Seconds',
    hi: 'फॉर्म रिजेक्ट होने की चिंता खत्म — सब कुछ 2 सेकंड में तैयार',
  },
  'hero.description': {
    en: 'Easily resize exam photos (UPSC, SSC, PAN, Passport), compress documents under 100KB/200KB, and merge PDFs directly in your browser. Zero cyber café fees, 100% private.',
    hi: 'सरकारी फॉर्म्स (UPSC, SSC, PAN, Passport) के लिए सही साइज़ में फोटो-साइन बनाएं, या PDF मर्ज व कंप्रेस करें। साइबर कैफ़े के चक्कर और पैसे बचाएं — 100% मुफ़्त और प्राइवेट।',
  },
  'hero.featureGpu': {
    en: 'Lightning Fast (Under 2s)',
    hi: 'सिर्फ 2 सेकंड में तुरंत तैयार',
  },
  'hero.featurePrivacy': {
    en: '100% Private (No Uploads)',
    hi: '100% प्राइवेट (कोई सर्वर अपलोड नहीं)',
  },
  'hero.featureFree': {
    en: '100% Free Forever (No Sign-up)',
    hi: 'हमेशा के लिए मुफ़्त (बिना किसी फीस के)',
  },

  // Category Tabs
  'cat.all': { en: 'All Tools', hi: 'सभी टूल्स' },
  'cat.imageTools': { en: 'Photo Tools', hi: 'फ़ोटो टूल्स (Size & Crop)' },
  'cat.pdfTools': { en: 'PDF Tools', hi: 'PDF टूल्स (Merge & Compress)' },
  'cat.convert': { en: 'Format Converter', hi: 'फॉर्मेट बदलें (HEIC/JPG/PNG)' },
  'cat.documentTools': { en: 'Govt & Exam Forms', hi: 'सरकारी फॉर्म्स (UPSC/SSC/PAN)' },

  // Common Actions
  'action.open': { en: 'Open Tool', hi: 'टूल खोलें ➔' },
  'action.upload': { en: 'Choose Photo / Document', hi: 'फ़ोटो या डॉक्यूमेंट चुनें' },
  'action.download': { en: 'Download Ready File', hi: 'तैयार फ़ाइल डाउनलोड करें' },
  'action.reset': { en: 'Start Fresh', hi: 'दोबारा शुरू करें' },
  'action.clear': { en: 'Clear', hi: 'हटाएं' },
  'action.copy': { en: 'Copy', hi: 'कॉपी करें' },
  'action.save': { en: 'Save File', hi: 'फ़ाइल सेव करें' },
  'action.backToCatalog': { en: 'Back to All Tools', hi: 'सभी टूल्स पर वापस जाएं' },
  'action.theme': { en: 'Theme', hi: 'थीम बदलें' },
  'action.language': { en: 'Language', hi: 'भाषा चुनें' },
};

export const TOOL_TRANSLATIONS: Record<string, { name: { en: string; hi: string }; desc: { en: string; hi: string } }> = {
  // Document Tools (Gov)
  'pan-photo-resize': {
    name: { en: 'PAN Photo Resizer', hi: 'PAN कार्ड फ़ोटो रिसाइज़र' },
    desc: {
      en: 'Exact 200×230 px, 20–50 KB, 200 DPI JPEG for Protean / UTIITSL.',
      hi: 'Protean (NSDL) और UTIITSL के लिए 200×230 px, 20–50 KB और 200 DPI फ़ोटो बनाएं।',
    },
  },
  'signature-resize': {
    name: { en: 'PAN Signature Resizer', hi: 'PAN साइन (हस्ताक्षर) रिसाइज़र' },
    desc: {
      en: 'Clean white background, 354×157 px, under 50 KB at 200 DPI for PAN card.',
      hi: 'साफ सफेद बैकग्राउंड के साथ 354×157 px और 50 KB के भीतर पैन कार्ड साइन तैयार करें।',
    },
  },
  'passport-photo-resize': {
    name: { en: 'Passport Photo Resizer', hi: 'पासपोर्ट सेवा फ़ोटो (35×45mm)' },
    desc: {
      en: '350×450 px (35×45 mm) under 300 KB with 300 DPI biometric frame.',
      hi: 'पासपोर्ट सेवा केंद्र के बायोमेट्रिक नियमों अनुसार 35×45 mm फ़ोटो 300 KB के अंदर बनाएं।',
    },
  },
  'passport-signature-resize': {
    name: { en: 'Passport Signature Resizer', hi: 'पासपोर्ट साइन (हस्ताक्षर) रिसाइज़र' },
    desc: {
      en: 'Official MEA signature 400×200 px under 100 KB with auto background clean.',
      hi: 'पासपोर्ट पोर्टल के लिए साफ डार्क साइन 400×200 px और 100 KB के अंदर तैयार करें।',
    },
  },
  'upsc-photo-maker': {
    name: { en: 'UPSC Photo Maker (Name + Date)', hi: 'UPSC फ़ोटो मेकर (नाम + तारीख़ स्टैम्प)' },
    desc: {
      en: 'Candidate name & Date of Photograph (DOP) printed on bottom banner.',
      hi: 'UPSC नियमों के अनुसार फोटो के नीचे अपना नाम और तारीख़ (DOP) लगाएं (20-300 KB)।',
    },
  },
  'ssc-resizer': {
    name: { en: 'SSC Photo & Signature Resizer', hi: 'SSC फ़ोटो व साइन रिसाइज़र' },
    desc: {
      en: 'Strict limits: Photo (20–50 KB, 100×120 px) & Signature (10–20 KB, 140×60 px).',
      hi: 'SSC CGL/CHSL/MTS के लिए फोटो 20-50 KB और साइन 10-20 KB में बिल्कुल सटीक बनाएं।',
    },
  },
  'gov-compressor': {
    name: { en: 'Gov Form Document Compressor', hi: 'सरकारी फॉर्म डॉक्यूमेंट कंप्रेसर' },
    desc: {
      en: 'Shrink Aadhaar & certificate proofs under 100 KB, 200 KB, or 500 KB.',
      hi: 'आधार कार्ड, मार्कशीट या सर्टिफिकेट को 100 KB या 200 KB के अंदर छोटा करें।',
    },
  },

  // Image Tools
  'compressor': {
    name: { en: 'Image Compressor (to KB)', hi: 'फ़ोटो साइज़ कंप्रेसर (KB कम करें)' },
    desc: {
      en: 'Reduce photo size by up to 90% without losing visible clarity.',
      hi: 'फ़ोटो की क्वालिटी खराब किए बिना उसका साइज़ 20KB, 50KB या 100KB में कम करें।',
    },
  },
  'resizer': {
    name: { en: 'Image Resizer', hi: 'फ़ोटो पिक्सल रिसाइज़र' },
    desc: {
      en: 'Scale photos by exact pixels or percentage with aspect ratio lock.',
      hi: 'मनचाहे पिक्सल (जैसे 200x230, 800x600) या प्रतिशत में फोटो रिसाइज़ करें।',
    },
  },
  'cropper': {
    name: { en: 'Image Cropper & Rotate', hi: 'फ़ोटो क्रॉपर और सीधा करें' },
    desc: {
      en: 'Crop images with preset ratios (1:1, 16:9, passport) and rotate easily.',
      hi: 'फ़ोटो को पासपोर्ट, चौकोर या मनचाहे साइज़ में क्रॉप करें और घुमाएं।',
    },
  },

  // PDF Tools
  'merge-pdf': {
    name: { en: 'Merge PDF (Combine Files)', hi: 'PDF जोड़ें (Merge PDF)' },
    desc: {
      en: 'Combine multiple PDF files or marksheets into one single ordered file.',
      hi: 'मार्कशीट, आधार और प्रमाणपत्रों को जोड़कर 1 फाइल में इकट्ठा करें।',
    },
  },
  'compress-pdf': {
    name: { en: 'Compress PDF (under 100KB/200KB)', hi: 'PDF का साइज़ कम करें' },
    desc: {
      en: 'Reduce PDF file size for portal uploads without making text blurry.',
      hi: 'सरकारी पोर्टल पर अपलोड करने के लिए PDF का साइज़ 100KB या 200KB के अंदर लाएं।',
    },
  },
  'pdf-to-word': {
    name: { en: 'PDF to Word (.docx)', hi: 'PDF से Word कन्वर्टर' },
    desc: {
      en: 'Convert PDF into an editable Microsoft Word document directly in browser.',
      hi: 'PDF को आसानी से एडिट करने लायक Word (.docx) फाइल में बदलें।',
    },
  },
  'pdf-to-jpg': {
    name: { en: 'PDF to JPG Converter', hi: 'PDF से JPG फ़ोटो निकालें' },
    desc: {
      en: 'Extract high-resolution JPG images from every page of your PDF.',
      hi: 'PDF के हर पेज को साफ और हाई-क्वालिटी JPG फ़ोटो में बदलें।',
    },
  },
  'image-to-pdf': {
    name: { en: 'Photos to PDF Converter', hi: 'फ़ोटो से PDF बनाएं' },
    desc: {
      en: 'Compile JPG & PNG photos or marksheets into a clean, shareable PDF.',
      hi: 'अपने फोन से खींची तस्वीरों या मार्कशीट से 1 क्लिक में साफ PDF बनाएं।',
    },
  },
  'split-pdf': {
    name: { en: 'Split PDF (Extract Pages)', hi: 'PDF से पेज अलग करें' },
    desc: {
      en: 'Extract specific pages or page ranges from a large PDF document.',
      hi: 'बड़ी PDF में से सिर्फ जरूरी पेज अलग करके नई PDF बनाएं।',
    },
  },
  'rotate-pdf': {
    name: { en: 'Rotate PDF Pages', hi: 'PDF पेज सीधा घुमाएं' },
    desc: {
      en: 'Fix upside-down or sideways scanned PDF pages by 90° or 180°.',
      hi: 'उल्टे या तिरछे स्कैन हुए PDF पेजों को आसानी से सीधा करें।',
    },
  },
  'pdf-to-text': {
    name: { en: 'PDF to Text (OCR)', hi: 'PDF से टेक्स्ट निकालें (OCR)' },
    desc: {
      en: 'Extract copyable text from scanned PDFs without sending files to any server.',
      hi: 'स्कैन किए गए कागजात से टेक्स्ट पढ़कर कॉपी करने लायक बनाएं।',
    },
  },

  // Converters
  'png-to-webp': {
    name: { en: 'PNG to WebP Converter', hi: 'PNG से WebP कन्वर्टर' },
    desc: {
      en: 'Reduce file size by up to 80% while preserving transparent backgrounds.',
      hi: 'सफेद/पारदर्शी बैकग्राउंड बनाए रखते हुए फ़ाइल साइज़ 80% तक छोटा करें।',
    },
  },
  'webp-to-jpg': {
    name: { en: 'WebP to JPG Converter', hi: 'WebP से सामान्य JPG बनाएं' },
    desc: {
      en: 'Convert WebP images into universal JPEG for all portals and apps.',
      hi: 'WebP फ़ोटो को सामान्य JPG में बदलें ताकि हर जगह खुल सके।',
    },
  },
  'heic-to-jpg': {
    name: { en: 'iPhone (HEIC) to JPG', hi: 'iPhone (HEIC) से JPG बनाएं' },
    desc: {
      en: 'Convert Apple iPhone HEIC camera photos directly into standard JPG.',
      hi: 'Apple iPhone से ली गई फ़ोटो (HEIC) को सीधे JPG बनाएं ताकि फॉर्म में अपलोड हो सके।',
    },
  },
  'jpg-to-png': {
    name: { en: 'JPG to PNG Converter', hi: 'JPG से PNG कन्वर्टर' },
    desc: {
      en: 'Convert JPEG to crisp lossless PNG format without quality drop.',
      hi: 'JPG फोटो को हाई-क्वालिटी PNG फॉर्मेट में बदलें।',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  tToolName: (toolId: string, fallback?: string) => string;
  tToolDesc: (toolId: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        // 1. Check URL param ?lang=hi or ?lang=en
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang === 'hi' || urlLang === 'en') {
          return urlLang;
        }

        // 2. Check localStorage
        const stored = localStorage.getItem('filewala_language');
        if (stored === 'hi' || stored === 'en') {
          return stored;
        }
      } catch (e) {
        // ignore
      }
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem('filewala_language', language);
      document.documentElement.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    } catch (e) {
      // ignore
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const t = (key: string, fallback?: string): string => {
    if (DICTIONARY[key]) {
      return DICTIONARY[key][language] || DICTIONARY[key]['en'] || fallback || key;
    }
    return fallback || key;
  };

  const tToolName = (toolId: string, fallback?: string): string => {
    if (TOOL_TRANSLATIONS[toolId]) {
      return TOOL_TRANSLATIONS[toolId].name[language] || TOOL_TRANSLATIONS[toolId].name['en'] || fallback || toolId;
    }
    return fallback || toolId;
  };

  const tToolDesc = (toolId: string, fallback?: string): string => {
    if (TOOL_TRANSLATIONS[toolId]) {
      return TOOL_TRANSLATIONS[toolId].desc[language] || TOOL_TRANSLATIONS[toolId].desc['en'] || fallback || '';
    }
    return fallback || '';
  };

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      tToolName,
      tToolDesc,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
