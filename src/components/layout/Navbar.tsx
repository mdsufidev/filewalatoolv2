import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  Search,
  X,
  User,
  Image as ImageIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { checkIsAdmin } from '../../core/firebase';
import { UserAvatar } from '../ui/UserAvatar';
import { useTheme } from '../../core/themeContext';
import { MasterDetailNavMenu, MasterNavCategory } from '../navigation/MasterDetailNavMenu';

export type MainNavSection =
  | 'image-tools'
  | 'pdf-tools'
  | 'convert'
  | 'document-tools';

export interface NavbarProps {
  activeSection: MainNavSection | null;
  activeToolId?: string;
  onSelectSection: (section: MainNavSection, subToolId?: string) => void;
  onGoHome: () => void;
  currentUser?: any;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  onOpenAccountSettings?: () => void;
  onOpenAdmin?: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenRecentFiles?: () => void;
  onNavigatePage?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'admin' | 'desktop') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  activeToolId,
  onSelectSection,
  onGoHome,
  currentUser,
  onOpenSignIn,
  onSignOut,
  onOpenAccountSettings,
  onOpenAdmin,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onNavigatePage,
}) => {
  const isAdmin = Boolean(currentUser && checkIsAdmin(currentUser.email, currentUser.role));
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isMasterNavOpen, setIsMasterNavOpen] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const [masterNavCategory, setMasterNavCategory] = useState<MainNavSection>('document-tools');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileDrilldownCat, setMobileDrilldownCat] = useState<MasterNavCategory | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize resize / orientation change between desktop & mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
        setMobileDrilldownCat(null);
      } else {
        setIsMasterNavOpen(false);
        setIsMenuPinned(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menus on click-outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setIsMasterNavOpen(false);
        setIsMenuPinned(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMasterNavOpen(false);
        setIsMenuPinned(false);
        setIsMobileMenuOpen(false);
        setMobileDrilldownCat(null);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent body scroll when right-to-left drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileMenuOpen]);

  const handleMouseEnterCategory = (category: MainNavSection) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setMasterNavCategory(category);
    setIsMasterNavOpen(true);
  };

  const handleMouseLeaveCategory = () => {
    if (isMenuPinned) return; // Do not auto-close if user pinned via click
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsMasterNavOpen(false);
    }, 280);
  };

  const handleMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleCategoryClick = (section: MainNavSection) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsMasterNavOpen(false);
    setIsMenuPinned(false);
    setIsMobileMenuOpen(false);
    setMobileDrilldownCat(null);
    onSelectSection(section);
  };

  const handleSubToolClick = (section: MainNavSection, subToolId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsMasterNavOpen(false);
    setIsMenuPinned(false);
    setIsMobileMenuOpen(false);
    setMobileDrilldownCat(null);
    onSelectSection(section, subToolId);
  };

  const handleToggleMenu = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      if (isMasterNavOpen) {
        setIsMasterNavOpen(false);
        setIsMenuPinned(false);
      } else {
        setIsMasterNavOpen(true);
        setIsMenuPinned(true);
      }
    } else {
      setIsMobileMenuOpen((prev) => !prev);
      setMobileDrilldownCat(null);
    }
  };

  return (
    <>
      <nav
        ref={navContainerRef}
      className="sticky top-0 z-50 w-full transition-colors duration-150 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 text-zinc-900 dark:text-zinc-100 backdrop-blur-sm select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between h-16 relative">
        {/* ========================================================= */}
        {/* 1. LEFT: LOGO BRANDMARK ([F] Logo + ileWala TOOL, Location Unchanged) */}
        {/* ========================================================= */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onGoHome();
          }}
          className="flex items-center gap-0.5 sm:gap-1 cursor-pointer shrink-0 select-none group py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 rounded-md"
          title="FileWala Tool - Free In-Browser File Utilities"
          aria-label="FileWala Tool Home"
        >
          {/* Public Logo Image acting as [F] */}
          <img
            src="/favicon-192x192.png?v=8"
            alt="FileWala Tool Logo"
            draggable={false}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain select-none shrink-0 transition-transform duration-150 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.png?v=8';
            }}
          />

          {/* Typography: ileWala TOOL */}
          <span className="font-bold text-lg sm:text-xl tracking-tight text-zinc-950 dark:text-white leading-none">
            ileWala <span className="font-bold">TOOL</span>
          </span>
        </a>

        {/* ========================================================= */}
        {/* 2. RIGHT: FRONT NAVIGATION (Govt & Exam Forms + Image Tools + Sign In + All Tools Menu) */}
        {/* ========================================================= */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 shrink-0">
          {/* Desktop Direct Links: Govt & Exam Forms & Image Tools */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7 h-full">
            {/* Govt & Exam Forms */}
            <div
              className="relative flex items-center h-full"
              onMouseEnter={() => handleMouseEnterCategory('document-tools')}
              onMouseLeave={handleMouseLeaveCategory}
            >
              <a
                href="/document-tools"
                onClick={(e) => {
                  e.preventDefault();
                  handleCategoryClick('document-tools');
                }}
                className={`text-sm font-medium transition-colors cursor-pointer py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 rounded ${
                  activeSection === 'document-tools' || (isMasterNavOpen && masterNavCategory === 'document-tools')
                    ? 'text-[#E11D2A] font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                Govt &amp; Exam Forms
              </a>
            </div>

            {/* Image Tools */}
            <div
              className="relative flex items-center h-full"
              onMouseEnter={() => handleMouseEnterCategory('image-tools')}
              onMouseLeave={handleMouseLeaveCategory}
            >
              <a
                href="/image-tools"
                onClick={(e) => {
                  e.preventDefault();
                  handleCategoryClick('image-tools');
                }}
                className={`text-sm font-medium transition-colors cursor-pointer py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 rounded ${
                  activeSection === 'image-tools' || (isMasterNavOpen && masterNavCategory === 'image-tools')
                    ? 'text-[#E11D2A] font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                Image Tools
              </a>
            </div>
          </div>

          {/* Sign In / Account Option (Bich me: Image Tools ke Right me, All Tools Menu ke Left me) */}
          {currentUser ? (
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="flex items-center gap-2 py-1 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100"
              title="Account Settings"
            >
              <UserAvatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                size="xs"
              />
              <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name || 'Account'}</span>
            </button>
          ) : (
            onOpenSignIn && (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="py-1.5 px-3 rounded-md text-xs font-semibold border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100"
              >
                Sign In
              </button>
            )
          )}

          {/* All Tools Menu: 2-Line Clicker Button (Docked right at the far right corner) */}
          <button
            type="button"
            onClick={handleToggleMenu}
            className={`p-1.5 sm:p-2 -mr-1.5 rounded-md transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 ${
              isMasterNavOpen || isMobileMenuOpen
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
                : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="All Tools Menu"
            aria-label="Toggle menu"
            aria-expanded={isMasterNavOpen || isMobileMenuOpen}
          >
            {isMobileMenuOpen || isMasterNavOpen ? (
              <X className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="10" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP MASTER-DETAIL CASCADING FLYOUT (Matches Reference UI) */}
        {/* Inside max-w-7xl so it aligns perfectly with header controls */}
        {/* ========================================================= */}
        {isMasterNavOpen && (
          <div
            className="hidden md:block absolute top-full right-4 sm:right-6 lg:right-8 pt-2 z-50 animate-in fade-in-0 duration-150"
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMouseLeaveCategory}
          >
            <MasterDetailNavMenu
              initialCategory={masterNavCategory}
              activeToolId={activeToolId}
              activeSection={activeSection}
              onSelectTool={(section, subToolId) => {
                setIsMasterNavOpen(false);
                setIsMenuPinned(false);
                onSelectSection(section, subToolId);
              }}
              onSelectCategoryHub={(section) => {
                setIsMasterNavOpen(false);
                setIsMenuPinned(false);
                onSelectSection(section);
              }}
              onClose={() => {
                setIsMasterNavOpen(false);
                setIsMenuPinned(false);
              }}
            />
          </div>
        )}
      </div>
    </nav>

    {/* ========================================================= */}
    {/* PORTALED RIGHT-TO-LEFT SIDEBAR DRAWER (Matching Reference Image 2) */}
    {/* ========================================================= */}
    {mounted && typeof document !== 'undefined' && isMobileMenuOpen
      ? createPortal(
          <div className="fixed inset-0 z-[100] overflow-hidden select-none">
            {/* Smooth Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-backdrop-in"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-over Aside Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex z-[101]">
              <aside
                className="w-screen max-w-[340px] sm:max-w-[380px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] animate-drawer-in sm:rounded-l-2xl overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation Menu"
              >
                {/* 1. Header Bar with [ < ] Back Button (Matching Image 2) */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
                  <div className="flex items-center gap-2.5">
                    {mobileDrilldownCat ? (
                      <button
                        type="button"
                        onClick={() => setMobileDrilldownCat(null)}
                        className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
                        aria-label="Back to Main Tools"
                        title="Back to Main Tools"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setMobileDrilldownCat(null);
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
                        aria-label="Close menu"
                        title="Close menu"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    <h2 className="font-bold text-base text-zinc-900 dark:text-white truncate max-w-[190px]">
                      {mobileDrilldownCat ? mobileDrilldownCat.name : 'Navigation'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setMobileDrilldownCat(null);
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                      aria-label="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Fast Search Trigger */}
                <div className="px-5 pt-3 pb-2 shrink-0">
                  {onOpenCommandPalette && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setMobileDrilldownCat(null);
                        onOpenCommandPalette();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Search all 44+ tools...</span>
                      </div>
                      <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500">
                        ⌘K
                      </kbd>
                    </button>
                  )}
                </div>

                {/* 3. Master-Detail Tool Navigation (Clean Drill-Down Flow) */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                  <MasterDetailNavMenu
                    activeToolId={activeToolId}
                    activeSection={activeSection}
                    mobileDrilldownCat={mobileDrilldownCat}
                    onMobileDrilldownChange={setMobileDrilldownCat}
                    onSelectTool={(section, subToolId) => {
                      setIsMobileMenuOpen(false);
                      setMobileDrilldownCat(null);
                      onSelectSection(section, subToolId);
                    }}
                    onSelectCategoryHub={(section) => {
                      setIsMobileMenuOpen(false);
                      setMobileDrilldownCat(null);
                      onSelectSection(section);
                    }}
                    onClose={() => {
                      setIsMobileMenuOpen(false);
                      setMobileDrilldownCat(null);
                    }}
                  />

                  {/* Section 5: Account & Workspace (Matching Image 2 Section 2) */}
                  <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-sm py-1">
                      <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Account &amp; Workspace</span>
                    </div>
                    <div className="space-y-0.5 pl-6 pt-0.5 border-l border-zinc-100 dark:border-zinc-800/80 ml-2">
                      {currentUser ? (
                        <>
                          {isAdmin && onOpenAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setMobileDrilldownCat(null);
                                onOpenAdmin();
                              }}
                              className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-amber-600 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>Admin Console</span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                Admin
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              setMobileDrilldownCat(null);
                              onOpenAccountSettings?.();
                            }}
                            className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                          >
                            Profile &amp; Settings ({currentUser.name})
                          </button>
                          {onSignOut && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setMobileDrilldownCat(null);
                                onSignOut();
                              }}
                              className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-rose-600 dark:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                            >
                              Sign Out
                            </button>
                          )}
                        </>
                      ) : (
                        onOpenSignIn && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setMobileDrilldownCat(null);
                                onOpenSignIn();
                              }}
                              className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                            >
                              Sign In / Login
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setMobileDrilldownCat(null);
                                onOpenSignIn();
                              }}
                              className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-900 dark:text-zinc-100 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                            >
                              Create Free Account
                            </button>
                          </>
                        )
                      )}
                      {onNavigatePage && (
                        <>
                          <a
                            href="/desktop"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMobileMenuOpen(false);
                              setMobileDrilldownCat(null);
                              onNavigatePage('desktop');
                            }}
                            className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between"
                          >
                            <span>Desktop App (.exe)</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500">
                              Free
                            </span>
                          </a>
                          <a
                            href="/about"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMobileMenuOpen(false);
                              setMobileDrilldownCat(null);
                              onNavigatePage('about');
                            }}
                            className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer block"
                          >
                            About Us
                          </a>
                          <a
                            href="/terms"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMobileMenuOpen(false);
                              setMobileDrilldownCat(null);
                              onNavigatePage('terms');
                            }}
                            className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer block"
                          >
                            Terms of Service
                          </a>
                          <a
                            href="/disclaimer"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMobileMenuOpen(false);
                              setMobileDrilldownCat(null);
                              onNavigatePage('disclaimer');
                            }}
                            className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer block"
                          >
                            Privacy Policy &amp; Disclaimer
                          </a>
                          <a
                            href="/contact"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMobileMenuOpen(false);
                              setMobileDrilldownCat(null);
                              onNavigatePage('contact');
                            }}
                            className="w-full text-left py-1.5 px-2.5 rounded-md text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer block"
                          >
                            Contact Support
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>,
          document.body
        )
      : null}
    </>
  );
};
