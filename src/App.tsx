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

import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
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
import {
  getToolRouteUrl,
  getCategoryRouteUrl,
  getPageRouteUrl,
  resolveRouteFromUrl,
  type ActiveToolState,
  type ActivePageType,
} from './core/urlRoutes';
import { ThemeProvider } from './core/themeContext';
import { LanguageProvider, useLanguage } from './core/languageContext';
import { Loader2, Mail, X } from 'lucide-react';
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
const PrivacyPolicy = lazy(() =>
  import('./components/pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy }))
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

// Fault-tolerant lazy loader with retry for production CDN / network resilience
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      console.warn('Chunk load error, retrying module import...', err);
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (retryErr) {
        console.error('Fatal chunk load failure after retry:', retryErr);
        // If a new deployment invalidated chunk hashes on CDN/server, reload once from network
        if (typeof window !== 'undefined' && !sessionStorage.getItem('chunk_reload_retry')) {
          sessionStorage.setItem('chunk_reload_retry', 'true');
          window.location.reload();
        }
        throw retryErr;
      }
    }
  });

// Code-split heavy tool engine suites (PDF libraries, OCR, Docx, Canvas suites)
const ImageToolsWrapper = lazyWithRetry(() =>
  import('./components/tools/ImageToolsWrapper').then((m) => ({ default: m.ImageToolsWrapper }))
);
const PdfTools = lazyWithRetry(() =>
  import('./components/tools/PdfTools').then((m) => ({ default: m.PdfTools }))
);
const FormatConverterSuite = lazyWithRetry(() =>
  import('./components/tools/FormatConverterSuite').then((m) => ({ default: m.FormatConverterSuite }))
);
const DocumentTools = lazyWithRetry(() =>
  import('./components/tools/DocumentTools').then((m) => ({ default: m.DocumentTools }))
);


export interface AppComponentsOverride {
  ImageToolsWrapper?: React.ComponentType<any>;
  PdfTools?: React.ComponentType<any>;
  FormatConverterSuite?: React.ComponentType<any>;
  DocumentTools?: React.ComponentType<any>;
  AboutUs?: React.ComponentType<any>;
  Disclaimer?: React.ComponentType<any>;
  TermsAndConditions?: React.ComponentType<any>;
  ContactUs?: React.ComponentType<any>;
  PrivacyPolicy?: React.ComponentType<any>;
  PrivacyModal?: React.ComponentType<any>;
}

export interface AppProps {
  initialPath?: string;
  toolComponents?: AppComponentsOverride;
}

const PageSuspenseFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 py-16 text-slate-500 dark:text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    <span className="text-xs font-mono">Loading workspace view...</span>
  </div>
);

