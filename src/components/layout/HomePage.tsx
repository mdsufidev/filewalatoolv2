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
      <section className="relative w-full bg-transparent py-8 sm:py-10 overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
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
          WHY CHOOSE FILEWALATOOL (Streamlined, Crisp 1-Line Text, Authentic Gradient Tiles)
      ========================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 select-none">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
            <span>{language === 'hi' ? 'मुख्य विशेषताएं' : 'Core Advantages'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            {language === 'hi'
              ? 'FileWalaTool क्यों चुनें?'
              : 'Why Choose FileWalaTool?'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto font-normal">
            {language === 'hi'
              ? 'ब्राउज़र से सीधे अपने दस्तावेज़ सुरक्षित और तुरंत तैयार करें।'
              : 'Prepare form-ready documents safely in seconds directly from your browser.'}
          </p>
        </div>

        {/* 3 Architectural Columns - Centered & 2D Flat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 text-center mb-10 sm:mb-14">
          {/* Feature 1: 100% Private & Safe */}
          <div className="group flex flex-col items-center text-center space-y-2 select-none">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              {language === 'hi' ? 'नो क्लाउड' : 'Zero Uploads'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {language === 'hi' ? '100% प्राइवेट व सुरक्षित' : '100% Private & Safe'}
            </h3>
            {/* Hidden semantic text for SEO without cluttering visual UI */}
            <span className="sr-only">
              {language === 'hi'
                ? 'लोकल ब्राउज़र RAM में प्रोसेसिंग। फाइल्स कभी सर्वर पर नहीं जातीं।'
                : 'Processed strictly in local browser memory. Files never leave your device.'}
            </span>
          </div>

          {/* Feature 2: Govt Forms Calibrated */}
          <div className="group flex flex-col items-center text-center space-y-2 select-none">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <BadgeCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              {language === 'hi' ? 'पोर्टल मानक' : 'Portal Compliant'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {language === 'hi' ? 'सरकारी फॉर्म्स मानक' : 'Govt Portal Ready'}
            </h3>
            {/* Hidden semantic text for SEO without cluttering visual UI */}
            <span className="sr-only">
              {language === 'hi'
                ? 'UPSC, SSC, PAN व Passport Seva के सटीक KB, DPI व पिक्सेल मानक।'
                : 'Built-in official dimensions, DPI & KB limits for UPSC, SSC, PAN & Passport.'}
            </span>
          </div>

          {/* Feature 3: Instant & Free Forever */}
          <div className="group flex flex-col items-center text-center space-y-2 select-none">
            <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
              <Zap className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
              {language === 'hi' ? 'हमेशा मुफ़्त' : 'Free Forever'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {language === 'hi' ? 'सुपरफास्ट व मुफ़्त' : 'Instant & Free'}
            </h3>
            {/* Hidden semantic text for SEO without cluttering visual UI */}
            <span className="sr-only">
              {language === 'hi'
                ? 'बिना कतार, बिना वॉटरमार्क, बिना फीस। असीमित तेज़ प्रोसेसिंग।'
                : 'No wait queues, no watermarks, no fees. Unlimited fast processing.'}
            </span>
          </div>
        </div>

        {/* Creator & Mission Spotlight Strip with Authentic Brand Logos */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-zinc-100 dark:ring-zinc-800 bg-zinc-100 dark:bg-zinc-850">
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
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                <span>Handcrafted by Mohammad Sufiyan</span>
                <span className="font-mono text-zinc-500 text-xs">(@mdsufidev)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Kushinagar, UP
                </span>
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                {language === 'hi'
                  ? 'भारतीय छात्रों और नौकरी आवेदकों के लिए समर्पित निःशुल्क टूल।'
                  : 'Minimalist browser utilities for Indian students and applicants.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {/* Reddit: Official Brand Icon */}
            <a
              href="https://www.reddit.com/r/filewalatool/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FF4500] hover:bg-[#e03d00] flex items-center justify-center shadow-sm shadow-[#FF4500]/25 transition-transform hover:scale-105 active:scale-95"
              title="Reddit Community (r/filewalatool)"
              aria-label="Reddit Community (r/filewalatool)"
            >
              <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#FF4500" />
                <path
                  d="M16.67 11.5c-.32 0-.6.13-.81.33-1-.69-2.38-1.14-3.92-1.19l.74-3.48 2.42.51c.02.59.5 1.07 1.1 1.07.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1c-.44 0-.82.26-.99.63l-2.72-.57a.3.3 0 0 0-.35.23l-.86 4.02c-1.57.04-2.98.49-4 1.18-.21-.2-.49-.32-.8-.32-.65 0-1.18.53-1.18 1.18 0 .46.26.85.64 1.05a2.7 2.7 0 0 0-.03.41c0 2.07 2.41 3.75 5.38 3.75s5.38-1.68 5.38-3.75c0-.14-.01-.27-.04-.4.4-.2.67-.6.67-1.06 0-.65-.53-1.18-1.18-1.18zm-6.92 1.42c.38 0 .7.31.7.7s-.32.7-.7.7-.7-.31-.7-.7.31-.7.7-.7zm4.5 2.82c-.65.65-1.9.7-2.25.7-.35 0-1.6-.05-2.25-.7a.26.26 0 0 1 .37-.37c.45.45 1.38.53 1.88.53.5 0 1.43-.08 1.88-.53a.26.26 0 0 1 .37.37zm-.25-2.12c-.38 0-.7-.31-.7-.7s.31-.7.7-.7.7.31.7.7-.32.7-.7.7z"
                  fill="#FFFFFF"
                />
              </svg>
            </a>

            {/* LinkedIn: Official Brand Icon */}
            <a
              href="https://linkedin.com/in/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] flex items-center justify-center shadow-sm shadow-[#0A66C2]/25 transition-transform hover:scale-105 active:scale-95"
              title="LinkedIn (@mdsufidev)"
              aria-label="LinkedIn profile"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.67 1.67 0 1 0 0 3.34 1.67 1.67 0 0 0 0-3.34Z" />
              </svg>
            </a>

            {/* Instagram: Official Brand Icon with authentic sunset gradient */}
            <a
              href="https://instagram.com/mdsufidev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-95 flex items-center justify-center shadow-sm shadow-[#ee2a7b]/25 transition-transform hover:scale-105 active:scale-95"
              title="Instagram (@mdsufidev)"
              aria-label="Instagram profile"
            >
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-none stroke-white stroke-[2]" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            {/* About Navigation Pill */}
            <a
              href="/about"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                onNavigatePage?.('about');
              }}
              className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-sm no-underline cursor-pointer"
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
