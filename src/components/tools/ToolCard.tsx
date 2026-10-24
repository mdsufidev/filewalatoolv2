import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ToolItem } from '../../core/toolsData';
import { ToolIconBadge } from './ToolIconBadge';
import { useLanguage } from '../../core/languageContext';

interface ToolCardProps {
  tool: ToolItem;
  onLaunch: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  title: string;
  description: string;
}

/**
 * Minimalist 2D Flat Tool Card (Notion / Linear / Swiss design inspired)
 * - Flat solid surface with 1px clean border
 * - Structured rounded-lg corners (no 3D depth, no heavy shadows)
 * - Fast subtle hover feedback (150ms border & surface tint)
 * - Crisp, high-contrast typography
 */
export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  onLaunch,
  title,
  description,
}) => {
  const { language } = useLanguage();

  const handleClick = () => {
    onLaunch(tool.actionSection, tool.subToolId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open ${title}`}
      className="group relative flex flex-col justify-between p-4.5 sm:p-5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors duration-150 cursor-pointer min-h-[210px] sm:min-h-[220px] select-none text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
    >
      <div>
        {/* Top Header: Neutral 2D Icon at top-left + Minimalist Badge */}
        <div className="flex items-start justify-between gap-2">
          <ToolIconBadge
            toolId={tool.id}
            category={tool.category}
            iconName={tool.icon}
          />

          {tool.badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
              {tool.badge}
            </span>
          )}
        </div>

        {/* Tool Name beneath icon */}
        <h3 className="text-[15px] sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug mt-3">
          {title}
        </h3>

        {/* Short, muted description */}
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal line-clamp-3">
          {description}
        </p>
      </div>

      {/* Subtle 2D Action indicator */}
      <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors duration-150">
        <span>{language === 'hi' ? 'खोलें' : 'Open'}</span>
        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors duration-150" />
      </div>
    </div>
  );
};
