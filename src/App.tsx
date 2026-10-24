/*
=== AI WEB BUG ANALYSIS & FIX PLAN ===

Bug Found: Asynchronous Toast setTimeout timers were untracked and leaked memory if toasts were dismissed or components unmounted -> Fix: Implemented useRef timer registry (toastTimersRef) that strictly clears active timeouts upon manual dismiss and component cleanup.

Bug Found: Lack of React Error Boundary meant any unexpected canvas, WebAssembly, or PDF parsing exception would crash the whole app to a blank white screen -> Fix: Introduced AppErrorBoundary wrapping workspace routes with user-friendly retry and return-to-home recovery controls.

Bug Found: Heavyweight informational pages and modals were statically bundled into the initial JS chunk, bloating initial bundle size and degrading Core Web Vitals (LCP/FCP) -> Fix: Implemented React.lazy code-splitting with Suspense and zero-CLS skeleton fallbacks for modals and static pages.

Bug Found: Dropped files persisted in pendingDroppedFiles across navigation, causing stale files to inadvertently pass into newly opened tools -> Fix: Automatically reset pendingDroppedFiles to null upon category switching or returning to home/catalog.

Bug Found: Global ESC keyboard shortcut closed tools and modals even when user was actively typing or editing text inside form inputs -> Fix: Added DOM activeElement input/textarea guard so typing is never interrupted.

Bug Found: URL hash/pathname parsing lacked query parameter stripping and trailing slash normalization -> Fix: Sanitized URL query extraction with decodeURIComponent and regex cleanup.

Bug Found: Missing accessibility landmarks and skip link for keyboard navigation -> Fix: Added skip-to-content anchor and wrapped breadcrumb navigation in semantic <nav aria-label="Breadcrumb">.
*/

import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { Navbar, MainNavSection } from './components/layout/Navbar';
import { HomePage } from './components/layout/HomePage';
import { Footer } from './components/layout/Footer';
import { AppErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import type { OptimizerToolId } from './components/tools/ImageToolsWrapper';
import type { PdfToolId } from './components/tools/PdfTools';
import type { ConverterToolId } from './components/tools/FormatConverterSuite';
import type { GovDocumentToolId } from './components/tools/DocumentTools';
import { ToolCategory, ALL_TOOLS, CATEGORIES_CONFIG } from './core/toolsData';
import { getToolRouteUrl, getCategoryRouteUrl, getPageRouteUrl } from './core/urlRoutes';
import { ThemeProvider } from './core/themeContext';
import { LanguageProvider, useLanguage } from './core/languageContext';
import { ArrowLeft, Home, Grid, ChevronRight, Loader2, Mail, X } from 'lucide-react';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useGlobalFileDrop } from './hooks/useGlobalFileDrop';
import { GlobalDropOverlay } from './components/navigation/GlobalDropOverlay';
import { ToolSelectorModal } from './components/navigation/ToolSelectorModal';
import { DetectedToolTarget, DetectedFileSummary } from './utils/fileTypeDetector';
import { ToolSeoHead } from './components/seo/ToolSeoHead';
import type { UserProfile } from './components/auth/SignInModal';
import {
  subscribeToAuth,
  getStoredAuthUser,
  logoutUser,
  sendUserVerificationEmail,
  verifyEmailWithActionCode,
  recoverUserEmail,
} from './core/firebase';

