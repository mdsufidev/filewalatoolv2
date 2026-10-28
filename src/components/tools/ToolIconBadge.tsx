import React from 'react';
import {
  Crop,
  PenTool,
  Minimize2,
  Maximize2,
  Image as ImageIcon,
  Layers,
  Scissors,
  RotateCw,
  FileText,
  FilePlus,
  Type,
  Pipette,
  Smile,
  Sliders,
  Archive,
  Circle,
  Code,
  ArrowRightLeft,
  Zap,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export interface ToolIconBadgeProps {
  toolId: string;
  category: string;
  iconName?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Image Compressor Icon (Matching Reference Image 3)
 * 4 rounded squares arranged 2x2 with inward white arrows
 */
const CompressorIconImage3: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Top-Left: Green square + Arrow pointing Down-Right */}
      <rect x="2" y="2" width="18" height="18" rx="4.5" fill="#74B72E" />
      <path
        d="M8 8L15 15M15 15H10.5M15 15V10.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top-Right: Green square + Arrow pointing Down-Left */}
      <rect x="24" y="2" width="18" height="18" rx="4.5" fill="#74B72E" />
      <path
        d="M36 8L29 15M29 15H33.5M29 15V10.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-Left: Green square + Arrow pointing Up-Right */}
      <rect x="2" y="24" width="18" height="18" rx="4.5" fill="#74B72E" />
      <path
        d="M8 36L15 29M15 29H10.5M15 29V33.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-Right: Green square + Arrow pointing Up-Left */}
      <rect x="24" y="24" width="18" height="18" rx="4.5" fill="#74B72E" />
      <path
        d="M36 36L29 29M29 29H33.5M29 29V33.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Official Indian PAN Card Icon
 * Displays a realistic government ID card with highlighted photo frame, header bar, and detail lines.
 */
const PanCardIcon: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Navy Base Tile */}
      <rect width="44" height="44" rx={rx} fill="#0284C7" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />

      {/* PAN Card Outline */}
      <rect
        x="6"
        y="10"
        width="32"
        height="24"
        rx="3.5"
        fill="#FFFFFF"
        fillOpacity="0.12"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />

      {/* Top Header Bar */}
      <path d="M6 14.5H38" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.3" />
      <rect x="8" y="11.5" width="6" height="1.8" rx="0.6" fill="#F59E0B" />

      {/* Photo Frame (Highlighted on Left) */}
      <rect x="8.5" y="17" width="9.5" height="11.5" rx="1.5" fill="#FFFFFF" />
      {/* Head inside photo */}
      <circle cx="13.25" cy="20.5" r="2.2" fill="#0284C7" />
      {/* Shoulders inside photo */}
      <path
        d="M10 26.5C10 24 11.5 23.5 13.25 23.5C15 23.5 16.5 24 16.5 26.5H10Z"
        fill="#0284C7"
      />

      {/* PAN Detail Lines (Right Side) */}
      <rect x="21" y="18" width="14" height="1.8" rx="0.8" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="21" y="21.5" width="11" height="1.5" rx="0.75" fill="#FFFFFF" fillOpacity="0.6" />
      <rect x="21" y="24.5" width="13" height="1.5" rx="0.75" fill="#FFFFFF" fillOpacity="0.6" />

      {/* Signature Strip */}
      <rect x="21" y="27.5" width="14" height="2.5" rx="0.8" fill="#FFFFFF" fillOpacity="0.25" />
      <path
        d="M22.5 28.8C24 28 26 29.5 28 28.5T32 29"
        stroke="#F8FAFC"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Authentic Handwritten Signature Icon
 * Features a cursive signature stroke over an official baseline with a tilted fountain pen nib.
 */
