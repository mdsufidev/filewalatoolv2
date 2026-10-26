import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ToolItem } from '../../core/toolsData';
import { ToolIconBadge } from './ToolIconBadge';
import { useLanguage } from '../../core/languageContext';
import { getToolRouteUrl } from '../../core/urlRoutes';

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
 * Practical, Human-Crafted Tool Card
 * - Semantic anchor tag with canonical route destination
 * - Solid 1px neutral border with subtle hover feedback
 * - Restrained typography and zero floating/gradient effects
 * - High density and clean vertical alignment
 */
export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  onLaunch,
  title,
  description,
}) => {
  const { language } = useLanguage();
  const href = getToolRouteUrl(tool.actionSection, tool.subToolId);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Preserve default browser behavior for modifier keys or middle click (open in new tab/window)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onLaunch(tool.actionSection, tool.subToolId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      onLaunch(tool.actionSection, tool.subToolId);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${title}`}
      className="group flex flex-col justify-between p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer min-h-[140px] select-none text-left no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100"
    >
      <div>
        {/* Top Header: Signature Red Icon + Optional subtle Badge */}
        <div className="flex items-start justify-between gap-2">
          <ToolIconBadge
            toolId={tool.id}
            category={tool.category}
            iconName={tool.icon}
          />

          {tool.badge && (
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800 shrink-0">
              {tool.badge}
            </span>
          )}
        </div>

        {/* Tool Name */}
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mt-3 group-hover:text-[#E11D2A] transition-colors">
          {title}
        </h3>

        {/* Short, readable description matching wireframe */}
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2 font-normal">
          {description}
        </p>
      </div>
    </a>
  );
};