function MainApp({ initialPath, toolComponents }: { initialPath?: string; toolComponents?: AppComponentsOverride } = {}) {
  const ResolvedImageToolsWrapper = toolComponents?.ImageToolsWrapper || ImageToolsWrapper;
  const ResolvedPdfTools = toolComponents?.PdfTools || PdfTools;
  const ResolvedFormatConverterSuite = toolComponents?.FormatConverterSuite || FormatConverterSuite;
  const ResolvedDocumentTools = toolComponents?.DocumentTools || DocumentTools;
  const ResolvedAboutUs = toolComponents?.AboutUs || AboutUs;
  const ResolvedDisclaimer = toolComponents?.Disclaimer || Disclaimer;
  const ResolvedTermsAndConditions = toolComponents?.TermsAndConditions || TermsAndConditions;
  const ResolvedContactUs = toolComponents?.ContactUs || ContactUs;
  const ResolvedPrivacyPolicy = toolComponents?.PrivacyPolicy || PrivacyPolicy;
  const ResolvedPrivacyModal = toolComponents?.PrivacyModal || PrivacyModal;

  // Synchronously compute initial route state so that SSR and client hydration initialize identically
  const [initialResolved] = useState(() => {
    if (initialPath) {
      return resolveRouteFromUrl(initialPath);
    }
    if (typeof window !== 'undefined') {
      return resolveRouteFromUrl(window.location.pathname, window.location.hash);
    }
    return resolveRouteFromUrl('/');
  });

  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>(initialResolved.selectedCategory);
  const [activeTool, setActiveTool] = useState<ActiveToolState | null>(initialResolved.activeTool);
  const [activePage, setActivePage] = useState<ActivePageType>(initialResolved.activePage);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredAuthUser());
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [signInInitialEmail, setSignInInitialEmail] = useState<string>('');
  const [resetPasswordOobCode, setResetPasswordOobCode] = useState<string | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(() => Boolean(initialResolved.isPrivacyModalOpen));
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

  // Instant window scroll helper to prevent layout thrashing and animation collision during tool mounting
  const safeScrollToTop = useCallback(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // fallback
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

  // Navigate to Informational Pages (About Us, Disclaimer, Terms, Contact, Admin, Privacy)
  const handleNavigatePage = useCallback(
    (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'admin' | 'privacy') => {
      setActivePage(page);
      setActiveTool(null);
      setPendingDroppedFiles(null);
      safeScrollToTop();
      try {
        if (page === 'admin') {
          window.history.pushState(null, '', '/admin');
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

  // Deep linking via URL route/hash on navigation & popstate
  useEffect(() => {
    const handleUrlRoute = () => {
      const resolved = resolveRouteFromUrl(window.location.pathname, window.location.hash);
      setActivePage(resolved.activePage);
      setActiveTool(resolved.activeTool);
      setSelectedCategory(resolved.selectedCategory);
      if (resolved.isPrivacyModalOpen) {
        setIsPrivacyModalOpen(true);
      }
    };

    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, []);

  // Preload heavy tool engine suites during idle time so tool workspace switches & drops are instantaneous
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preloadSuites = () => {
      import('./components/tools/ImageToolsWrapper').catch(() => {});
      import('./components/tools/FormatConverterSuite').catch(() => {});
      import('./components/tools/PdfTools').catch(() => {});
      import('./components/tools/DocumentTools').catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      const winWithIdle = window as Window & {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback: (id: number) => void;
      };
      const handle = winWithIdle.requestIdleCallback(preloadSuites, { timeout: 2500 });
      return () => {
        if ('cancelIdleCallback' in winWithIdle) {
          winWithIdle.cancelIdleCallback(handle);
        }
      };
    } else {
      const timerId = setTimeout(preloadSuites, 1200);
      return () => clearTimeout(timerId);
    }
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
      <ToolSeoHead
        activeTool={activeTool}
        activePage={activePage}
        selectedCategory={selectedCategory}
        isPrivacyModalOpen={isPrivacyModalOpen}
        currentPath={typeof window !== 'undefined' ? window.location.pathname : initialPath}
      />

      {/* Top Navbar */}
      <Navbar
        activeSection={
          activeTool
            ? activeTool.section
            : selectedCategory !== 'all'
            ? (selectedCategory as MainNavSection)
            : null
        }
        activeToolId={activeTool?.subToolId}
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
      <main id="main-content" tabIndex={-1} className="relative flex-1 w-full focus:outline-none">
        {/* Full Application Ambient Background Artwork (Everywhere between Navbar and Footer) */}
        <div
          className="fixed inset-0 top-13 sm:top-14 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center opacity-25 dark:opacity-[0.07] dark:invert transition-opacity duration-300"
          aria-hidden="true"
        >
          <img
            src="/og-image.png"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.1)_70%,transparent_100%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(9,9,11,0.75)_0%,rgba(9,9,11,0.1)_70%,transparent_100%)]" />
        </div>

        <div className="relative z-10 w-full">
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
                  <ResolvedAboutUs
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'disclaimer' && (
                  <ResolvedDisclaimer
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'terms' && (
                  <ResolvedTermsAndConditions
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                  />
                )}
                {activePage === 'contact' && (
                  <ResolvedContactUs
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
                    onNotify={addToast}
                  />
                )}
                {activePage === 'privacy' && (
                  <ResolvedPrivacyPolicy
                    onBackHome={() => handleGoHome('all')}
                    onNavigate={handleNavigatePage}
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
              currentPath={typeof window !== 'undefined' ? window.location.pathname : initialPath}
            />
          ) : (
            /* =========================================================================
               TOOL WORKSPACE VIEW (Active Tool Suite)
            ========================================================================= */
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2.5">
              {/* Active Tool Suite Component with Fault Isolation & Lazy Boundary */}
              <Suspense fallback={<PageSuspenseFallback />}>
                <AppErrorBoundary
                  fallbackTitle="Tool Engine Error"
                  onReset={() => handleLaunchTool(activeTool.section, activeTool.subToolId)}
                >
                  <div className="w-full">
                    {activeTool.section === 'image-tools' && (
                      <ResolvedImageToolsWrapper
                        initialTool={activeTool.subToolId as OptimizerToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}

                    {activeTool.section === 'pdf-tools' && (
                      <ResolvedPdfTools
                        initialTab={activeTool.subToolId as PdfToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}

                    {activeTool.section === 'convert' && (
                      <ResolvedFormatConverterSuite
                        initialToolId={activeTool.subToolId as ConverterToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}

                    {activeTool.section === 'document-tools' && (
                      <ResolvedDocumentTools
                        initialTab={activeTool.subToolId as GovDocumentToolId}
                        initialFiles={pendingDroppedFiles}
                        onClearPendingFiles={() => setPendingDroppedFiles(null)}
                        onNotify={addToast}
                      />
                    )}
                  </div>
                </AppErrorBoundary>
              </Suspense>
            </div>
          )}
        </AppErrorBoundary>
        </div>
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
          <ResolvedPrivacyModal
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

export default function App({ initialPath, toolComponents }: AppProps = {}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp initialPath={initialPath} toolComponents={toolComponents} />
      </LanguageProvider>
    </ThemeProvider>
  );
}