const SignatureIcon: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Royal Indigo Base Tile */}
      <rect width="44" height="44" rx={rx} fill="#4F46E5" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />

      {/* Baseline Document Guide with 'X' signing anchor */}
      <path
        d="M7 32H37"
        stroke="#FFFFFF"
        strokeOpacity="0.3"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
      <path
        d="M8 29.5L10.5 32M10.5 29.5L8 32"
        stroke="#FFFFFF"
        strokeOpacity="0.5"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Smooth Vector Handwritten Signature Flourish */}
      <path
        d="M12 29C13.5 22 17 21 18.5 25C19.5 28 22 30 24 27C26 24 28 23 29.5 27.5C30.5 30 33 29 35 28"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fountain Pen Nib at 45 Degrees */}
      <g transform="translate(32, 10)">
        <path d="M3 3L8 8L3.5 12.5L-1.5 7.5L3 3Z" fill="#F8FAFC" />
        <path d="M-1.5 7.5L-4 15L3.5 12.5L-1.5 7.5Z" fill="#F59E0B" />
        <path d="M-0.5 9L-3.5 14.5" stroke="#1E1B4B" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/**
 * Biometric Passport Photo Icon
 * Features a formal headshot avatar inside a 35x45mm vertical frame with 4-corner crop/dimension brackets.
 */
const PassportPhotoIcon: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Deep Sky Blue Base Tile */}
      <rect width="44" height="44" rx={rx} fill="#0EA5E9" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />

      {/* 35x45mm Aspect Ratio Photo Card */}
      <rect
        x="11"
        y="7"
        width="22"
        height="30"
        rx="3"
        fill="#FFFFFF"
        fillOpacity="0.15"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />

      {/* 4 Corner Crop / Dimension Tick Marks */}
      <path d="M9 11H7V9" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M35 11H37V9" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 33H7V35" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M35 33H37V35" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

      {/* Biometric Portrait Head */}
      <circle cx="22" cy="18" r="4.5" fill="#FFFFFF" />
      {/* Formal Collar and Shoulders */}
      <path d="M14 31C14 26 18 25 22 25C26 25 30 26 30 31H14Z" fill="#FFFFFF" />
      <path d="M22 25V28" stroke="#0EA5E9" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Official UPSC Candidate Photo Maker Icon (Name + Date Banner)
 * Features formal candidate headshot with mandatory white nameplate strip at bottom.
 */
const UpscPhotoIcon: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Government Crimson Base Tile */}
      <rect width="44" height="44" rx={rx} fill="#BE123C" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />

      {/* Outer UPSC Candidate Photo Frame */}
      <rect
        x="8"
        y="5.5"
        width="28"
        height="33"
        rx="2.5"
        fill="#9F1239"
        stroke="#FFFFFF"
        strokeWidth="1.4"
      />

      {/* Candidate Silhouette */}
      {/* Head */}
      <circle cx="22" cy="14" r="4.2" fill="#FFFFFF" />
      {/* Formal Shoulders & Collar */}
      <path
        d="M13.5 25.5C13.5 20.8 17.5 19.8 22 19.8C26.5 19.8 30.5 20.8 30.5 25.5H13.5Z"
        fill="#FFFFFF"
      />
      {/* Subtle Tie/Collar Notch */}
      <path d="M22 19.8V23" stroke="#BE123C" strokeWidth="1" strokeLinecap="round" />

      {/* Mandatory UPSC White Nameplate Strip (Bottom) */}
      <path
        d="M8 26.5H36V36C36 37.38 34.88 38.5 33.5 38.5H10.5C9.12 38.5 8 37.38 8 36V26.5Z"
        fill="#FFFFFF"
      />
      <path d="M8 26.5H36" stroke="#E2E8F0" strokeWidth="0.8" />

      {/* Candidate Name Text */}
      <text
        x="22"
        y="31.8"
        fill="#881337"
        fontSize="4.6"
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="0.4px"
      >
        NAME
      </text>

      {/* Date of Photo (D.O.P.) Text */}
      <text
        x="22"
        y="36.5"
        fill="#991B1B"
        fontSize="3.8"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="0.2px"
      >
        D.O.P.
      </text>
    </svg>
  );
};

/**
 * Official SSC Photo & Signature Resizer Icon
 * Displays candidate photo card + signature strip + official SSC green verification checkmark.
 */
