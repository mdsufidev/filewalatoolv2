import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Zap,
  ShieldCheck,
  FileBadge,
  Linkedin,
  Instagram,
  ArrowUpRight,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Monitor,
  Github,
  Cpu,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  ALL_TOOLS,
  CATEGORIES_CONFIG,
  ToolCategory,
} from '../../core/toolsData';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { ToolCategoryFilter } from '../tools/ToolCategoryFilter';
import { ToolGrid } from '../tools/ToolGrid';
import { TrustCertificationSection } from './TrustCertificationSection';
import { GovtToolsSeoGuide } from '../seo/GovtToolsSeoGuide';

interface HomePageProps {
  selectedCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  onLaunchTool: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  onOpenPrivacyModal?: () => void;
  onOpenCommandPalette?: () => void;
  onNavigatePage?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'desktop') => void;
}

// Everyday Hindi / Hinglish and English search keywords mapping
const SEARCH_ALIASES: Record<string, string[]> = {
  'upsc-photo-maker': [
    'upsc',
    'name date',
    'dop',
    'date of photo',
    'tarikh',
    'naam',
    'upsc form',
    'stamp',
    'civil services',
    'ias',
    'nda',
    'cds',
  ],
  'ssc-resizer': [
    'ssc',
    'cgl',
    'chsl',
    'mts',
    'gd',
    '20kb',
    '50kb',
    '10kb',
    '20 kb',
    'sign',
    'hastakshar',
    'signature',
    'ssc photo',
    'ssc sign',
  ],
  'pan-photo-resize': [
    'pan',
    'pan card',
    '200 dpi',
    'nsdl',
    'protean',
    'utiitsl',
    'uti',
    'photo resize',
    'pan photo',
  ],
  'signature-resize': [
    'pan sign',
    'pan signature',
    'hastakshar',
    'safed sign',
    'white background sign',
    '50kb',
  ],
  'passport-photo-resize': [
    'passport',
    'seva',
    '35x45',
    '350x450',
    '300 dpi',
    'blue background',
    'white background',
    'mea',
    'visa photo',
  ],
  'passport-signature-resize': [
    'passport sign',
    'passport signature',
    'mea sign',
    '400x200',
  ],
  'gov-compressor': [
    'aadhar',
    'aadhaar',
    'marksheet',
    'certificate',
    '100kb',
    '200kb',
    'epfo',
    'sarathi',
    'document kam',
    'size kam',
    'pdf kam',
  ],
  'compressor': [
    'compress',
    'size kam',
    'chhota',
    'kb',
    'mb to kb',
    'reduce size',
    'photo size',
    'compress image',
    'photo kam',
    'chhoti photo',
    '20kb',
    '50kb',
    '100kb',
  ],
  'resizer': [
    'pixel',
    'resize',
    'dimension',
    'scale',
    'badalna',
    'photo resize',
    '800x600',
    'width height',
  ],
  'cropper': [
    'crop',
    'katna',
    'katna photo',
    'rotate',
    'ghomana',
    'seedha',
    'aspect ratio',
    '1:1',
    'square',
    'passport crop',
  ],
  'merge-pdf': [
    'merge',
    'jodna',
    'ek sath',
    'combine',
    'combine pdf',
    'join pdf',
    'multiple pdf',
    'marksheet merge',
    'pdf jodein',
    'ek pdf',
  ],
  'compress-pdf': [
    'compress pdf',
    'pdf size kam',
    'pdf 100kb',
    'pdf 200kb',
    'shrink pdf',
    'chhota pdf',
    'kam size pdf',
  ],
  'pdf-to-word': ['word', 'docx', 'edit pdf', 'pdf se word', 'editable'],
  'pdf-to-jpg': ['pdf to photo', 'pdf se image', 'pdf to jpg', 'pdf to png'],
  'image-to-pdf': [
    'photo to pdf',
    'image to pdf',
    'jpg to pdf',
    'pdf banana',
    'photo se pdf',
    'marksheet pdf',
  ],
  'split-pdf': ['split', 'page alag', 'extract pages', 'tukde'],
  'rotate-pdf': ['rotate', 'ulta', 'seedha', 'rotate pdf', 'sidha'],
  'heic-to-jpg': [
    'iphone',
    'apple',
    'heic',
    'heif',
    'iphone photo',
    'ios photo',
    'heic to jpg',
  ],
  'png-to-webp': ['webp', 'png', 'transparent', 'lightweight'],
  'webp-to-jpg': ['webp to jpg', 'webp convert', 'jpg convert'],
};

