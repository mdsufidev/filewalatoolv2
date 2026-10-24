import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../core/themeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-200 cursor-pointer select-none ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-xs'
      } ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-200" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
