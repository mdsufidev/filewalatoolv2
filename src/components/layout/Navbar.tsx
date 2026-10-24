import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Search,
  Menu,
  X,
  User,
  Shield,
  Layers,
  Scissors,
  RotateCw,
  FilePlus,
  Circle,
  Smile,
  Minimize2,
  FileArchive,
  Archive,
  Maximize2,
  Crop,
  Sliders,
  PenTool,
  Calendar,
  Type,
  Pipette,
  Zap,
  ArrowRightLeft,
  Sparkles,
  FileText,
  BadgeCheck,
  Image as ImageIcon,
  ArrowUpRight,
  LogOut,
  Monitor,
} from 'lucide-react';
import { checkIsAdmin } from '../../core/firebase';
import { UserAvatar } from '../ui/UserAvatar';

export type MainNavSection =
  | 'image-tools'
  | 'pdf-tools'
  | 'convert'
  | 'document-tools';

export interface NavbarProps {
  activeSection: MainNavSection | null;
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

export interface CategorySubTool {
  id: string;
  name: string;
  subToolId: string;
  section: MainNavSection;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

// 1. Image Tools (20 Sub-Tools)
const IMAGE_SUBTOOLS: CategorySubTool[] = [
  { id: 'compressor', name: 'Image Compressor', subToolId: 'compressor', section: 'image-tools', icon: Minimize2, badge: 'Save 90%' },
  { id: 'resizer', name: 'Image Resizer', subToolId: 'resizer', section: 'image-tools', icon: Maximize2, badge: 'Pixels & %' },
  { id: 'cropper', name: 'Image Cropper', subToolId: 'cropper', section: 'image-tools', icon: Crop },
  { id: 'bg-remover', name: 'Background Remover', subToolId: 'bg-remover', section: 'image-tools', icon: Sparkles, badge: 'Chroma' },
  { id: 'batch-img', name: 'Batch Processor', subToolId: 'batch', section: 'image-tools', icon: Archive, badge: 'ZIP' },
  { id: 'adjust-img', name: 'Filters & Adjust', subToolId: 'adjust', section: 'image-tools', icon: Sliders },
  { id: 'rounded-img', name: 'Rounded Corners', subToolId: 'rounded', section: 'image-tools', icon: Circle },
  { id: 'watermark-img', name: 'Image Watermarker', subToolId: 'watermark', section: 'image-tools', icon: Type },
  { id: 'meme-img', name: 'Meme Generator', subToolId: 'meme', section: 'image-tools', icon: Smile },
  { id: 'palette-img', name: 'Palette Extractor', subToolId: 'palette', section: 'image-tools', icon: Pipette },
  { id: 'base64-img', name: 'Image to Base64', subToolId: 'base64', section: 'image-tools', icon: ArrowRightLeft },
  { id: 'heic-to-jpg-img', name: 'HEIC to JPG', subToolId: 'heic-to-jpg', section: 'convert', icon: Zap, badge: 'iPhone' },
  { id: 'png-to-webp-img', name: 'PNG to WebP', subToolId: 'png-to-webp', section: 'convert', icon: Zap },
  { id: 'webp-to-jpg-img', name: 'WebP to JPG', subToolId: 'webp-to-jpg', section: 'convert', icon: ArrowRightLeft },
  { id: 'jpg-to-png-img', name: 'JPG to PNG', subToolId: 'jpg-to-png', section: 'convert', icon: ArrowRightLeft },
  { id: 'png-to-jpg-img', name: 'PNG to JPG', subToolId: 'png-to-jpg', section: 'convert', icon: ArrowRightLeft },
  { id: 'jpg-to-webp-img', name: 'JPG to WebP', subToolId: 'jpg-to-webp', section: 'convert', icon: Sparkles },
  { id: 'avif-to-jpg-img', name: 'AVIF to JPG', subToolId: 'avif-to-jpg', section: 'convert', icon: Zap },
  { id: 'svg-to-png-img', name: 'SVG to PNG', subToolId: 'svg-to-png', section: 'convert', icon: Sparkles, badge: 'Vector' },
  { id: 'img-to-pdf', name: 'Image to PDF', subToolId: 'image-to-pdf', section: 'pdf-tools', icon: FilePlus },
];

// 2. PDF Tools (8 Sub-Tools)
const PDF_SUBTOOLS: CategorySubTool[] = [
  { id: 'merge-pdf', name: 'Merge PDF', subToolId: 'merge-pdf', section: 'pdf-tools', icon: Layers, badge: 'Combine' },
  { id: 'split-pdf', name: 'Split PDF', subToolId: 'split-pdf', section: 'pdf-tools', icon: Scissors, badge: 'Extract' },
  { id: 'compress-pdf', name: 'Compress PDF', subToolId: 'compress-pdf', section: 'pdf-tools', icon: FileArchive, badge: 'Under 1MB' },
  { id: 'pdf-to-jpg', name: 'PDF to Images', subToolId: 'pdf-to-jpg', section: 'pdf-tools', icon: ImageIcon, badge: 'JPG/PNG' },
  { id: 'image-to-pdf', name: 'Image to PDF', subToolId: 'image-to-pdf', section: 'pdf-tools', icon: FilePlus },
  { id: 'rotate-pdf', name: 'Rotate PDF', subToolId: 'rotate-pdf', section: 'pdf-tools', icon: RotateCw },
  { id: 'pdf-to-word', name: 'PDF to Word', subToolId: 'pdf-to-word', section: 'pdf-tools', icon: FileText, badge: 'DOCX' },
  { id: 'pdf-to-text', name: 'PDF to Text (OCR)', subToolId: 'pdf-to-text', section: 'pdf-tools', icon: FileText, badge: 'OCR' },
];

// 3. Format Converter (10 Sub-Tools)
const CONVERT_SUBTOOLS: CategorySubTool[] = [
  { id: 'convert-heic-jpg', name: 'HEIC to JPG', subToolId: 'heic-to-jpg', section: 'convert', icon: Zap, badge: 'iPhone' },
  { id: 'convert-png-webp', name: 'PNG to WebP', subToolId: 'png-to-webp', section: 'convert', icon: Zap },
  { id: 'convert-webp-jpg', name: 'WebP to JPG', subToolId: 'webp-to-jpg', section: 'convert', icon: ArrowRightLeft },
  { id: 'convert-jpg-png', name: 'JPG to PNG', subToolId: 'jpg-to-png', section: 'convert', icon: ArrowRightLeft },
  { id: 'convert-png-jpg', name: 'PNG to JPG', subToolId: 'png-to-jpg', section: 'convert', icon: ArrowRightLeft },
  { id: 'convert-jpg-webp', name: 'JPG to WebP', subToolId: 'jpg-to-webp', section: 'convert', icon: Sparkles },
  { id: 'convert-avif-jpg', name: 'AVIF to JPG', subToolId: 'avif-to-jpg', section: 'convert', icon: Zap },
  { id: 'convert-svg-png', name: 'SVG to PNG', subToolId: 'svg-to-png', section: 'convert', icon: Sparkles, badge: 'Vector' },
  { id: 'convert-pdf-jpg', name: 'PDF to JPG', subToolId: 'pdf-to-jpg', section: 'pdf-tools', icon: ImageIcon },
  { id: 'convert-img-pdf', name: 'Image to PDF', subToolId: 'image-to-pdf', section: 'pdf-tools', icon: FilePlus },
];

// 4. Govt & Exam Forms (7 Sub-Tools)
const DOCUMENT_SUBTOOLS: CategorySubTool[] = [
  { id: 'upsc-photo-maker', name: 'UPSC Photo Maker', subToolId: 'upsc-photo-maker', section: 'document-tools', icon: Calendar, badge: 'Name + Date' },
  { id: 'ssc-resizer', name: 'SSC Photo & Sign', subToolId: 'ssc-resizer', section: 'document-tools', icon: BadgeCheck, badge: '20–50 KB' },
  { id: 'pan-photo-resize', name: 'PAN Photo Resizer', subToolId: 'pan-photo-resize', section: 'document-tools', icon: ImageIcon, badge: '200 DPI' },
  { id: 'signature-resize', name: 'PAN Signature Resizer', subToolId: 'signature-resize', section: 'document-tools', icon: PenTool, badge: '354×157' },
  { id: 'passport-photo-resize', name: 'Passport Photo 35×45mm', subToolId: 'passport-photo-resize', section: 'document-tools', icon: ImageIcon, badge: 'Passport Seva' },
  { id: 'passport-signature-resize', name: 'Passport Signature', subToolId: 'passport-signature-resize', section: 'document-tools', icon: PenTool, badge: '400×200' },
  { id: 'gov-compressor', name: 'Gov Form Compressor', subToolId: 'gov-compressor', section: 'document-tools', icon: FileArchive, badge: '< 100/200 KB' },
];

interface NavCategoryItem {
  id: MainNavSection;
  name: string;
  count: number;
  subtools: CategorySubTool[];
  dropdownWidth: string;
  dropdownAlign: 'left' | 'right';
  cols: string;
}

const NAV_CATEGORIES: NavCategoryItem[] = [
  {
    id: 'image-tools',
    name: 'Image Tools',
    count: 20,
    subtools: IMAGE_SUBTOOLS,
    dropdownWidth: 'w-[580px]',
    dropdownAlign: 'left',
    cols: 'grid-cols-2 md:grid-cols-3',
  },
  {
    id: 'pdf-tools',
    name: 'PDF Tools',
    count: 8,
    subtools: PDF_SUBTOOLS,
    dropdownWidth: 'w-[440px]',
    dropdownAlign: 'left',
    cols: 'grid-cols-2',
  },
  {
    id: 'convert',
    name: 'Format Converter',
    count: 10,
    subtools: CONVERT_SUBTOOLS,
    dropdownWidth: 'w-[460px]',
    dropdownAlign: 'left',
    cols: 'grid-cols-2',
  },
  {
    id: 'document-tools',
    name: 'Govt & Exam Forms',
    count: 7,
    subtools: DOCUMENT_SUBTOOLS,
    dropdownWidth: 'w-[480px]',
    dropdownAlign: 'right',
    cols: 'grid-cols-2',
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
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
  const [activeDropdown, setActiveDropdown] = useState<MainNavSection | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<MainNavSection | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click-outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
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
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
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
    setActiveDropdown(category);
  };

  const handleMouseLeaveCategory = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const handleCategoryClick = (section: MainNavSection) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    onSelectSection(section);
  };

