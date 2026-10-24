import React from 'react';
import { CATEGORIES_CONFIG, ToolCategory } from '../../core/toolsData';

interface ToolCategoryFilterProps {
  selectedCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  className?: string;
}

/**
 * Minimalist 2D Flat Category Selector (Notion / Linear inspired)
 * - Structured rectangular tabs with subtle rounded-md corners
 * - 1px solid clean border, flat neutral surfaces
 * - Crisp monochrome active state
 */
export const ToolCategoryFilter: React.FC<ToolCategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  className = '',
}) => {
  return (
    <div className={`w-full flex items-center justify-center overflow-x-auto no-scrollbar py-1 ${className}`}>
      <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-w-max">
        {CATEGORIES_CONFIG.map((cat) => {
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                isActive
                  ? 'bg-white text-zinc-950 font-semibold dark:bg-zinc-800 dark:text-white border border-zinc-200/90 dark:border-zinc-700/80'
                  : 'text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
