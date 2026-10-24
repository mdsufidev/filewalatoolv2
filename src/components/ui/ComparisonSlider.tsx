import React, { useState, useRef, useCallback } from 'react';
import { useTheme } from '../../core/themeContext';

interface ComparisonSliderProps {
  originalSrc: string;
  processedSrc: string;
  originalLabel?: string;
  processedLabel?: string;
  className?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  originalSrc,
  processedSrc,
  originalLabel = 'Original',
  processedLabel = 'Compressed',
  className = '',
}) => {
  const [position, setPosition] = useState<number>(50); // percentage 0-100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const percent = (clampedX / rect.width) * 100;
    setPosition(percent);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-2xl border transition-colors aspect-auto flex items-center justify-center cursor-ew-resize ${
        isDark
          ? 'border-slate-800 bg-slate-950/60'
          : 'border-slate-200 bg-slate-100/70 shadow-inner'
      } ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Background / Compressed Image */}
      <img
        src={processedSrc}
        alt={processedLabel}
        className="w-full h-auto max-h-[500px] object-contain block mx-auto pointer-events-none"
      />

      {/* Foreground / Original Image (Clipped) */}
      <div
        className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none"
        style={{ width: `${position}%` }}
      >
        <img
          src={originalSrc}
          alt={originalLabel}
          className="w-full h-auto max-h-[500px] object-contain block pointer-events-none"
          style={{
            width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
            maxWidth: 'none',
          }}
        />
      </div>

      {/* Divider Line & Drag Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 shadow-md z-10 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-300 flex items-center justify-center text-slate-700 pointer-events-auto cursor-ew-resize hover:scale-105 active:scale-95 transition-transform">
          <svg className="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm border ${
            isDark
              ? 'text-white bg-slate-900/85 border-slate-800'
              : 'text-slate-800 bg-white/95 border-slate-200'
          }`}
        >
          {originalLabel}
        </span>
      </div>
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm border ${
            isDark
              ? 'text-white bg-slate-900/85 border-slate-800'
              : 'text-slate-800 bg-white/95 border-slate-200'
          }`}
        >
          {processedLabel}
        </span>
      </div>
    </div>
  );
};