  const handleSubToolClick = (section: MainNavSection, subToolId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    onSelectSection(section, subToolId);
  };

  return (
    <nav
      ref={navContainerRef}
      className="sticky top-0 z-50 w-full transition-colors duration-150 border-b border-zinc-200 bg-white/95 text-zinc-900 backdrop-blur-sm select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between h-15 sm:h-16 relative">
        {/* ========================================================= */}
        {/* 1. LEFT: LOGO BRANDMARK (FileWala Tool) */}
        {/* ========================================================= */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer shrink-0 select-none group py-1"
          title="FileWala Tool - Free In-Browser File Utilities"
          aria-label="FileWala Tool Home"
        >
          {/* Crisp F-Logo Emblem */}
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

          {/* Typography: FileWala + TOOL Badge */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg sm:text-xl tracking-tight text-zinc-950 leading-none">
              File<span className="text-zinc-700">Wala</span>
            </span>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-100 text-zinc-600 leading-none">
              TOOL
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. MIDDLE: CORE CATEGORIES WITH HOVER SUB-TOOL DROPDOWNS */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2 h-full">
          {NAV_CATEGORIES.map((cat) => {
            const isDropdownOpen = activeDropdown === cat.id;
            const isActive = activeSection === cat.id;

            return (
              <div
                key={cat.id}
                className="relative h-full flex items-center"
                onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                onMouseLeave={handleMouseLeaveCategory}
              >
                {/* Main Category Nav Button */}
                <button
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-tight transition-colors duration-150 cursor-pointer ${
                    isActive || isDropdownOpen
                      ? 'text-zinc-950 bg-zinc-100 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 font-semibold">
                    {cat.count}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${
                      isDropdownOpen ? 'rotate-180 text-zinc-900' : ''
                    }`}
                  />
                </button>

                {/* Sub-tools Popover Dropdown (Appears on Cursor Hover) */}
                {isDropdownOpen && (
                  <div
                    className={`absolute top-full ${
                      cat.dropdownAlign === 'right' ? 'right-0' : 'left-0'
                    } pt-1.5 z-50 animate-in fade-in-0 duration-150`}
                    onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                    onMouseLeave={handleMouseLeaveCategory}
                  >
                    <div
                      className={`bg-white border border-zinc-200 rounded-lg p-3 ${cat.dropdownWidth} max-w-[92vw]`}
                    >
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 px-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 font-mono">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {cat.count} Tools
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCategoryClick(cat.id)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-950 font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Open All {cat.name}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Sub-tools Grid */}
                      <div className={`grid ${cat.cols} gap-1`}>
                        {cat.subtools.map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => handleSubToolClick(tool.section, tool.subToolId)}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 text-left transition-colors duration-150 group cursor-pointer w-full"
                            >
                              <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-zinc-100 border border-zinc-200 group-hover:bg-white transition-colors">
                                <ToolIcon className="w-3.5 h-3.5 text-zinc-650 group-hover:text-zinc-950 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 justify-between">
                                  <span className="text-xs font-medium text-zinc-800 group-hover:text-zinc-950 truncate">
                                    {tool.name}
                                  </span>
                                  {tool.badge && (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded border border-zinc-200 bg-zinc-50 text-zinc-500 shrink-0">
                                      {tool.badge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 3. RIGHT SIDE: SEARCH & USER ACCOUNT */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Windows Desktop App Button */}
          {onNavigatePage && (
            <button
              type="button"
              onClick={() => onNavigatePage('desktop')}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 text-xs font-medium transition-colors duration-150 cursor-pointer"
              title="FileWala Desktop for Windows (100% Offline AI Suite)"
            >
              <Monitor className="w-3.5 h-3.5 text-zinc-600" />
              <span>Windows App</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                .EXE
              </span>
            </button>
          )}

          {/* Quick Search Button (⌘K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 text-xs font-medium transition-colors duration-150 cursor-pointer"
              title="Search tools (⌘K)"
              aria-label="Search tools"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden lg:inline-flex px-1 py-0.2 text-[10px] font-mono rounded bg-white border border-zinc-200 text-zinc-400">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Unified User Profile Dropdown Menu (Flat 2D Linear Style) */}
          {currentUser ? (
            <div className="hidden sm:block relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:border-zinc-400 text-xs font-medium cursor-pointer transition-colors text-zinc-900"
                title="Account Menu"
              >
                <UserAvatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name}
                  size="sm"
                />
                <span className="max-w-[100px] md:max-w-[130px] truncate text-zinc-900 font-semibold">
                  {currentUser.name}
                </span>
                {isAdmin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Admin User" />
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
                    isUserMenuOpen ? 'rotate-180 text-zinc-900' : ''
                  }`}
                />
              </button>

              {/* Floating Menu Popover */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-lg border border-zinc-200 bg-white py-1.5 z-50 text-xs animate-in fade-in duration-100">
                  {/* User Profile Header */}
                  <div className="px-3.5 py-2.5 border-b border-zinc-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-950 truncate">
                        {currentUser.name}
                      </p>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        isAdmin
                          ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}>
                        {isAdmin ? 'Admin' : 'Free User'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500 truncate">
                      {currentUser.email}
                    </p>
                  </div>

                  {/* Actions List */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAccountSettings?.();
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Account Settings</span>
                    </button>

                    {isAdmin && onOpenAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer font-medium"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    {onOpenCommandPalette && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenCommandPalette();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Search className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Search Tools</span>
                        </span>
                        <kbd className="text-[10px] font-mono text-zinc-400 px-1 py-0.2 rounded border border-zinc-200 bg-zinc-50">
                          ⌘K
                        </kbd>
                      </button>
                    )}

                    {onOpenShortcutsHelp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenShortcutsHelp();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Keyboard Shortcuts</span>
                        </span>
                        <kbd className="text-[10px] font-mono text-zinc-400 px-1 py-0.2 rounded border border-zinc-200 bg-zinc-50">
                          ?
                        </kbd>
                      </button>
                    )}
                  </div>

                  {/* Sign Out Divider */}
                  {onSignOut && (
                    <div className="pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            onOpenSignIn && (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-zinc-900 hover:bg-zinc-800 transition-colors duration-150 cursor-pointer"
              >
                Sign Up
              </button>
            )
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`lg:hidden w-8 h-8 rounded-md border flex items-center justify-center transition-colors duration-150 cursor-pointer ${
              isMobileMenuOpen
                ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE RESPONSIVE DRAWER (lg:hidden) */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-200 bg-white px-4 pt-3 pb-8 max-h-[85vh] overflow-y-auto space-y-4 w-full animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Search */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenCommandPalette();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 text-xs font-medium cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-400" />
                <span>Search all tools...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border border-zinc-300">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Mobile Categories Accordion with Sub-Tools */}
          <div className="space-y-2 pt-1">
            {NAV_CATEGORIES.map((cat) => {
              const isExpanded = mobileExpandedCat === cat.id;
              const isActive = activeSection === cat.id;

              return (
                <div
                  key={cat.id}
                  className="border border-zinc-200 rounded-lg overflow-hidden bg-white"
                >
                  <div className="flex items-center justify-between p-2.5 bg-zinc-50/60 border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`text-xs font-semibold text-left flex items-center gap-2 cursor-pointer ${
                        isActive ? 'text-zinc-950 font-bold' : 'text-zinc-700 hover:text-zinc-950'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-zinc-500 border border-zinc-200">
                        {cat.count}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileExpandedCat(isExpanded ? null : cat.id)}
                      className="p-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'Expand sub-tools'}
                      aria-label={`Toggle ${cat.name} sub-tools`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isExpanded ? 'rotate-180 text-zinc-900' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Sub-Tools List */}
                  {isExpanded && (
                    <div className="p-2 space-y-1 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {cat.subtools.map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => handleSubToolClick(tool.section, tool.subToolId)}
                              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-zinc-100 text-left text-xs text-zinc-800 cursor-pointer w-full transition-colors"
                            >
                              <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-zinc-50 border border-zinc-200">
                                <ToolIcon className="w-3.5 h-3.5 text-zinc-600" />
                              </div>
                              <span className="font-medium truncate flex-1">{tool.name}</span>
                              {tool.badge && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded border border-zinc-200 bg-zinc-50 text-zinc-500">
                                  {tool.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Auth Links */}
          {currentUser ? (
            <div className="space-y-2">
              {isAdmin && onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-md border border-zinc-900 bg-zinc-900 text-white text-xs font-semibold cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Admin Console</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                    Manage
                  </span>
                </button>
              )}
              <div className="flex items-center justify-between p-2.5 rounded-md border border-zinc-200 bg-zinc-50">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAccountSettings?.();
                }}
                className="flex items-center gap-2 text-left cursor-pointer"
                title="Account Settings"
              >
                <UserAvatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name}
                  size="sm"
                />
                <div className="text-xs">
                  <p className="font-semibold text-zinc-900">{currentUser.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">
                    {currentUser.email}
                  </p>
                </div>
              </button>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
          ) : (
            onOpenSignIn && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSignIn();
                  }}
                  className="py-2 px-3 rounded-md text-xs font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-center cursor-pointer transition-colors"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSignIn();
                  }}
                  className="py-2 px-3 rounded-md text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white text-center cursor-pointer transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )
          )}

          {/* Legal / Informational Links */}
          {onNavigatePage && (
            <div className="pt-4 border-t border-zinc-200 flex flex-wrap gap-3 text-xs text-zinc-500">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigatePage('desktop');
                }}
                className="hover:text-zinc-950 font-semibold text-zinc-900 flex items-center gap-1"
              >
                <span>Desktop App (.exe)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigatePage('about');
                }}
                className="hover:text-zinc-950"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigatePage('terms');
                }}
                className="hover:text-zinc-950"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigatePage('disclaimer');
                }}
                className="hover:text-zinc-950"
              >
                Privacy &amp; Disclaimer
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigatePage('contact');
                }}
                className="hover:text-zinc-950"
              >
                Contact
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