export const HomePage: React.FC<HomePageProps> = ({
  selectedCategory,
  onSelectCategory,
  onLaunchTool,
  onOpenCommandPalette,
  onNavigatePage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { tToolName, tToolDesc, language } = useLanguage();

  // Friendly time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (language === 'hi') {
      if (hour < 12) return 'सुप्रभात';
      if (hour < 17) return 'नमस्ते';
      return 'शुभ संध्या';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 17) return 'Good afternoon';
      return 'Good evening';
    }
  }, [language]);

  // Filter tools based on category and search query (with Hinglish/Hindi alias support)
  const filteredTools = useMemo(() => {
    let list = ALL_TOOLS;

    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const nameMatch = t.name.toLowerCase().includes(q);
        const descMatch = t.description.toLowerCase().includes(q);
        const keywordMatch = t.targetKeyword.toLowerCase().includes(q);
        const badgeMatch = t.badge && t.badge.toLowerCase().includes(q);
        const translatedNameMatch = tToolName(t.id).toLowerCase().includes(q);
        const translatedDescMatch = tToolDesc(t.id).toLowerCase().includes(q);
        const aliasMatch = SEARCH_ALIASES[t.id]?.some(
          (alias) => alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase())
        );

        return Boolean(
          nameMatch ||
            descMatch ||
            keywordMatch ||
            badgeMatch ||
            translatedNameMatch ||
            translatedDescMatch ||
            aliasMatch
        );
      });
    }

    return list;
  }, [selectedCategory, searchQuery, tToolName, tToolDesc]);

  const activeCategoryMeta = useMemo(() => {
    return CATEGORIES_CONFIG.find((c) => c.id === selectedCategory) || CATEGORIES_CONFIG[0];
  }, [selectedCategory]);

  // Curated category groupings for "All Tools" view
  const categorizedSections = useMemo(() => {
    return [
      {
        id: 'document-tools' as ToolCategory,
        title: language === 'hi' ? 'सरकारी फॉर्म्स व परीक्षा टूल्स' : 'Govt & Exam Form Tools',
        subtitle:
          language === 'hi'
            ? 'UPSC (नाम व तारीख स्टैम्प), SSC, पैन कार्ड और पासपोर्ट सेवा के लिए फोटो रिसाइज करें'
            : 'Exact photo and signature specifications for UPSC, SSC, PAN Card, and Passport Seva',
        emoji: '🏛️',
        tools: ALL_TOOLS.filter((t) => t.category === 'document-tools'),
      },
      {
        id: 'pdf-tools' as ToolCategory,
        title: language === 'hi' ? 'PDF टूल्स' : 'PDF Tools & Document Utilities',
        subtitle:
          language === 'hi'
            ? 'मार्कशीट व सर्टिफिकेट जोड़ें, साइज़ कम करें या वर्ड में बदलें — बिना सर्वर अपलोड के'
            : 'Merge, compress, split, rotate, convert to Word, and extract text without uploading to servers',
        emoji: '📑',
        tools: ALL_TOOLS.filter((t) => t.category === 'pdf-tools'),
      },
      {
        id: 'image-tools' as ToolCategory,
        title: language === 'hi' ? 'फोटो टूल्स' : 'Image Optimizers & Creative Tools',
        subtitle:
          language === 'hi'
            ? 'फोटो का साइज़ (KB) कम करें, पिक्सल बदलें, क्रॉप करें और पासपोर्ट साइज बनाएं'
            : 'Compress file size, resize pixels, crop, watermark, round corners, and edit photos',
        emoji: '🖼️',
        tools: ALL_TOOLS.filter((t) => t.category === 'image-tools'),
      },
      {
        id: 'convert' as ToolCategory,
        title: language === 'hi' ? 'फॉर्मेट कन्वर्टर' : 'Image Format Converters',
        subtitle:
          language === 'hi'
            ? 'iPhone (HEIC) फोटो, WebP और PNG को आसानी से सामान्य JPG में बदलें'
            : 'Fast client-side conversion between JPG, PNG, WebP, HEIC/iPhone, and AVIF formats',
        emoji: '🔄',
        tools: ALL_TOOLS.filter((t) => t.category === 'convert'),
      },
    ];
  }, [language]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          HERO SECTION (Minimalist 2D Swiss / Linear Design)
      ========================================================================= */}
      <section className="relative w-full pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          
          {/* Status Label (Clean Flat 2D Tag) */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>
              {greeting} · {language === 'hi' ? '100% प्राइवेट व क्लाइंट-साइड सुइट' : '100% Private Client-Side Suite'}
            </span>
          </div>

          {/* Headline & Empathetic Subtitle (Swiss Typography) */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.15]">
              {language === 'hi' ? (
                <>
                  सरकारी फॉर्म्स व फ़ाइलें, <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">अब चुटकियों में आसान</span>
                </>
              ) : (
                <>
                  Stop Worrying About Form Rejections. <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">Ready in Seconds.</span>
                </>
              )}
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi' ? (
                <>
                  UPSC, SSC, PAN कार्ड या पासपोर्ट के लिए सही साइज़ और KB में फोटो-साइन तैयार करें, या PDF मर्ज व कंप्रेस करें। 100% मुफ़्त और प्राइवेट।
                </>
              ) : (
                <>
                  Format exam photos for UPSC, SSC, PAN, and Passport, or compress and merge PDFs directly in your browser. 100% private and completely free.
                </>
              )}
            </p>
          </div>

          {/* Minimal 3-Point Guarantee (Flat 2D inline) */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>{language === 'hi' ? '100% ऑन-डिवाइस (नो क्लाउड)' : 'Zero Cloud Uploads'}</span>
            </div>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>{language === 'hi' ? 'सिर्फ 2 सेकंड में तैयार' : '2-Second Execution'}</span>
            </div>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>{language === 'hi' ? '100% फॉर्म मंज़ूर' : 'Portal Compliant'}</span>
            </div>
          </div>

          {/* Minimalist 2D Search Bar */}
          <div className="max-w-xl mx-auto pt-2">
            <div
              className={`relative flex items-center rounded-lg px-3.5 py-2.5 transition-colors border ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 focus-within:border-zinc-500'
                  : 'bg-white border-zinc-300 focus-within:border-zinc-900'
              }`}
            >
              <Search className="w-4 h-4 shrink-0 mr-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'यहाँ खोजें (जैसे: SSC photo 20kb, PDF जोड़ें, UPSC date, HEIC)...'
                    : "Type what you need (e.g. 'SSC photo 20kb', 'merge marksheets', 'upsc')..."
                }
                className="w-full bg-transparent text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenCommandPalette?.()}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 hidden sm:inline-flex items-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                  title="Quick Search (Ctrl + K)"
                >
                  Ctrl+K
                </button>
              )}
            </div>

            {searchQuery && (
              <p className="text-xs text-left mt-2 px-1 text-zinc-500 font-mono">
                {filteredTools.length} tools matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          CATEGORY TABS (Flat 2D Linear Segment Control)
      ========================================================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8 mb-6">
        <ToolCategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
      </section>

      {/* =========================================================
          TOOL CARDS: 5-6 COLUMN FLAT 2D CARD GRID
      ========================================================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 mb-16">
        {/* Case 1: Search Query active */}
        {searchQuery ? (
          <div>
            {filteredTools.length === 0 ? (
              <div
                className={`text-center py-16 px-4 rounded-lg max-w-md mx-auto border ${
                  isDark
                    ? 'bg-zinc-900/40 border-zinc-800'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <Filter className="w-8 h-8 mx-auto mb-3 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {language === 'hi' ? `"${searchQuery}" के लिए कोई टूल नहीं मिला` : `No tools found for "${searchQuery}"`}
                </h3>
                <p className="text-xs mt-1 text-zinc-500">
                  {language === 'hi'
                    ? 'जैसे: "UPSC", "SSC", "compress", "PDF merge", या "20kb" खोजें।'
                    : 'Try searching for "compress", "resize", "pdf", "heic", or "upsc".'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    onSelectCategory('all');
                  }}
                  className="mt-4 px-3.5 py-1.5 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer transition-colors"
                >
                  {language === 'hi' ? 'सभी टूल्स देखें' : 'Show All Tools'}
                </button>
              </div>
            ) : (
              <ToolGrid
                tools={filteredTools}
                onLaunch={onLaunchTool}
                tToolName={tToolName}
                tToolDesc={tToolDesc}
              />
            )}
          </div>
        ) : selectedCategory !== 'all' ? (
          /* Case 2: Specific Category Filter Selected */
          <div>
            <div
              className={`rounded-lg p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border ${
                isDark
                  ? 'bg-zinc-900/60 border-zinc-800'
                  : 'bg-white border-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    {activeCategoryMeta.badge}
                  </span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs font-mono text-zinc-500">
                    {filteredTools.length} tools
                  </span>
                </div>
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {activeCategoryMeta.name}
                </h2>
                <p className="text-xs mt-0.5 max-w-2xl text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {activeCategoryMeta.description}
                </p>
              </div>

              <button
                onClick={() => onSelectCategory('all')}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150 shrink-0 cursor-pointer self-start md:self-auto ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200'
                }`}
              >
                <span>{language === 'hi' ? 'सभी 40+ टूल्स' : 'View All 40+ Tools'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <ToolGrid
              tools={filteredTools}
              onLaunch={onLaunchTool}
              tToolName={tToolName}
              tToolDesc={tToolDesc}
            />

            {/* If Document Tools (Govt & Exam) is selected, show authoritative Portal SEO Matrix & FAQs */}
            {selectedCategory === 'document-tools' && (
              <GovtToolsSeoGuide
                onSelectTool={onLaunchTool}
                className="mt-14 pt-10 border-t border-zinc-200/80 dark:border-zinc-800/80"
              />
            )}
          </div>
        ) : (
          /* Case 3: All Tools View - Grouped under Curated Sections */
          <div className="space-y-10">
            {categorizedSections.map((section) => (
              <div key={section.id} className="space-y-3.5">
                {/* Section Header (Swiss Typography) */}
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{section.emoji}</span>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{section.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                          {section.tools.length}
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCategory(section.id)}
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    <span>{language === 'hi' ? 'पूरा देखें' : `View all ${section.tools.length}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Flat 2D Card Grid */}
                <ToolGrid
                  tools={section.tools}
                  onLaunch={onLaunchTool}
                  tToolName={tToolName}
                  tToolDesc={tToolDesc}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================
          FILEWALA DESKTOP FOR WINDOWS (OFFLINE AI & BATCH SUITE)
      ========================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-zinc-200/80 dark:border-zinc-800/80 select-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Information & Direct CTA */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
              <Monitor className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Windows Desktop App • v1.0.0</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight leading-[1.2]">
                {language === 'hi'
                  ? 'FileWala Desktop: 100% ऑफलाइन AI फोटो एन्हांसर'
                  : 'FileWala Desktop: 100% Offline AI Picture Enhancer'}
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                {language === 'hi'
                  ? 'बिना इंटरनेट के अपने कंप्यूटर पर चलाएं! 4x अल्ट्रा एचडी अपस्केलिंग, फेशियल पोर्स और पुपिल्स रेस्टोरेशन और U2Net बैकग्राउंड रिमूवर — सब कुछ आपके लोकल GPU/CPU हार्डवेयर पर सीधे चलता है।'
                  : 'Run heavy neural AI models locally without internet connectivity. Enjoy 4x Ultra HD upscaling, facial pore & pupil reconstruction, and U2Net background removal powered directly by your NVIDIA GPU or multi-core CPU.'}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
                <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">AI Picture Enhancer</div>
                  <div className="text-zinc-500 text-[11px]">Ultra-Fast Preview V3</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
                <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">4x Ultra HD</div>
                  <div className="text-zinc-500 text-[11px]">Face Pore & Pupil Detail</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
                <Cpu className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">GPU Accelerated</div>
                  <div className="text-zinc-500 text-[11px]">NVIDIA CUDA & 8-Core CPU</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
                <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">100% Offline & Free</div>
                  <div className="text-zinc-500 text-[11px]">Zero Cloud Telemetry</div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Direct Download + Learn More + GitHub */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {/* Direct Download .EXE Link (Branded domain download) */}
              <a
                href="/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe"
                download="FileWala-TOOL-Setup-1.0.0.exe"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors duration-150 cursor-pointer shadow-none"
                title="Direct Download FileWala Setup for Windows (80.4 MB)"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Download for Windows (.exe)</span>
                <span className="text-[10px] font-mono opacity-80 pl-1 border-l border-white/20 dark:border-black/20">
                  80.4 MB
                </span>
              </a>

              {/* View Full Desktop Page Link */}
              <button
                type="button"
                onClick={() => onNavigatePage?.('desktop')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer"
              >
                <span>Full Specs & Guide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* GitHub Link */}
              <a
                href="https://github.com/mdsufidev/pixcutbgremover/releases/tag/v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 cursor-pointer"
                title="View GitHub Release v1.0.0"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
                <ArrowUpRight className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>

          {/* Right Column: SEO Screenshot Showcase in Flat 2D Frame */}
          <div className="lg:col-span-6">
            <figure className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-xs font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 inline-block"></span>
                  <span className="ml-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-sans font-medium">
                    FileWala TOOL v1.0.0 | AI Picture Enhancer [Hybrid Pro]
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">Windows 64-bit</span>
              </div>

              <img
                src="/filewala-desktop-app.png"
                alt="FileWala TOOL v1.0.0 Desktop Application showing AI Picture Enhancer Hybrid Pro with 4x Ultra HD upscaling and U2Net background remover on Windows"
                title="FileWala Desktop App Interface - Offline AI Picture Enhancer & BG Remover"
                width={1024}
                height={667}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover block cursor-pointer transition-transform duration-150 hover:scale-[1.01]"
                onClick={() => onNavigatePage?.('desktop')}
              />

              <figcaption className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Direct Split-Slider preview with face pore restoration and NVIDIA CUDA acceleration.</span>
                <button
                  type="button"
                  onClick={() => onNavigatePage?.('desktop')}
                  className="text-zinc-800 dark:text-zinc-200 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore UI</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* =========================================================
          HUMAN TRUST & GUARANTEE SECTION (Unboxed Flat 2D Linear Design)
      ========================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-zinc-200/80 dark:border-zinc-800/80 select-none">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
            <span>{language === 'hi' ? 'सुविधा व लाभ' : 'Core Advantages'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            {language === 'hi'
              ? 'FileWalaTool क्यों चुनें?'
              : 'Why Choose FileWalaTool?'}
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
            {language === 'hi'
              ? 'कोई साइबर कैफ़े जाने की ज़रूरत नहीं — अपने फोन या लैपटॉप से 1 क्लिक में दस्तावेज़ तैयार करें।'
              : 'No need to visit a cyber café or pay for software. Process your documents safely in seconds.'}
          </p>
        </div>

        {/* 3 Open Architectural Columns (Unboxed, Bada Bada, Flat 2D) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 text-left mb-14">
          {/* Feature 1 */}
          <div className="flex flex-col items-start space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-100 tracking-tight">
              {language === 'hi' ? '100% प्राइवेट व सुरक्षित' : '100% Private & Safe'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'आपकी फोटो और मार्कशीट कभी किसी सर्वर पर अपलोड नहीं होतीं। सारा काम आपके फोन/ब्राउज़र में ही होता है।'
                : 'Your files never leave your device. All processing happens in-memory inside your browser, ensuring total privacy.'}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-start space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
              <FileBadge className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-100 tracking-tight">
              {language === 'hi' ? 'सरकारी फॉर्म्स के लिए 100% सटीक' : 'Pre-configured for Govt Forms'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'UPSC, SSC, PAN Card, और Passport Seva के लिए निर्धारित साइज़ (20-50 KB, 350x450 px, 200 DPI) अपने आप सेट हैं।'
                : 'Official pixel dimensions, DPI, and KB limits for UPSC (Name & Date stamp), SSC, PAN, and Passport Seva are built-in.'}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-start space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
              <Zap className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-100 tracking-tight">
              {language === 'hi' ? 'सुपरफास्ट व हमेशा मुफ्त' : 'Instant & Free Forever'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'कोई इंतज़ार नहीं, कोई वॉटरमार्क नहीं, और कोई फीस नहीं। जितनी चाहें उतनी फाइलें प्रोसेस करें।'
                : 'Zero queue delays, no exported watermarks, and no hidden subscriptions. Process as many files as you want.'}
            </p>
          </div>
        </div>

        {/* Creator & Mission Spotlight Strip (Unboxed, Flat 2D) */}
        <div className="pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-850">
              <img
                src="/founder-muhammad-sufiyan.webp"
                alt="Mohammad Sufiyan (@mdsufidev)"
                draggable={false}
                className="w-full h-full object-cover select-none"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/logo.png";
                }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                <span>Handcrafted by Mohammad Sufiyan</span>
                <span className="font-mono text-zinc-500 text-[11px]">(@mdsufidev)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-750">
                  Kushinagar, UP
                </span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {language === 'hi'
                  ? 'भारत के छात्रों, नौकरी आवेदकों और साइबर कैफ़े ऑपरेटरों की मदद के लिए बनाया गया सरल और सुरक्षित टूल।'
                  : 'Minimalist browser utilities made to help students and applicants prepare form-ready documents.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a
              href="https://linkedin.com/in/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-150"
              title="LinkedIn"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://instagram.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-150"
              title="Instagram"
              aria-label="Instagram profile"
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => onNavigatePage?.('about')}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-150 cursor-pointer flex items-center gap-1"
            >
              <span>About</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Security, Trust & Certifications (SSL 256-Bit, In-Browser RAM, DPDP) */}
      <TrustCertificationSection />
    </div>
  );
};