const SscPhotoSignatureIcon: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Official SSC Amber/Gold Base Tile */}
      <rect width="44" height="44" rx={rx} fill="#D97706" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />

      {/* Candidate Photo Card (Top-Left) */}
      <rect
        x="6"
        y="6"
        width="20"
        height="22"
        rx="2.5"
        fill="#FFFFFF"
        fillOpacity="0.18"
        stroke="#FFFFFF"
        strokeWidth="1.4"
      />
      {/* Head */}
      <circle cx="16" cy="13" r="3.2" fill="#FFFFFF" />
      {/* Shoulders */}
      <path
        d="M10 23C10 18.8 12.8 18 16 18C19.2 18 22 18.8 22 23H10Z"
        fill="#FFFFFF"
      />
      {/* Micro Photo Tag */}
      <rect x="7" y="7" width="7" height="3.2" rx="1" fill="#B45309" />
      <text
        x="10.5"
        y="9.5"
        fill="#FFFFFF"
        fontSize="2.4"
        fontWeight="900"
        textAnchor="middle"
      >
        IMG
      </text>

      {/* SSC Official Verification Checkmark Stamp (Top-Right) */}
      <circle cx="33" cy="16.5" r="7.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.4" />
      <path
        d="M29.5 16.5L32 19L36.5 14"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Signature Card (Bottom Full Strip) */}
      <rect
        x="6"
        y="30.5"
        width="32"
        height="8.5"
        rx="2.5"
        fill="#FFFFFF"
      />
      {/* Signature baseline guide */}
      <line x1="8" y1="36" x2="36" y2="36" stroke="#E2E8F0" strokeWidth="0.8" />
      {/* Realistic Ink Signature Curve */}
      <path
        d="M9.5 35.5C11.5 32 13.5 31.5 15.5 34C17 36 19 35.5 21 33C22.5 31.5 25 32 26.5 35C28 36.5 30.5 34 33.5 33.5"
        stroke="#0F172A"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signature label */}
      <text
        x="35"
        y="32.8"
        fill="#64748B"
        fontSize="2.4"
        fontWeight="800"
        textAnchor="end"
      >
        SIGN
      </text>
    </svg>
  );
};

/**
 * Official Government Document / Certificate Compressor Icon
 * Features certificate sheet with folded corner, golden emblem seal, and <100KB compression badge.
 */
const GovDocCompressorIcon: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Compliance Emerald Base Tile */}
      <rect width="44" height="44" rx={rx} fill="#059669" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />

      {/* Official Certificate / Document Sheet with Folded Corner */}
      <path
        d="M8 8.5C8 6.57 9.57 5 11.5 5H24L33 14V35.5C33 37.43 31.43 39 29.5 39H11.5C9.57 39 8 37.43 8 35.5V8.5Z"
        fill="#FFFFFF"
      />
      {/* Folded Corner (Dog-ear) */}
      <path
        d="M24 5V12.5C24 13.33 24.67 14 25.5 14H33"
        fill="#E2E8F0"
        stroke="#059669"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Document Content Header */}
      <rect x="12" y="9.5" width="8" height="2" rx="1" fill="#047857" />
      {/* Content Lines */}
      <rect x="12" y="15" width="9" height="1.5" rx="0.75" fill="#94A3B8" />
      <rect x="12" y="18.5" width="16" height="1.5" rx="0.75" fill="#94A3B8" />
      <rect x="12" y="22" width="12" height="1.5" rx="0.75" fill="#94A3B8" />

      {/* Official Govt Golden Emblem Stamp (Bottom-Left) */}
      <circle cx="15.5" cy="30" r="4" fill="#F59E0B" />
      <circle cx="15.5" cy="30" r="2.5" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="1.2 0.8" />
      <path d="M15.5 28.5V31.5M14 30H17" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />

      {/* Compression Target Badge (<100KB Pill) */}
      <rect
        x="18.5"
        y="25.5"
        width="20"
        height="14"
        rx="3.5"
        fill="#064E3B"
        stroke="#34D399"
        strokeWidth="1.2"
      />

      {/* Downward Compression Arrow */}
      <path
        d="M21.5 29L21.5 34M20 32.5L21.5 34L23 32.5"
        stroke="#34D399"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* <100KB Text */}
      <text
        x="29.5"
        y="33.8"
        fill="#FFFFFF"
        fontSize="6"
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="0.2px"
      >
        {"<100k"}
      </text>
    </svg>
  );
};

/**
 * Dedicated Format Converter Workflow Icon (Concept 1: Top-to-Bottom Flow)
 * - Full-width 39px pills maximize text area (+140% wider)
 * - Large 9.5px Bold White text (+90% larger font) for instant legibility
 * - Clear downward transformation chevron arrow
 */