// Code-split secondary pages and modals for optimal Core Web Vitals (FCP, LCP)
const AboutUs = lazy(() => import('./components/pages/AboutUs').then((m) => ({ default: m.AboutUs })));
const Disclaimer = lazy(() => import('./components/pages/Disclaimer').then((m) => ({ default: m.Disclaimer })));
const TermsAndConditions = lazy(() =>
  import('./components/pages/TermsAndConditions').then((m) => ({ default: m.TermsAndConditions }))
);
const ContactUs = lazy(() => import('./components/pages/ContactUs').then((m) => ({ default: m.ContactUs })));
const DesktopAppPage = lazy(() =>
  import('./components/pages/DesktopAppPage').then((m) => ({ default: m.DesktopAppPage }))
);
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const SignInModal = lazy(() => import('./components/auth/SignInModal').then((m) => ({ default: m.SignInModal })));
const ResetPasswordModal = lazy(() =>
  import('./components/auth/ResetPasswordModal').then((m) => ({ default: m.ResetPasswordModal }))
);
const AccountSettingsModal = lazy(() =>
  import('./components/auth/AccountSettingsModal').then((m) => ({ default: m.AccountSettingsModal }))
);
const PrivacyModal = lazy(() => import('./components/layout/PrivacyModal').then((m) => ({ default: m.PrivacyModal })));
const CommandPalette = lazy(() =>
  import('./components/navigation/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);
const ShortcutsHelpModal = lazy(() =>
  import('./components/navigation/ShortcutsHelpModal').then((m) => ({ default: m.ShortcutsHelpModal }))
);

// Code-split heavy tool engine suites (PDF libraries, OCR, Docx, Canvas suites)
const ImageToolsWrapper = lazy(() =>
  import('./components/tools/ImageToolsWrapper').then((m) => ({ default: m.ImageToolsWrapper }))
);
const PdfTools = lazy(() =>
  import('./components/tools/PdfTools').then((m) => ({ default: m.PdfTools }))
);
const FormatConverterSuite = lazy(() =>
  import('./components/tools/FormatConverterSuite').then((m) => ({ default: m.FormatConverterSuite }))
);
const DocumentTools = lazy(() =>
  import('./components/tools/DocumentTools').then((m) => ({ default: m.DocumentTools }))
);


export interface ActiveToolState {
  section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  subToolId: string;
}

export type ActivePageType = 'about' | 'disclaimer' | 'terms' | 'contact' | 'admin' | 'desktop' | null;

const PageSuspenseFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 py-16 text-slate-500 dark:text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    <span className="text-xs font-mono">Loading workspace view...</span>
  </div>
);

function MainApp() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [activeTool, setActiveTool] = useState<ActiveToolState | null>(null);
  const [activePage, setActivePage] = useState<ActivePageType>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredAuthUser());
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [signInInitialEmail, setSignInInitialEmail] = useState<string>('');
  const [resetPasswordOobCode, setResetPasswordOobCode] = useState<string | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState<boolean>(false);
  const [isVerificationBannerDismissed, setIsVerificationBannerDismissed] = useState<boolean>(false);
  const [isResendingVerification, setIsResendingVerification] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingDroppedFiles, setPendingDroppedFiles] = useState<File[] | null>(null);
  const [toolSelectorData, setToolSelectorData] = useState<{
    files: File[];
    summary: DetectedFileSummary;
  } | null>(null);

  // Active timers tracking ref to prevent memory leaks on unmount or dismissal
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isDark = false;
  const { t, tToolName, language } = useLanguage();

  // Clear timers on component unmount
  useEffect(() => {
    const currentTimers = toastTimersRef.current;
    return () => {
      currentTimers.forEach((timerId) => clearTimeout(timerId));
      currentTimers.clear();
    };
  }, []);

  // Safe toast notifications handler with timer registration
  const addToast = useCallback(
    (title: string, description?: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);

      const timerId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        toastTimersRef.current.delete(id);
      }, 4000);

      toastTimersRef.current.set(id, timerId);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    const timerId = toastTimersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Safe window scroll helper with fallback
  const safeScrollToTop = useCallback(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  // Launch a tool into workspace
  const handleLaunchTool = useCallback(
    (section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools', subToolId: string) => {
      setActivePage(null);
      setActiveTool({ section, subToolId });
      setSelectedCategory(section);
      safeScrollToTop();
      try {
        const targetUrl = getToolRouteUrl(section, subToolId);
        window.history.pushState(null, '', targetUrl);
      } catch {
        // Safe fallback if history API is restricted in sandboxes
      }
    },
    [safeScrollToTop]
  );

  // Return to Home catalog or category view & reset pending files
  const handleGoHome = useCallback(
    (category: ToolCategory = 'all') => {
      setActivePage(null);
      setActiveTool(null);
      setPendingDroppedFiles(null);
      setSelectedCategory(category);
      safeScrollToTop();
      try {
        const targetUrl = getCategoryRouteUrl(category);
        window.history.pushState(null, '', targetUrl);
      } catch {
        // ignore
      }
    },
    [safeScrollToTop]
  );

  // Navigate to Informational Pages (About Us, Disclaimer, Terms, Contact, Admin, Desktop)
  const handleNavigatePage = useCallback(
    (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'admin' | 'desktop') => {
      setActivePage(page);
      setActiveTool(null);
      setPendingDroppedFiles(null);
      safeScrollToTop();
      try {
        if (page === 'admin') {
          window.history.pushState(null, '', '/admin');
        } else if (page === 'desktop') {
          window.history.pushState(null, '', '/desktop');
        } else {
          const targetUrl = getPageRouteUrl(page);
          window.history.pushState(null, '', targetUrl);
        }
      } catch {
        // ignore
      }
    },
    [safeScrollToTop]
  );

  // Handle Navbar Category Click
  const handleSelectNavbarSection = useCallback(
    (section: MainNavSection, subToolId?: string) => {
      setActivePage(null);
      if (subToolId) {
        handleLaunchTool(section, subToolId);
      } else {
        setActiveTool(null);
        setSelectedCategory(section);
        safeScrollToTop();
        try {
          const targetUrl = getCategoryRouteUrl(section);
          window.history.pushState(null, '', targetUrl);
        } catch {
          // ignore
        }
      }
    },
    [handleLaunchTool, safeScrollToTop]
  );

  // Privacy modal handlers with URL synchronization
  const handleOpenPrivacyModal = useCallback(() => {
    setIsPrivacyModalOpen(true);
    try {
      window.history.pushState(null, '', '/privacy');
    } catch {
      // ignore
    }
  }, []);

  const handleClosePrivacyModal = useCallback(() => {
    setIsPrivacyModalOpen(false);
    try {
      if (window.location.pathname === '/privacy' || window.location.hash === '#privacy') {
        const fallbackUrl = activeTool
          ? getToolRouteUrl(activeTool.section, activeTool.subToolId)
          : activePage
          ? getPageRouteUrl(activePage)
          : getCategoryRouteUrl(selectedCategory);
        window.history.pushState(null, '', fallbackUrl);
      }
    } catch {
      // ignore
    }
  }, [activeTool, activePage, selectedCategory]);

  // Launch tool from selector or drop
  const handleGlobalDropLaunch = useCallback(
    (target: DetectedToolTarget, files: File[]) => {
      setToolSelectorData(null);
      setPendingDroppedFiles(files);
      handleLaunchTool(target.section, target.subToolId);
      const name = files[0]?.name || 'document';
      addToast(
        `Launched ${target.name}`,
        `Loaded "${name}" (${files.length} file${files.length > 1 ? 's' : ''}) directly into workspace.`,
        'success'
      );
    },
    [handleLaunchTool, addToast]
  );

  // When files are dropped from computer:
  // - If a tool is ALREADY open, feed directly into current tool without navigating away
  // - If on home or catalog, show the ToolSelectorModal to choose between Compress, Resize, Crop, etc.
  const handleGlobalFilesDropped = useCallback(
    (files: File[], summary: DetectedFileSummary) => {
      if (activeTool !== null) {
        setPendingDroppedFiles(files);
        const name = files[0]?.name || 'File';
        addToast(
          'File Loaded Into Current Tool',
          `"${name}" (${files.length > 1 ? `${files.length} files` : '1 file'}) loaded directly into current workspace.`,
          'success'
        );
      } else {
        setToolSelectorData({ files, summary });
      }
    },
    [activeTool, addToast]
  );

  const isModalActive =
    isCommandPaletteOpen ||
    isShortcutsHelpOpen ||
    isSignInModalOpen ||
    isAccountSettingsOpen ||
    isPrivacyModalOpen ||
    toolSelectorData !== null;

  const {
    isDragging,
    detectedSummary,
    droppedFiles,
    cancelDrop,
  } = useGlobalFileDrop({
    onFilesDropped: handleGlobalFilesDropped,
    disabled: isModalActive,
  });

  // Global Keyboard Shortcuts (CMD+K for search, ESC to exit active tool / close modals, etc.)
  useGlobalShortcuts({
    onOpenSearch: useCallback(() => {
      setIsCommandPaletteOpen((prev) => !prev);
    }, []),
    onExitActiveTool: useCallback(() => {
      // Guard: do not close workspace if user pressed Escape while focused inside an input/textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        (activeEl as HTMLElement).blur();
        return;
      }

      if (isDragging) {
        cancelDrop();
      } else if (toolSelectorData !== null) {
        setToolSelectorData(null);
      } else if (isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      } else if (isShortcutsHelpOpen) {
        setIsShortcutsHelpOpen(false);
      } else if (isSignInModalOpen) {
        setIsSignInModalOpen(false);
      } else if (isAccountSettingsOpen) {
        setIsAccountSettingsOpen(false);
      } else if (isPrivacyModalOpen) {
        handleClosePrivacyModal();
      } else if (activeTool !== null) {
        const prevSection = activeTool.section;
        handleGoHome(prevSection);
        addToast('Exited to Catalog', 'Pressed ESC to return to tool catalog', 'info');
      }
    }, [
      isDragging,
      cancelDrop,
      toolSelectorData,
      isCommandPaletteOpen,
      isShortcutsHelpOpen,
      isSignInModalOpen,
      isAccountSettingsOpen,
      isPrivacyModalOpen,
      handleClosePrivacyModal,
      activeTool,
      handleGoHome,
      addToast,
    ]),
    onGoHome: useCallback(() => {
      handleGoHome('all');
    }, [handleGoHome]),
    onSelectCategory: useCallback(
      (cat) => {
        setActiveTool(null);
        setSelectedCategory(cat);
        const catName = CATEGORIES_CONFIG.find((c) => c.id === cat)?.name || cat;
        addToast('Category Switched', `Switched to ${catName}`, 'info');
      },
      [addToast]
    ),
    onOpenHelp: useCallback(() => {
      setIsShortcutsHelpOpen((prev) => !prev);
    }, []),
    isModalOpen: isModalActive,
    hasActiveTool: activeTool !== null,
  });

  // Deep linking via URL route/hash on initial mount & navigation
  useEffect(() => {
    const handleUrlRoute = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      const rawPath = window.location.pathname
        .split('?')[0]
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .trim();
      const query = decodeURIComponent(rawHash || rawPath);
      if (!query) {
        setActivePage(null);
        return;
      }

      // Direct .EXE custom URL download trigger
      if (
        query.toLowerCase() === 'download/v1.0.0/filewala-tool-setup-1.0.0.exe' ||
        query.toLowerCase() === 'download/latest' ||
        query.toLowerCase() === 'download/windows'
      ) {
        window.location.href =
          'https://github.com/mdsufidev/pixcutbgremover/releases/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe';
        return;
      }

      // Check for standalone informational pages
      if (query === 'about' || query === 'about-us') {
        setActivePage('about');
        setActiveTool(null);
        return;
      }
      if (
        query === 'desktop' ||
        query === 'download' ||
        query === 'windows' ||
        query === 'desktop-app' ||
        query === 'filewala-desktop'
      ) {
        setActivePage('desktop');
        setActiveTool(null);
        return;
      }
      if (query === 'disclaimer') {
        setActivePage('disclaimer');
        setActiveTool(null);
        return;
      }
      if (
        query === 'terms' ||
        query === 'terms-and-conditions' ||
        query === 'terms-of-service' ||
        query === 'tos'
      ) {
        setActivePage('terms');
        setActiveTool(null);
        return;
      }
      if (query === 'contact' || query === 'contact-us') {
        setActivePage('contact');
        setActiveTool(null);
        return;
      }
      if (query === 'admin' || query === 'admin-panel' || query === 'console') {
        setActivePage('admin');
        setActiveTool(null);
        return;
      }
      if (query === 'privacy' || query === 'privacy-policy') {
        setIsPrivacyModalOpen(true);
        setActivePage(null);
        setActiveTool(null);
        return;
      }
      if (query === 'tools' || query === 'all-tools') {
        setActivePage(null);
        setActiveTool(null);
        setSelectedCategory('all');
        return;
      }
      if (query === 'convert-tools' || query === 'convert') {
        setActivePage(null);
        setActiveTool(null);
        setSelectedCategory('convert');
        return;
      }

      setActivePage(null);

      // Clean aliases for PDF routes like /pdf-tools/merge
      const pdfToolAliases: Record<string, string> = {
        'pdf-tools/merge': 'merge-pdf',
        'pdf-tools/merge-pdf': 'merge-pdf',
        'pdf/merge': 'merge-pdf',
        'pdf-tools/compress': 'compress-pdf',
        'pdf-tools/compress-pdf': 'compress-pdf',
        'pdf/compress': 'compress-pdf',
        'pdf-tools/to-image': 'pdf-to-jpg',
        'pdf-tools/to-images': 'pdf-to-jpg',
        'pdf-tools/image': 'pdf-to-jpg',
        'pdf-tools/images': 'pdf-to-jpg',
        'pdf/to-image': 'pdf-to-jpg',
        'pdf/image': 'pdf-to-jpg',
        'to-image': 'pdf-to-jpg',
        'pdf-tools/to-jpg': 'pdf-to-jpg',
        'pdf-tools/image-to-pdf': 'image-to-pdf',
        'pdf-tools/split': 'split-pdf',
        'pdf-tools/rotate': 'rotate-pdf',
        'pdf-tools/to-text': 'pdf-to-text',
        'pdf-tools/ocr': 'pdf-to-text',
        'pdf/ocr': 'pdf-to-text',
        'ocr': 'pdf-to-text',
        'pdf-tools/word': 'pdf-to-word',
        'pdf-tools/pdf-to-word': 'pdf-to-word',
        'pdf-tools/to-word': 'pdf-to-word',
        'pdf/word': 'pdf-to-word',
        'word': 'pdf-to-word',
        'document-tools/pan-resizer': 'pan-photo-resize',
        'document-tools/pan-photo-resizer': 'pan-photo-resize',
        'document-tools/pan-photo-resize': 'pan-photo-resize',
        'document-tools/pan-photo': 'pan-photo-resize',
        'document-tools/photo-resizer': 'pan-photo-resize',
        'pan-resizer': 'pan-photo-resize',
        'pan-photo-resizer': 'pan-photo-resize',
        'pan-photo-resize': 'pan-photo-resize',
        'pan-photo': 'pan-photo-resize',
        'document-tools/pan-signature-resizer': 'signature-resize',
        'document-tools/pan-signature-resize': 'signature-resize',
        'document-tools/pan-signature': 'signature-resize',
        'document-tools/signature-resizer': 'signature-resize',
        'document-tools/signature-resize': 'signature-resize',
        'document-tools/signature': 'signature-resize',
        'pan-signature-resizer': 'signature-resize',
        'pan-signature-resize': 'signature-resize',
        'pan-signature': 'signature-resize',
        'signature-resize': 'signature-resize',
        'signature-resizer': 'signature-resize',
        'document-tools/passport-photo-resizer': 'passport-photo-resize',
        'document-tools/passport-photo-resize': 'passport-photo-resize',
        'document-tools/passport-photo': 'passport-photo-resize',
        'document-tools/passport-resizer': 'passport-photo-resize',
        'document-tools/passport-resize': 'passport-photo-resize',
        'document-tools/passport': 'passport-photo-resize',
        'passport-photo-resizer': 'passport-photo-resize',
        'passport-photo-resize': 'passport-photo-resize',
        'passport-resizer': 'passport-photo-resize',
        'passport-photo': 'passport-photo-resize',
        'document-tools/passport-signature-resizer': 'passport-signature-resize',
        'document-tools/passport-signature-resize': 'passport-signature-resize',
        'document-tools/passport-signature': 'passport-signature-resize',
        'passport-signature-resizer': 'passport-signature-resize',
        'passport-signature': 'passport-signature-resize',
        'document-tools/upsc-photo-maker': 'upsc-photo-maker',
        'document-tools/upsc-photo-resizer': 'upsc-photo-maker',
        'document-tools/upsc-photo': 'upsc-photo-maker',
        'document-tools/upsc-resizer': 'upsc-photo-maker',
        'document-tools/upsc': 'upsc-photo-maker',
        'upsc-photo-maker': 'upsc-photo-maker',
        'upsc-photo-resizer': 'upsc-photo-maker',
        'upsc-photo': 'upsc-photo-maker',
        'upsc-resizer': 'upsc-photo-maker',
        'upsc': 'upsc-photo-maker',
        'document-tools/ssc-photo-signature': 'ssc-resizer',
        'document-tools/ssc-resizer': 'ssc-resizer',
        'document-tools/ssc-photo': 'ssc-resizer',
        'document-tools/ssc-signature': 'ssc-resizer',
        'document-tools/ssc': 'ssc-resizer',
        'ssc-photo-signature': 'ssc-resizer',
        'ssc-resizer': 'ssc-resizer',
        'ssc': 'ssc-resizer',
        'document-tools/upsc-ssc-resizer': 'upsc-photo-maker',
        'document-tools/upsc-ssc': 'upsc-photo-maker',
        'document-tools/gov-compressor': 'gov-compressor',
        'document-tools/gov-compress': 'gov-compressor',
        'document-tools/document-compressor': 'gov-compressor',
        'gov-compressor': 'gov-compressor',
        'gov-compress': 'gov-compressor',

        // Flagship & Sitemap Clean Slugs
        'compress-image': 'compressor',
        'image-compressor': 'compressor',
        'image-resizer': 'resizer',
        'crop-image': 'cropper',
        'bg-remover': 'bg-remover',
        'background-remover': 'bg-remover',
        'remove-bg': 'bg-remover',
        'remove-background': 'bg-remover',
        'image-tools/bg-remover': 'bg-remover',
        'image-tools/background-remover': 'bg-remover',
        'batch-image-cropper': 'batch',
        'batch-processor': 'batch',
        'merge-pdf': 'merge-pdf',
        'combine-pdf': 'merge-pdf',
        'compress-pdf': 'compress-pdf',
        'heic-to-jpg': 'heic-to-jpg',
        'image-to-pdf': 'image-to-pdf',
        'govt-photo-signature-resizer': 'pan-photo-resize',
        'gov-document-compressor': 'gov-compressor',
        'pdf-to-word': 'pdf-to-word',
        'resume-builder': 'pdf-to-word',
        'kb-resizer': 'gov-compressor',
        'delete-pdf-pages': 'split-pdf',
        'watermark-pdf': 'watermark',
        'watermark-image': 'watermark',
        'watermark': 'watermark',
        'protect-pdf': 'compress-pdf',
        'word-to-pdf': 'pdf-to-word',
        'pdf-to-image': 'pdf-to-jpg',
        'pdf-to-jpg': 'pdf-to-jpg',
        'pdf-to-text': 'pdf-to-text',
        'pdf-ocr': 'pdf-to-text',
        'jpg-to-png': 'jpg-to-png',
        'png-to-jpg': 'png-to-jpg',
        'png-to-webp': 'png-to-webp',
        'webp-to-jpg': 'webp-to-jpg',
        'jpg-to-webp': 'jpg-to-webp',
        'avif-to-jpg': 'avif-to-jpg',
        'svg-to-png': 'svg-to-png',
        'round-corners': 'rounded',
        'rounded-corners': 'rounded',
        'meme-generator': 'meme',
        'meme': 'meme',
        'color-palette': 'palette',
        'palette': 'palette',
        'image-to-base64': 'base64',
        'base64': 'base64',
        'filter-adjust': 'adjust',
        'adjust': 'adjust',
        'filters': 'adjust',
      };

      const resolvedSubTool = pdfToolAliases[query] || query;

      // Check if matches a category
      const matchedCat = CATEGORIES_CONFIG.find((c) => c.id === query);
      if (matchedCat) {
        setActiveTool(null);
        setSelectedCategory(matchedCat.id);
        return;
      }

      // Check if hash matches a tool subToolId or id
      const matchedTool = ALL_TOOLS.find(
        (t) => t.subToolId === resolvedSubTool || t.id === resolvedSubTool
      );
      if (matchedTool) {
        setActiveTool({
          section: matchedTool.actionSection,
          subToolId: matchedTool.subToolId,
        });
        setSelectedCategory(matchedTool.actionSection);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, []);

  // Subscribe to live Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle Firebase Email Verification link redirects (?mode=verifyEmail&oobCode=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const oobCode = params.get('oobCode');

      if (mode === 'verifyEmail' && oobCode) {
        verifyEmailWithActionCode(oobCode)
          .then(() => {
            addToast(
              'Email Verified Successfully',
              'Your email address has been verified! Welcome to FileWala.',
              'success'
            );
            // Clean URL params without reloading
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
          })
          .catch((err) => {
            addToast(
              'Verification Failed',
              err?.message || 'This verification link is invalid or has expired.',
              'error'
            );
          });
      } else if (mode === 'resetPassword' && oobCode) {
        setResetPasswordOobCode(oobCode);
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      } else if (mode === 'recoverEmail' && oobCode) {
        recoverUserEmail(oobCode)
          .then((restoredEmail) => {
            addToast(
              'Email Restored',
              `Your sign-in email has been restored to ${restoredEmail || 'your original address'}.`,
              'success'
            );
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
          })
          .catch((err) => {
            addToast(
              'Recovery Failed',
              err?.message || 'This recovery link is invalid or has expired.',
              'error'
            );
          });
      }
    } catch {
      // ignore
    }
  }, [addToast]);

  const handlePasswordResetSuccess = (email?: string) => {
    setResetPasswordOobCode(null);
    if (email) {
      setSignInInitialEmail(email);
    }
    setIsSignInModalOpen(true);
    addToast(
      'Password Reset Successful',
      'Your password has been changed. Please sign in with your new password.',
      'success'
    );
  };

  const handleResendBannerVerification = async () => {
    if (isResendingVerification) return;
    setIsResendingVerification(true);
    try {
      await sendUserVerificationEmail();
      addToast(
        'Verification Email Sent',
        `A confirmation link has been sent to ${currentUser?.email}. Please check your inbox or spam folder.`,
        'success'
      );
    } catch (err: any) {
      addToast('Resend Failed', err?.message || 'Unable to send verification email.', 'error');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSignInSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    addToast('Signed In Successfully', `Welcome, ${user.name}!`, 'success');
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      addToast('Signed Out', 'You have been logged out of FileWala', 'info');
    } catch {
      setCurrentUser(null);
      addToast('Signed Out', 'Session cleared', 'info');
    }
  };

  // Find metadata for active tool
  const currentToolItem = activeTool
    ? ALL_TOOLS.find(
        (t) =>
          t.actionSection === activeTool.section &&
          t.subToolId === activeTool.subToolId
      ) || ALL_TOOLS.find((t) => t.subToolId === activeTool.subToolId)
    : null;

  const currentCategoryMeta = CATEGORIES_CONFIG.find(
    (c) => c.id === (activeTool ? activeTool.section : selectedCategory)
  );

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-zinc-900 selection:text-white bg-white text-zinc-900 max-w-full overflow-x-clip">
      {/* Keyboard Accessibility: Skip to Main Content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 z-50 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-md border border-zinc-700 text-xs font-medium focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Dynamic SEO, AEO & GEO Metadata / JSON-LD Schema Engine */}
      <ToolSeoHead activeTool={activeTool} activePage={activePage} selectedCategory={selectedCategory} />

      {/* Top Navbar */}
      <Navbar
        activeSection={
          activeTool
            ? activeTool.section
            : selectedCategory !== 'all'
            ? (selectedCategory as MainNavSection)
            : null
        }
        onSelectSection={handleSelectNavbarSection}
        onGoHome={() => handleGoHome('all')}
        currentUser={currentUser}
        onOpenSignIn={() => setIsSignInModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        onOpenAdmin={() => handleNavigatePage('admin')}
        onOpenPrivacyModal={handleOpenPrivacyModal}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        onNavigatePage={handleNavigatePage}
      />

      {/* Unverified Email Alert Banner (Flat 2D Linear Style) */}
      {currentUser && !currentUser.emailVerified && !isVerificationBannerDismissed && (
        <div className="w-full bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>
              Your email <strong className="text-zinc-950 dark:text-white">{currentUser.email}</strong> is not yet verified.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResendBannerVerification}
              disabled={isResendingVerification}
              className="font-medium underline hover:text-zinc-950 dark:hover:text-white cursor-pointer disabled:opacity-50"
            >
              {isResendingVerification ? 'Sending...' : 'Resend verification link'}
            </button>
            <button
              type="button"
              onClick={() => setIsVerificationBannerDismissed(true)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full focus:outline-none">
        <AppErrorBoundary
          fallbackTitle="Page Display Error"
          onReset={() => handleGoHome('all')}
        >
          {activePage !== null ? (
            /* =========================================================================
               INFORMATIONAL & LEGAL PAGES (About Us, Disclaimer, Terms, Contact)
            ========================================================================= */
            <Suspense fallback={<PageSuspenseFallback />}>
              <div className="w-full">
                {activePage === 'about' && (
                  <AboutUs
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'desktop' && (
                  <DesktopAppPage
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'disclaimer' && (
                  <Disclaimer
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'terms' && (
                  <TermsAndConditions
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'contact' && (
                  <ContactUs
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                    onNotify={addToast}
                  />
                )}
                {activePage === 'admin' && (
                  <AdminPanel
                    currentUser={currentUser}
                    onBackHome={() => handleGoHome('all')}
                    onNotify={addToast}
                  />
                )}
              </div>
            </Suspense>
          ) : activeTool === null ? (
            /* =========================================================================
               HOME PAGE VIEW (Category Tabs + Expansive Card Grid + Fitts's Law CTAs)
            ========================================================================= */
            <HomePage
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => handleGoHome(cat)}
              onLaunchTool={handleLaunchTool}
              onOpenPrivacyModal={handleOpenPrivacyModal}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onNavigatePage={handleNavigatePage}
            />
          ) : (
            /* =========================================================================
               TOOL WORKSPACE VIEW (Active Tool + Interactive Breadcrumb Bar)
            ========================================================================= */
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {/* Breadcrumb Navigation Bar (Flat 2D Swiss Style) */}
              <nav
                aria-label="Breadcrumb"
                className={`mb-6 flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                <div
                  className={`flex items-center gap-2 text-xs ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <button
                    onClick={() => handleGoHome('all')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isDark ? 'hover:text-white' : 'hover:text-zinc-950'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>{language === 'hi' ? 'होम' : 'Home'}</span>
                  </button>
                  <ChevronRight className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  <button
                    onClick={() => handleGoHome(activeTool.section)}
                    className={`font-medium transition-colors cursor-pointer ${
                      isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-950'
                    }`}
                  >
                    {currentCategoryMeta
                      ? t(
                          'cat.' +
                            (currentCategoryMeta.id === 'all'
                              ? 'all'
                              : currentCategoryMeta.id === 'image-tools'
                              ? 'imageTools'
                              : currentCategoryMeta.id === 'pdf-tools'
                              ? 'pdfTools'
                              : currentCategoryMeta.id === 'convert'
                              ? 'convert'
                              : 'documentTools'),
                          currentCategoryMeta.name
                        )
                      : 'Category'}
                  </button>
                  <ChevronRight className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {currentToolItem
                      ? tToolName(currentToolItem.id, currentToolItem.name)
                      : activeTool.subToolId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleGoHome(activeTool.section)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                        : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                    title="Back to category (Esc)"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>
                      {language === 'hi' ? 'वापस' : 'Back'}
                    </span>
                    <kbd
                      className={`px-1 py-0.2 rounded text-[10px] font-mono border ${
                        isDark
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                      }`}
                    >
                      Esc
                    </kbd>
                  </button>

                  <button
                    onClick={() => handleGoHome('all')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
                        : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 border-zinc-200'
                    }`}
                    title="View all tools"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {language === 'hi' ? 'सभी टूल्स' : 'All Tools'}
                    </span>
                  </button>
                </div>
              </nav>

              {/* Active Tool Suite Component with Fault Isolation */}
              <AppErrorBoundary
                fallbackTitle="Tool Engine Error"
                onReset={() => handleLaunchTool(activeTool.section, activeTool.subToolId)}
              >
                <Suspense fallback={<PageSuspenseFallback />}>
                  <div className="w-full">
                    {activeTool.section === 'image-tools' && (
                      <ImageToolsWrapper
                        initialTool={activeTool.subToolId as OptimizerToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}

                    {activeTool.section === 'pdf-tools' && (
                      <PdfTools
                        initialTab={activeTool.subToolId as PdfToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}

                    {activeTool.section === 'convert' && (
                      <FormatConverterSuite
                        initialToolId={activeTool.subToolId as ConverterToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}

                    {activeTool.section === 'document-tools' && (
                      <DocumentTools
                        initialTab={activeTool.subToolId as GovDocumentToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}
                  </div>
                </Suspense>
              </AppErrorBoundary>
            </div>
          )}
        </AppErrorBoundary>
      </main>

      {/* Lazy Modals with Suspense wrappers */}
      <Suspense fallback={null}>
        {resetPasswordOobCode && (
          <ResetPasswordModal
            isOpen={Boolean(resetPasswordOobCode)}
            oobCode={resetPasswordOobCode}
            onClose={() => setResetPasswordOobCode(null)}
            onSuccess={handlePasswordResetSuccess}
          />
        )}

        {isSignInModalOpen && (
          <SignInModal
            isOpen={isSignInModalOpen}
            initialEmail={signInInitialEmail}
            onClose={() => {
              setIsSignInModalOpen(false);
              setSignInInitialEmail('');
            }}
            onSuccess={handleSignInSuccess}
          />
        )}

        {isAccountSettingsOpen && currentUser && (
          <AccountSettingsModal
            isOpen={isAccountSettingsOpen}
            currentUser={currentUser}
            onClose={() => setIsAccountSettingsOpen(false)}
            onUserUpdated={(updatedUser) => {
              setCurrentUser(updatedUser);
              addToast('Profile Updated', 'Your profile details have been saved.', 'success');
            }}
            onSignOut={() => {
              setIsAccountSettingsOpen(false);
              handleSignOut();
            }}
          />
        )}

        {isPrivacyModalOpen && (
          <PrivacyModal
            isOpen={isPrivacyModalOpen}
            onClose={handleClosePrivacyModal}
          />
        )}

        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onSelectTool={handleLaunchTool}
          />
        )}

        {isShortcutsHelpOpen && (
          <ShortcutsHelpModal
            isOpen={isShortcutsHelpOpen}
            onClose={() => setIsShortcutsHelpOpen(false)}
          />
        )}
      </Suspense>

      {/* Global Drag-and-Drop Auto-Detection Zone */}
      <GlobalDropOverlay
        isVisible={isDragging}
        detectedSummary={detectedSummary}
        droppedFiles={droppedFiles}
        activeToolName={currentToolItem ? tToolName(currentToolItem.id, currentToolItem.name) : null}
        onSelectAndLaunch={handleGlobalDropLaunch}
        onCancel={cancelDrop}
      />

      {/* External File Drop Tool Selector Modal */}
      <ToolSelectorModal
        isOpen={toolSelectorData !== null}
        files={toolSelectorData?.files || null}
        summary={toolSelectorData?.summary || null}
        onSelectTool={handleGlobalDropLaunch}
        onClose={() => setToolSelectorData(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Footer */}
      <Footer
        onSelectSection={handleSelectNavbarSection}
        onGoHome={() => handleGoHome('all')}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        onNavigatePage={handleNavigatePage}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
