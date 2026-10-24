import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../core/themeContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Minimalist 2D Button (Swiss / Linear / Notion style)
 * - Flat surfaces with solid 1px border
 * - Structured rounded-md corners
 * - Zero drop-shadows or scale springs
 * - Fast 150ms hover state
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const variantStyles = isDark
    ? {
        primary:
          'bg-zinc-100 text-zinc-900 hover:bg-white border border-zinc-200 font-semibold',
        secondary:
          'bg-zinc-850 text-zinc-200 hover:bg-zinc-800 border border-zinc-750',
        outline:
          'bg-transparent text-zinc-200 border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700',
        ghost:
          'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent',
        danger:
          'bg-red-600 text-white hover:bg-red-700 border border-red-600',
      }
    : {
        primary:
          'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-900 font-semibold',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200',
        outline:
          'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400',
        ghost:
          'bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent',
        danger:
          'bg-red-600 text-white hover:bg-red-700 border border-red-600',
      };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-3.5 py-2 h-9 gap-2',
    lg: 'text-sm px-5 py-2.5 h-10 gap-2 font-medium',
    xl: 'text-base px-6 py-3 h-11 gap-2.5 font-medium',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