interface FormatConverterIconProps {
  fromText: string;
  toText: string;
  fromBg: string;
  toBg: string;
  fromTextColor?: string;
  toTextColor?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const FormatConverterIcon: React.FC<FormatConverterIconProps> = ({
  fromText,
  toText,
  fromBg,
  toBg,
  fromTextColor = '#FFFFFF',
  toTextColor = '#FFFFFF',
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const rx = size === 'sm' ? '8' : '11';

  // Dynamic high-legibility font sizing
  const fromFontSize = fromText.length > 3 ? (fromText.length > 4 ? '7.5' : '8.5') : '9.5';
  const toFontSize = toText.length > 3 ? (toText.length > 4 ? '7.5' : '8.5') : '9.5';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Dark Ceramic Base Frame */}
      <rect width="44" height="44" rx={rx} fill="#090D16" />
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx={Number(rx) - 0.5}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1"
      />

      {/* Top Source Format Bar (Full Width 39px) */}
      <rect x="2.5" y="2.5" width="39" height="16" rx="5" fill={fromBg} />
      <text
        x="22"
        y="14"
        fill={fromTextColor}
        fontSize={fromFontSize}
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="0.5px"
      >
        {fromText}
      </text>

      {/* Centered Micro-Arrow Indicator pointing down */}
      <path
        d="M19.5 21L22 23.5L24.5 21"
        stroke="#E2E8F0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom Target Format Bar (Full Width 39px) */}
      <rect x="2.5" y="25.5" width="39" height="16" rx="5" fill={toBg} />
      <text
        x="22"
        y="37"
        fill={toTextColor}
        fontSize={toFontSize}
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="0.5px"
      >
        {toText}
      </text>
    </svg>
  );
};

/**
 * Modern App Tile Icon Badge
 * - Rich, vibrant theme background with rounded-xl corners
 * - Crisp white icons & high-legibility Format Workflow SVG Badges
 * - Dedicated PAN Card, Handwritten Signature, and Passport Photo SVG Badges
 * - Smooth scale-up zoom on card hover (group-hover:scale-110)
 */
