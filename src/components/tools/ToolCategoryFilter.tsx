import React from 'react';
import { CATEGORIES_CONFIG, ToolCategory } from '../../core/toolsData';
import { getCategoryRouteUrl } from '../../core/urlRoutes';

interface ToolCategoryFilterProps {
  selectedCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  className?: string;
}

/**
 * Responsive Category Filter Pills
 * - Mobile: Clean centered multi-row wrapped pills (matching Reference Image 1)
 * - PC / Desktop: Centered single horizontal row of rounded pills (matching Reference Image 2)
 * - Active pill: Solid dark pill with high contrast
 * - Inactive pills: Clean white/surface pill with subtle border
 * - Semantic <a> tags with canonical category route for search crawlers & middle-click
 */
export const ToolCategoryFilter: React.FC<ToolCategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  className = '',
}) => {
  return (
    <div className={`w-full flex items-center justify-center py-1 sm:py-2 ${className}`}>
      <nav
        className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 sm:gap-2.5 max-w-full px-2 select-none"
        aria-label="Tool Categories"
      >
        {CATEGORIES_CONFIG.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const href = cat.id === 'all' ? '/' : getCategoryRouteUrl(cat.id);

          return (
            <a
              key={cat.id}
              href={href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                onSelectCategory(cat.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-150 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 shadow-xs no-underline ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold border border-zinc-900 dark:border-zinc-100'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <span>{cat.name}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};
