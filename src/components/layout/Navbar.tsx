import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Sun,
  Moon,
  ChevronDown,
  LayoutDashboard,
  Settings,
  LogOut,
  ShieldCheck,
  Home,
  ChevronRight,
  ArrowLeft,
  Grid,
} from 'lucide-react';
import { checkIsAdmin } from '../../core/firebase';
import { UserAvatar } from '../ui/UserAvatar';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import { MasterDetailNavMenu } from '../navigation/MasterDetailNavMenu';

export type MainNavSection =
  | 'image-tools'
  | 'pdf-tools'
  | 'convert'
  | 'document-tools';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

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
  onNavigatePage?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'admin') => void;
  breadcrumbs?: BreadcrumbItem[];
  onBack?: () => void;
  onAllTools?: () => void;
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
  breadcrumbs,
  onBack,
  onAllTools,
}) => {
  const isAdmin = Boolean(currentUser && checkIsAdmin(currentUser.email, currentUser.role));
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';
  const [isMasterNavOpen, setIsMasterNavOpen] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const [masterNavCategory, setMasterNavCategory] = useState<MainNavSection>('document-tools');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click-outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(target)
      ) {
        setIsMasterNavOpen(false);
        setIsMenuPinned(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMasterNavOpen(false);
        setIsMenuPinned(false);
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
    setIsUserMenuOpen(false);
    onSelectSection(section);
  };

  const handleToggleMenu = () => {
    setIsUserMenuOpen(false);
    setIsMasterNavOpen((prev) => !prev);
    setIsMenuPinned((prev) => !prev);
  };

  const handleToggleUserMenu = () => {
    setIsMasterNavOpen(false);
    setIsMenuPinned(false);
    setIsUserMenuOpen((prev) => !prev);
  };

  return (
    <nav
      ref={navContainerRef}
      className="sticky top-0 z-50 w-full transition-colors duration-150 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 text-zinc-900 dark:text-zinc-100 backdrop-blur-sm select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between h-13 sm:h-14 relative">
        {/* ========================================================= */}
        {/* 1. LEFT: LOGO BRANDMARK ([F] Logo + ileWala TOOL)          */}
        {/* ========================================================= */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setIsMasterNavOpen(false);
            setIsMenuPinned(false);
            setIsUserMenuOpen(false);
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

          {/* Typography: FileWala TOOL */}
          <span className="font-bold text-lg sm:text-xl tracking-tight text-zinc-950 dark:text-white leading-none">
            FileWala <span className="font-bold">TOOL</span>
          </span>
        </a>

        {/* ========================================================= */}
        {/* 2. RIGHT: NAVIGATION & PROFILE CONTROLS                    */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 lg:gap-6 shrink-0">
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

          {/* User Profile / Sign In Option */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={handleToggleUserMenu}
                className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2.5 rounded-full sm:rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100"
                title="Account & Profile Menu"
                aria-label="User Profile Menu"
                aria-expanded={isUserMenuOpen}
              >
                <UserAvatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name}
                  size="xs"
                />
                <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name || 'Account'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
              </button>

              {/* USER PROFILE DROPDOWN (Admin Panel + Settings + Logout) */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-2.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-850/60 flex items-center gap-3">
                    <UserAvatar
                      src={currentUser.avatarUrl}
                      name={currentUser.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {currentUser.name || 'User'}
                        </p>
                        {isAdmin && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="my-1.5 border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Actions List */}
                  <div className="space-y-0.5">
                    {/* Admin Panel Link (Strictly restricted to Admin role) */}
                    {isAdmin && onOpenAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <LayoutDashboard className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Admin Panel</div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Manage users & database</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                          Console
                        </span>
                      </button>
                    )}

                    {/* Account Settings */}
                    {onOpenAccountSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAccountSettings();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                            <Settings className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Account Settings</div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Password, avatar & details</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="my-1.5 border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Theme Mode & Sign Out */}
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
                        </div>
                        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {isDark ? 'Dark' : 'Light'}
                      </span>
                    </button>

                    {onSignOut && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
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
              isMasterNavOpen
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
                : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="All Tools Menu"
            aria-label="Toggle menu"
            aria-expanded={isMasterNavOpen}
          >
            {isMasterNavOpen ? (
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
        {/* ALL TOOLS DROPDOWN (Desktop: 2-Card Cascading Flyout, Mobile: Floating Card) */}
        {/* ========================================================= */}
        {isMasterNavOpen && (
          <div
            className="absolute top-full right-3 sm:right-6 lg:right-8 pt-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
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

      {/* ========================================================= */}
      {/* INTEGRATED SUB-TIER BREADCRUMB & WORKSPACE ACTION BAR     */}
      {/* ========================================================= */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 sm:h-8.5 flex items-center justify-between gap-3 text-xs">
            {/* Left: Breadcrumbs Trail */}
            <nav aria-label="Breadcrumb" className="flex items-center min-w-0 overflow-x-auto no-scrollbar py-0.5">
              <ol className="flex items-center gap-1.5 sm:gap-2 min-w-0" role="list">
                {breadcrumbs.map((crumb, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <li key={idx} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {!isFirst && (
                        <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600 shrink-0" aria-hidden="true" />
                      )}
                      {isFirst && (
                        <Home className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 mr-0.5 shrink-0" aria-hidden="true" />
                      )}
                      {isLast || crumb.isActive ? (
                        <span
                          className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px] sm:max-w-[260px] md:max-w-none"
                          aria-current="page"
                          title={crumb.label}
                        >
                          {crumb.label}
                        </span>
                      ) : (
                        <a
                          href={crumb.href || '#'}
                          onClick={(e) => {
                            e.preventDefault();
                            if (crumb.onClick) crumb.onClick();
                          }}
                          className="font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer truncate max-w-[120px] sm:max-w-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 rounded"
                          title={crumb.label}
                        >
                          {crumb.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Right: Back & All Tools Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-750 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 shadow-2xs"
                  title="Back (Esc)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{language === 'hi' ? 'वापस' : 'Back'}</span>
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 leading-none">
                    Esc
                  </kbd>
                </button>
              )}

              {onAllTools && (
                <button
                  type="button"
                  onClick={onAllTools}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border-zinc-200 dark:border-zinc-750 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 shadow-2xs"
                  title="View all tools"
                >
                  <Grid className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="hidden sm:inline">
                    {language === 'hi' ? 'सभी टूल्स' : 'All Tools'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