export const ToolIconBadge: React.FC<ToolIconBadgeProps> = ({
  toolId,
  category,
  iconName,
  className = '',
  size = 'md',
}) => {
  const iconProps = {
    className: size === 'sm' ? 'w-4 h-4 stroke-[2.2] text-white' : 'w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2] text-white',
  };

  const badgeSize = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-11 h-11 rounded-xl';

  const wrapBadge = (icon: React.ReactNode, bgColor: string = 'bg-emerald-500') => (
    <div
      className={`${badgeSize} ${bgColor} text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 ${className}`}
    >
      {icon}
    </div>
  );

  // Exact Match for Image Compressor (Reference Image 3)
  if (toolId === 'compressor' || toolId === 'image-compressor') {
    return <CompressorIconImage3 size={size} className={className} />;
  }

  /* --------------------------------------------------------------------------
   * DEDICATED GOVT & EXAM FORM ICONS (PAN, SIGNATURE & PASSPORT)
   * -------------------------------------------------------------------------- */
  // 1. PAN Photo Resizer (Official Indian PAN Card with photo frame)
  if (toolId === 'pan-photo-resize') {
    return <PanCardIcon size={size} className={className} />;
  }

  // 2. Handwritten Signature Resizer (PAN & Passport Signatures)
  if (toolId === 'signature-resize' || toolId === 'passport-signature-resize') {
    return <SignatureIcon size={size} className={className} />;
  }

  // 3. Biometric Passport Photo Resizer (35x45mm with Crop Marks)
  if (toolId === 'passport-photo' || toolId === 'passport-photo-resize') {
    return <PassportPhotoIcon size={size} className={className} />;
  }

  // 4. UPSC Photo Maker (Name + Date)
  if (toolId === 'upsc-photo-maker') {
    return <UpscPhotoIcon size={size} className={className} />;
  }

  // 5. SSC Photo & Signature Resizer
  if (toolId === 'ssc-resizer' || toolId === 'ssc-photo-signature') {
    return <SscPhotoSignatureIcon size={size} className={className} />;
  }

  // 6. Gov Form Document Compressor (<100KB / <200KB)
  if (toolId === 'gov-compressor' || toolId === 'kb-resizer') {
    return <GovDocCompressorIcon size={size} className={className} />;
  }

  // Image Tools
  if (toolId === 'resizer' || toolId === 'image-resizer') return wrapBadge(<Maximize2 {...iconProps} />, 'bg-blue-500');
  if (toolId === 'cropper' || toolId === 'crop-image') return wrapBadge(<Crop {...iconProps} />, 'bg-amber-500');
  if (toolId === 'bg-remover') return wrapBadge(<Sparkles {...iconProps} />, 'bg-violet-500');
  if (toolId === 'face-enhancer' || toolId === 'ai-face-enhancer') return wrapBadge(<Sparkles {...iconProps} />, 'bg-rose-500');
  if (toolId === 'watermark-img' || toolId === 'watermark-image') return wrapBadge(<Type {...iconProps} />, 'bg-teal-500');
  if (toolId === 'palette-img' || toolId === 'color-palette') return wrapBadge(<Pipette {...iconProps} />, 'bg-pink-500');
  if (toolId === 'meme-img' || toolId === 'meme-generator') return wrapBadge(<Smile {...iconProps} />, 'bg-amber-500');
  if (toolId === 'adjust-img' || toolId === 'filter-adjust') return wrapBadge(<Sliders {...iconProps} />, 'bg-indigo-500');
  if (toolId === 'rounded-img' || toolId === 'round-corners') return wrapBadge(<Circle {...iconProps} />, 'bg-emerald-500');
  if (toolId === 'batch-img' || toolId === 'batch-image-cropper') return wrapBadge(<Archive {...iconProps} />, 'bg-orange-500');

  // PDF Tools
  if (toolId === 'merge-pdf') return wrapBadge(<Layers {...iconProps} />, 'bg-rose-500');
  if (toolId === 'split-pdf') return wrapBadge(<Scissors {...iconProps} />, 'bg-rose-600');
  if (toolId === 'compress-pdf') return wrapBadge(<Minimize2 {...iconProps} />, 'bg-emerald-600');
  if (toolId === 'rotate-pdf') return wrapBadge(<RotateCw {...iconProps} />, 'bg-blue-500');

  /* --------------------------------------------------------------------------
   * DEDICATED FORMAT CONVERTER WORKFLOW BADGES ([TOP] ➔ [BOTTOM])
   * Strips prefixes and suffixes for 100% robust resolution across all routes
   * -------------------------------------------------------------------------- */
  const normalizedId = toolId
    .toLowerCase()
    .replace(/^convert-/, '')
    .replace(/-img$/, '');

  // 1. PNG to JPG
  if (normalizedId === 'png-to-jpg' || normalizedId === 'png-jpg') {
    return (
      <FormatConverterIcon
        fromText="PNG"
        toText="JPG"
        fromBg="#059669"
        toBg="#D97706"
        size={size}
        className={className}
      />
    );
  }

  // 2. JPG to PNG
  if (normalizedId === 'jpg-to-png' || normalizedId === 'jpg-png') {
    return (
      <FormatConverterIcon
        fromText="JPG"
        toText="PNG"
        fromBg="#D97706"
        toBg="#059669"
        size={size}
        className={className}
      />
    );
  }

  // 3. HEIC to JPG (iPhone Apple Camera)
  if (normalizedId === 'heic-to-jpg' || normalizedId === 'heic-jpg') {
    return (
      <FormatConverterIcon
        fromText="HEIC"
        toText="JPG"
        fromBg="#4F46E5"
        toBg="#D97706"
        size={size}
        className={className}
      />
    );
  }

  // 4. PNG to WebP
  if (normalizedId === 'png-to-webp' || normalizedId === 'png-webp') {
    return (
      <FormatConverterIcon
        fromText="PNG"
        toText="WEBP"
        fromBg="#059669"
        toBg="#0284C7"
        size={size}
        className={className}
      />
    );
  }

  // 5. JPG to WebP
  if (normalizedId === 'jpg-to-webp' || normalizedId === 'jpg-webp') {
    return (
      <FormatConverterIcon
        fromText="JPG"
        toText="WEBP"
        fromBg="#D97706"
        toBg="#0284C7"
        size={size}
        className={className}
      />
    );
  }

  // 6. WebP to JPG
  if (normalizedId === 'webp-to-jpg' || normalizedId === 'webp-jpg') {
    return (
      <FormatConverterIcon
        fromText="WEBP"
        toText="JPG"
        fromBg="#0284C7"
        toBg="#D97706"
        size={size}
        className={className}
      />
    );
  }

  // 7. AVIF to JPG
  if (normalizedId === 'avif-to-jpg' || normalizedId === 'avif-jpg') {
    return (
      <FormatConverterIcon
        fromText="AVIF"
        toText="JPG"
        fromBg="#C026D3"
        toBg="#D97706"
        size={size}
        className={className}
      />
    );
  }

  // 8. SVG to PNG
  if (normalizedId === 'svg-to-png' || normalizedId === 'svg-png') {
    return (
      <FormatConverterIcon
        fromText="SVG"
        toText="PNG"
        fromBg="#7C3AED"
        toBg="#059669"
        size={size}
        className={className}
      />
    );
  }

  // 9. PDF to JPG / Images
  if (normalizedId === 'pdf-to-jpg' || normalizedId === 'pdf-jpg' || normalizedId === 'pdf-to-image') {
    return (
      <FormatConverterIcon
        fromText="PDF"
        toText="JPG"
        fromBg="#DC2626"
        toBg="#D97706"
        size={size}
        className={className}
      />
    );
  }

  // 10. Image to PDF
  if (
    normalizedId === 'image-to-pdf' ||
    normalizedId === 'img-to-pdf' ||
    normalizedId === 'img-pdf'
  ) {
    return (
      <FormatConverterIcon
        fromText="IMG"
        toText="PDF"
        fromBg="#0284C7"
        toBg="#DC2626"
        size={size}
        className={className}
      />
    );
  }

  // 11. PDF to Word
  if (normalizedId === 'pdf-to-word') {
    return (
      <FormatConverterIcon
        fromText="PDF"
        toText="DOCX"
        fromBg="#DC2626"
        toBg="#2563EB"
        size={size}
        className={className}
      />
    );
  }

  // 12. PDF to Text (OCR)
  if (normalizedId === 'pdf-to-text') {
    return (
      <FormatConverterIcon
        fromText="PDF"
        toText="TXT"
        fromBg="#DC2626"
        toBg="#475569"
        size={size}
        className={className}
      />
    );
  }

  // 13. Image to Base64
  if (
    normalizedId === 'image-to-base64' ||
    normalizedId === 'base64-img' ||
    normalizedId === 'base64'
  ) {
    return (
      <FormatConverterIcon
        fromText="IMG"
        toText="</>"
        fromBg="#0284C7"
        toBg="#0F766E"
        size={size}
        className={className}
      />
    );
  }

  // Generic Converter Fallback
  if (category === 'convert') {
    return wrapBadge(<ArrowRightLeft {...iconProps} />, 'bg-indigo-500');
  }

  // Fallback icon based on iconName
  switch (iconName) {
    case 'Maximize2':
      return wrapBadge(<Maximize2 {...iconProps} />, 'bg-blue-500');
    case 'Minimize2':
      return wrapBadge(<Minimize2 {...iconProps} />, 'bg-emerald-500');
    case 'Crop':
      return wrapBadge(<Crop {...iconProps} />, 'bg-amber-500');
    case 'Sparkles':
      return wrapBadge(<Sparkles {...iconProps} />, 'bg-violet-500');
    case 'Zap':
      return wrapBadge(<Zap {...iconProps} />, 'bg-indigo-500');
    case 'Layers':
      return wrapBadge(<Layers {...iconProps} />, 'bg-rose-500');
    case 'FileText':
      return wrapBadge(<FileText {...iconProps} />, 'bg-blue-600');
    case 'PenTool':
      return wrapBadge(<PenTool {...iconProps} />, 'bg-indigo-600');
    case 'UserCheck':
      return wrapBadge(<UserCheck {...iconProps} />, 'bg-amber-600');
    case 'Code':
      return wrapBadge(<Code {...iconProps} />, 'bg-sky-500');
    default:
      return wrapBadge(<ImageIcon {...iconProps} />, 'bg-emerald-500');
  }
};
