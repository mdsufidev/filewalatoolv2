import React, { useState, useRef, useCallback } from 'react';
import { useTheme } from '../../core/themeContext';

interface ComparisonSliderProps {
  originalSrc: string;
  processedSrc: string;
  originalLabel?: string;
  processedLabel?: string;
  className?: string;
  maxHeightClass?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  originalSrc,
  processedSrc,
  originalLabel = 'Original',
  processedLabel = 'Compressed',
  className = '',
  maxHeightClass,
}) => {
  const [position, setPosition] = useState<number>(50); // percentage 0-100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    const clampedPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(clampedPercent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Strip w-full from incoming className so the slider container shrink-wraps to the exact image dimensions
  const cleanClassName = className.replace(/\bw-full\b/g, '').trim();

  return (
    <div className="w-full h-full flex items-center justify-center p-1 select-none">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative inline-block max-w-full overflow-hidden rounded-2xl border transition-colors cursor-ew-resize select-none shadow-xl ${
          isDark
            ? 'border-zinc-800 bg-zinc-950/80 shadow-black/50'
            : 'border-zinc-200 bg-zinc-100/90 shadow-zinc-300/40'
        } ${cleanClassName}`}
        style={{ touchAction: 'none' }}
      >
        {/* Base Image (Processed / Enhanced) - Drives natural container height & width */}
        <img
          src={processedSrc}
          alt={processedLabel}
          draggable={false}
          className={`block ${maxHeightClass || 'max-h-[500px]'} w-auto max-w-full object-contain pointer-events-none select-none mx-auto`}
        />

        {/* Foreground Image (Original) - 100% matched in size, clipped via CSS clip-path */}
        <img
          src={originalSrc}
          alt={originalLabel}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none mx-auto"
          style={{
            clipPath: `inset(0 ${100 - position}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        />

        {/* Vertical Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_8px_rgba(0,0,0,0.7)] z-20 pointer-events-none"
          style={{ left: `${position}%` }}
        >
          {/* Circular Drag Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-800 pointer-events-none hover:scale-105 active:scale-95 transition-transform">
            <svg className="w-4 h-4 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <span
            className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider backdrop-blur-md px-2.5 py-1 rounded-md shadow-sm border ${
              isDark
                ? 'text-white bg-zinc-900/85 border-zinc-700'
                : 'text-zinc-900 bg-white/95 border-zinc-300'
            }`}
          >
            {originalLabel}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
          <span
            className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider backdrop-blur-md px-2.5 py-1 rounded-md shadow-sm border ${
              isDark
                ? 'text-white bg-zinc-900/85 border-zinc-700'
                : 'text-zinc-900 bg-white/95 border-zinc-300'
            }`}
          >
            {processedLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
