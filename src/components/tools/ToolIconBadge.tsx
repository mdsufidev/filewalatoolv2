import React from 'react';
import {
  Crop,
  PenTool,
  Calendar,
  BadgeCheck,
  FileArchive,
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
 * Minimalist 2D Flat Icon Badge (Notion / Linear / Swiss design inspired)
 * - Grounded neutral surface with 1px solid border
 * - Crisp monochrome / subtle tone without neon glows or heavy shadows
 * - Structured rounded-md corners
 */
export const ToolIconBadge: React.FC<ToolIconBadgeProps> = ({
  toolId,
  category,
  iconName,
  className = '',
  size = 'md',
}) => {
  const iconProps = {
    className: size === 'sm' ? 'w-3.5 h-3.5 stroke-[1.8]' : 'w-4 h-4 stroke-[1.8]',
  };

  const badgeSize = size === 'sm' ? 'w-7 h-7 rounded-md' : 'w-9 h-9 rounded-md';

  const wrapBadge = (icon: React.ReactNode) => (
    <div
      className={`${badgeSize} bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-750 text-zinc-750 dark:text-zinc-250 flex items-center justify-center shrink-0 transition-colors duration-150 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 ${className}`}
    >
      {icon}
    </div>
  );

  // Exam & Govt forms
  if (toolId === 'upsc-photo-maker') return wrapBadge(<Calendar {...iconProps} />);
  if (toolId === 'signature-resize' || toolId === 'passport-signature-resize') return wrapBadge(<PenTool {...iconProps} />);
  if (toolId === 'pan-photo-resize' || toolId === 'passport-photo-resize') return wrapBadge(<ImageIcon {...iconProps} />);
  if (toolId === 'ssc-resizer') return wrapBadge(<BadgeCheck {...iconProps} />);
  if (toolId === 'gov-compressor') return wrapBadge(<FileArchive {...iconProps} />);

  // Image Tools
  if (toolId === 'resizer') return wrapBadge(<Maximize2 {...iconProps} />);
  if (toolId === 'cropper') return wrapBadge(<Crop {...iconProps} />);
  if (toolId === 'compressor') return wrapBadge(<Minimize2 {...iconProps} />);
  if (toolId === 'watermark-img') return wrapBadge(<Type {...iconProps} />);
  if (toolId === 'palette-img') return wrapBadge(<Pipette {...iconProps} />);
  if (toolId === 'meme-img') return wrapBadge(<Smile {...iconProps} />);
  if (toolId === 'adjust-img') return wrapBadge(<Sliders {...iconProps} />);
  if (toolId === 'rounded-img') return wrapBadge(<Circle {...iconProps} />);
  if (toolId === 'base64-img') return wrapBadge(<Code {...iconProps} />);
  if (toolId === 'batch-img') return wrapBadge(<Archive {...iconProps} />);

  // PDF Tools
  if (toolId === 'merge-pdf') return wrapBadge(<Layers {...iconProps} />);
  if (toolId === 'split-pdf') return wrapBadge(<Scissors {...iconProps} />);
  if (toolId === 'compress-pdf') return wrapBadge(<Minimize2 {...iconProps} />);
  if (toolId === 'rotate-pdf') return wrapBadge(<RotateCw {...iconProps} />);
  if (toolId === 'pdf-to-word') return wrapBadge(<FileText {...iconProps} />);
  if (toolId === 'pdf-to-jpg') return wrapBadge(<ImageIcon {...iconProps} />);
  if (toolId === 'image-to-pdf') return wrapBadge(<FilePlus {...iconProps} />);
  if (toolId === 'pdf-to-text') return wrapBadge(<Type {...iconProps} />);

  // Converters
  if (
    toolId === 'png-to-webp' ||
    toolId === 'webp-to-jpg' ||
    toolId === 'heic-to-jpg' ||
    toolId === 'jpg-to-png' ||
    category === 'convert'
  ) {
    return wrapBadge(<ArrowRightLeft {...iconProps} />);
  }

  // Fallbacks by iconName
  switch (iconName) {
    case 'Minimize2': return wrapBadge(<Minimize2 {...iconProps} />);
    case 'Maximize2': return wrapBadge(<Maximize2 {...iconProps} />);
    case 'Crop': return wrapBadge(<Crop {...iconProps} />);
    case 'Zap': return wrapBadge(<Zap {...iconProps} />);
    case 'FileText': return wrapBadge(<FileText {...iconProps} />);
    case 'Layers': return wrapBadge(<Layers {...iconProps} />);
    case 'FileArchive': return wrapBadge(<FileArchive {...iconProps} />);
    case 'RotateCw': return wrapBadge(<RotateCw {...iconProps} />);
    case 'Award': return wrapBadge(<BadgeCheck {...iconProps} />);
    case 'UserCheck': return wrapBadge(<UserCheck {...iconProps} />);
    case 'FileBadge': return wrapBadge(<BadgeCheck {...iconProps} />);
    case 'PenTool': return wrapBadge(<PenTool {...iconProps} />);
    case 'Image': return wrapBadge(<ImageIcon {...iconProps} />);
    default: return wrapBadge(<FileText {...iconProps} />);
  }
};
