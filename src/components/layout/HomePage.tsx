import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Zap,
  ShieldCheck,
  BadgeCheck,
  Linkedin,
  Instagram,
  ArrowUpRight,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Sparkles,
} from 'lucide-react';
import {
  ALL_TOOLS,
  CATEGORIES_CONFIG,
  ToolCategory,
  searchTools,
} from '../../core/toolsData';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { ToolCategoryFilter } from '../tools/ToolCategoryFilter';
import { RedditIcon } from '../ui/RedditIcon';
import { ToolGrid } from '../tools/ToolGrid';
import { TrustCertificationSection } from './TrustCertificationSection';
import { GovtToolsSeoGuide } from '../seo/GovtToolsSeoGuide';
import { CategoryHubGuide } from '../seo/CategoryHubGuide';

interface HomePageProps {
  selectedCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  onLaunchTool: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  onOpenPrivacyModal?: () => void;
  onOpenCommandPalette?: () => void;
  onNavigatePage?: (page: 'about' | 'disclaimer' | 'terms' | 'contact') => void;
  currentPath?: string;
}



export const HomePage: React.FC<HomePageProps> = ({
  selectedCategory,
  onSelectCategory,
  onLaunchTool,
  onOpenCommandPalette,
  onNavigatePage,
  currentPath,
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

  const isToolsDirectory = currentPath?.replace(/\/$/, '') === '/tools';

  const heroContent = useMemo(() => {
    if (isToolsDirectory) {
      return {
        tag: language === 'hi' ? 'फ़ाइलवाला टूल्स डायरेक्टरी' : 'All Tools Directory · Client-Side Suite',
        title: language === 'hi' ? (
          <>
            फ़ाइलवाला टूल्स डायरेक्टरी — <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">सभी मुफ़्त टूल्स</span>
          </>
        ) : (
          <>
            All Free In-Browser File Tools &amp; <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">Document Utilities</span>
          </>
        ),
        desc: language === 'hi'
          ? 'सभी इमेज ऑप्टिमाइज़र, PDF टूल्स, फॉर्मेट कन्वर्टर और सरकारी फॉर्म फोटो रिसाइज़र का पूरा इंडेक्स। शून्य सर्वर अपलोड।'
          : 'Complete searchable catalog of client-side file tools. Resize images, compress and merge PDFs, convert formats, and format government exam documents without cloud uploads.',
      };
    }

    if (selectedCategory === 'image-tools') {
      return {
        tag: language === 'hi' ? 'इमेज ऑप्टिमाइज़र व क्रिएटिव सुइट' : 'Image Optimizers & Creative Suite',
        title: language === 'hi' ? (
          <>
            मुफ़्त ऑनलाइन इमेज टूल्स — <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">फोटो कंप्रेसर व रिसाइज़र</span>
          </>
        ) : (
          <>
            Free In-Browser Image Tools &amp; <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">Photo Optimizers</span>
          </>
        ),
        desc: language === 'hi'
          ? 'फोटो का साइज़ (KB) कम करें, पिक्सल बदलें, क्रॉप करें, वाटरमार्क लगाएं और बैकग्राउंड हटाएं। 100% ऑन-डिवाइस प्राइवेसी।'
          : 'Compress image size, resize pixel dimensions, crop, remove backgrounds, rounded corners, and watermark photos with zero cloud uploads.',
      };
    }

    if (selectedCategory === 'pdf-tools') {
      return {
        tag: language === 'hi' ? 'PDF दस्तावेज़ टूल्स' : 'PDF Document Utilities',
        title: language === 'hi' ? (
          <>
            प्राइवेट ऑनलाइन PDF टूल्स — <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">मर्ज, कंप्रेस व कन्वर्ट</span>
          </>
        ) : (
          <>
            Private In-Browser PDF Tools &amp; <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">Document Utilities</span>
          </>
        ),
        desc: language === 'hi'
          ? 'PDF फाइलों को जोड़ें, कंप्रेस करें, स्प्लिट करें, रोटेट करें और वर्ड में बदलें — संवेदनशील दस्तावेज़ आपके डिवाइस में ही सुरक्षित रहते हैं।'
          : 'Merge, compress, split, rotate, convert to Word, and extract text from PDFs directly in your browser with zero server uploads.',
      };
    }

    if (selectedCategory === 'convert') {
      return {
        tag: language === 'hi' ? 'इमेज फॉर्मेट कन्वर्टर' : 'Image Format Converters & Codecs',
        title: language === 'hi' ? (
          <>
            फास्ट इमेज फॉर्मेट कन्वर्टर — <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">WebP, PNG, JPG व HEIC</span>
          </>
        ) : (
          <>
            Fast Client-Side Format Converters — <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">HEIC, WebP, PNG &amp; JPG</span>
          </>
        ),
        desc: language === 'hi'
          ? 'iPhone (HEIC) फोटो, WebP, PNG, JPG और AVIF को बिना किसी सीमा के तुरंत कन्वर्ट करें। 100% क्लाइंट-साइड।'
          : 'Convert between HEIC/iPhone, WebP, JPG, PNG, and AVIF formats instantly in your browser without uploading to any server.',
      };
    }

    if (selectedCategory === 'document-tools') {
      return {
        tag: language === 'hi' ? 'सरकारी फॉर्म्स व परीक्षा टूल्स' : 'Govt & Exam Portal Compliance',
        title: language === 'hi' ? (
          <>
            सरकारी फॉर्म फोटो व साइन रिसाइज़र — <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">UPSC, SSC व पैन कार्ड</span>
          </>
        ) : (
          <>
            Indian Government Document &amp; <span className="text-zinc-950 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">Photo Resizer Suite</span>
          </>
        ),
        desc: language === 'hi'
          ? 'UPSC (नाम व तारीख स्टैम्प), SSC, पैन कार्ड और पासपोर्ट सेवा के लिए सही 200 DPI और 20KB-50KB साइज़ में फोटो-साइन तैयार करें।'
          : 'Format exam photos and signatures to official Indian government portal standards (Protean NSDL, UTIITSL, Passport Seva, UPSC, SSC, and EPFO).',
      };
    }

    // Default: Home Page ('/')
    return {
      tag: `${greeting} · ${language === 'hi' ? '100% प्राइवेट व क्लाइंट-साइड सुइट' : '100% Private Client-Side Suite'}`,
      title: language === 'hi' ? (
        <>
          मुफ़्त ऑनलाइन फ़ाइल व इमेज टूल्स
        </>
      ) : (
        <>
          Free Online File &amp; Image Tools
        </>
      ),
      desc: language === 'hi'
        ? 'फ़ोटो और फाइलों को कंप्रेस, कन्वर्ट, रिसाइज़ और मैनेज करें — एक ही जगह पर।'
        : 'Compress, convert, resize and manage your files in one place.',
    };
  }, [isToolsDirectory, selectedCategory, language, greeting]);

  // Detect macOS for keyboard shortcut hints (⌘K vs Ctrl+K)
  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  }, []);

  // Filter and rank tools using canonical search algorithm
  // When user actively types a query, search globally across all categories
  // so a query like "upsc" or "compress" always finds the tool regardless of the currently clicked tab!
  const isSearching = searchQuery.trim().length > 0;
  const filteredTools = useMemo(() => {
    return searchTools(
      ALL_TOOLS,
      searchQuery,
      isSearching ? 'all' : selectedCategory
    );
  }, [selectedCategory, searchQuery, isSearching]);

  const activeCategoryMeta = useMemo(() => {
    return CATEGORIES_CONFIG.find((c) => c.id === selectedCategory) || CATEGORIES_CONFIG[0];
  }, [selectedCategory]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          HERO SECTION (Compact, Practical, Human-Crafted Utility Hero)
      ========================================================================= */}
      <section className="w-full bg-white dark:bg-zinc-950 py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Status Label (Hidden on clean home wireframe, visible on category hubs) */}
          {(selectedCategory !== 'all' || isToolsDirectory) && (
            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{heroContent.tag}</span>
            </div>
          )}

          {/* Headline & Empathetic Subtitle (Exact H1 text preserved) */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
            {heroContent.title}
          </h1>

          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {heroContent.desc}
          </p>

          {/* Clean & Professional 2D Search Bar */}
          <div className="max-w-xl mx-auto mt-5">
            <div
              className={`relative flex items-center h-11 rounded-xl px-3.5 border transition-all ${
                isDark
                  ? 'bg-zinc-900/60 border-zinc-800 focus-within:border-zinc-600 focus-within:bg-zinc-900'
                  : 'bg-zinc-50/60 border-zinc-200 focus-within:border-zinc-400 focus-within:bg-white'
              }`}
            >
              <Search className="w-4 h-4 shrink-0 mr-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                placeholder={
                  language === 'hi'
                    ? 'टूल्स खोजें...'
                    : 'Search tools...'
                }
                className="w-full bg-transparent text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-normal"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd
                  onClick={() => onOpenCommandPalette?.()}
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded select-none cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors shrink-0"
                  title={`Quick Command Palette (${isMac ? '⌘K' : 'Ctrl + K'})`}
                >
                  {isMac ? '⌘K' : 'Ctrl K'}
                </kbd>
              )}
            </div>

            {searchQuery && (
              <div className="flex items-center justify-between text-xs mt-2 px-1 text-zinc-500 font-mono">
                <span>
                  {filteredTools.length} tools matching "{searchQuery}"
                  {selectedCategory !== 'all' && ' (across all categories)'}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="underline hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Calm, Integrated Trust Metadata (No floating pill clutter) */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>{language === 'hi' ? '100% ऑन-डिवाइस (नो क्लाउड)' : 'Zero Cloud Uploads'}</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>{language === 'hi' ? 'सिर्फ 2 सेकंड में तैयार' : '2-Second Execution'}</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>{language === 'hi' ? '100% फॉर्म मंज़ूर' : 'Portal Compliant'}</span>
            </span>
          </div>

        </div>
      </section>

      {/* =========================================================
          CATEGORY NAVIGATION (Clean Segmented Tab Strip)
      ========================================================= */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 mb-6">
        <ToolCategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
      </section>

      {/* =========================================================
          TOOL CARDS CATALOG
      ========================================================= */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        {/* Case 1: Search Query active */}
        {searchQuery ? (
          <div>
            {filteredTools.length === 0 ? (
              <div
                className={`text-center py-16 px-4 rounded-md max-w-md mx-auto border ${
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
                  type="button"
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
          /* Case 2: Specific Category Filter Selected (No card-in-card) */
          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
                  {activeCategoryMeta.name}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  {activeCategoryMeta.description}
                </p>
              </div>

              <a
                href="/"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                    return;
                  }
                  e.preventDefault();
                  onSelectCategory('all');
                }}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto transition-colors no-underline"
              >
                <span>{language === 'hi' ? '← सभी टूल्स' : '← All Tools'}</span>
              </a>
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
                className="mt-14 pt-6"
              />
            )}

            {/* Category Hub Educational Guides & FAQs */}
            {selectedCategory === 'image-tools' && (
              <CategoryHubGuide
                categoryId="image-tools"
                onLaunchTool={onLaunchTool}
                className="mt-14 pt-6"
              />
            )}

            {selectedCategory === 'pdf-tools' && (
              <CategoryHubGuide
                categoryId="pdf-tools"
                onLaunchTool={onLaunchTool}
                className="mt-14 pt-6"
              />
            )}

            {selectedCategory === 'convert' && (
              <CategoryHubGuide
                categoryId="convert"
                onLaunchTool={onLaunchTool}
                className="mt-14 pt-6"
              />
            )}
          </div>
        ) : (
          /* Case 3: All Tools View - Unified Clean Tool Grid */
          <div>
            <ToolGrid
              tools={filteredTools}
              onLaunch={onLaunchTool}
              tToolName={tToolName}
              tToolDesc={tToolDesc}
            />
          </div>
        )}
      </section>

      {/* =========================================================
          WHY CHOOSE FILEWALATOOL (Unboxed Architecture, Zero Lines, 2D Flat, Crisp Text)
      ========================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 select-none">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5 mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <span>{language === 'hi' ? 'मुख्य विशेषताएं' : 'Core Advantages'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            {language === 'hi'
              ? 'FileWalaTool क्यों चुनें?'
              : 'Why Choose FileWalaTool?'}
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
            {language === 'hi'
              ? 'फोन या लैपटॉप से सीधे अपने दस्तावेज़ सुरक्षित और तुरंत तैयार करें।'
              : 'Prepare form-ready documents safely in seconds directly from your browser.'}
          </p>
        </div>

        {/* 3 Open Architectural Columns (Unboxed: No Boxes, No Lines) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 text-left mb-14">
          {/* Feature 1: 100% Private & Safe */}
          <div className="group flex flex-col items-start space-y-3 select-none">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              {language === 'hi' ? 'नो क्लाउड' : 'Zero Uploads'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {language === 'hi' ? '100% प्राइवेट व सुरक्षित' : '100% Private & Safe'}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'फाइलें कभी सर्वर पर नहीं जातीं। सारा काम आपके डिवाइस के ब्राउज़र में ही होता है।'
                : 'Zero cloud uploads. All processing executes securely in your local browser memory.'}
            </p>
          </div>

          {/* Feature 2: Govt Forms Calibrated */}
          <div className="group flex flex-col items-start space-y-3 select-none">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <BadgeCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              {language === 'hi' ? 'फॉर्म मंज़ूर' : 'Portal Compliant'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {language === 'hi' ? 'सरकारी फॉर्म्स मानक' : 'Govt Portal Ready'}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'UPSC, SSC, PAN व Passport Seva के लिए तय साइज़ (KB) और DPI पहले से सेट हैं।'
                : 'Built-in official pixel dimensions, DPI, and KB limits for UPSC, SSC, PAN, and Passport Seva.'}
            </p>
          </div>

          {/* Feature 3: Instant & Free Forever */}
          <div className="group flex flex-col items-start space-y-3 select-none">
            <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <Zap className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              {language === 'hi' ? 'हमेशा मुफ़्त' : 'Free Forever'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {language === 'hi' ? 'सुपरफास्ट व मुफ़्त' : 'Instant & Free'}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'बिना इंतज़ार, वॉटरमार्क या फीस के असीमित फाइलें तेज़ी से प्रोसेस करें।'
                : 'Zero wait queues, no watermarks, and no fees. Unlimited fast processing on any device.'}
            </p>
          </div>
        </div>

        {/* Creator & Mission Spotlight Strip (Unboxed: No Box, No Line, Clean Minimalist) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-850">
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
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                <span>Handcrafted by Mohammad Sufiyan</span>
                <span className="font-mono text-zinc-500 text-xs">(@mdsufidev)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Kushinagar, UP
                </span>
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {language === 'hi'
                  ? 'छात्रों और नौकरी आवेदकों के लिए बनाया गया सुरक्षित, तेज़ और मुफ़्त टूल।'
                  : 'Minimalist, private browser utilities for Indian students and applicants.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a
              href="https://www.reddit.com/r/filewalatool/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-400 transition-colors"
              title="Reddit Community (r/filewalatool)"
              aria-label="Reddit Community (r/filewalatool)"
            >
              <RedditIcon className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com/in/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
              title="LinkedIn"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
              title="Instagram"
              aria-label="Instagram profile"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="/about"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                onNavigatePage?.('about');
              }}
              className="text-xs font-medium px-3.5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5 no-underline"
            >
              <span>About</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Security, Trust & Certifications (SSL 256-Bit, In-Browser RAM, DPDP) */}
      <TrustCertificationSection />
    </div>
  );
};
