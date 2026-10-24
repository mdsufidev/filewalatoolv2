import React from 'react';
import { useTheme } from '../../core/themeContext';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  helperText?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  helperText,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`w-full space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between text-xs">
        <label className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </label>
        <span
          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md border ${
            isDark
              ? 'text-slate-200 bg-slate-900 border-slate-800'
              : 'text-slate-800 bg-slate-100 border-slate-200'
          }`}
        >
          {value}
          {unit}
        </span>
      </div>

      <div className="relative flex items-center h-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          style={{
            background: isDark
              ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #334155 ${percentage}%, #334155 100%)`
              : `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
          }}
        />
      </div>

      {helperText && (
        <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};
