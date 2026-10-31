import React from 'react';

interface HumanLoadingOverlayProps {
  title?: string;
  stage?: string;
  percent?: number;
  accentColor?: 'rose' | 'blue';
}

/**
 * Modern 2D Flat Circular Spinning Loader.
 * Cross-browser guaranteed continuous rotation with live percentage and stage feedback.
 */
export const HumanLoadingOverlay: React.FC<HumanLoadingOverlayProps> = ({
  stage,
  percent,
  accentColor = 'rose',
}) => {
  const isRose = accentColor === 'rose';

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/35 dark:bg-black/55 backdrop-blur-[3px] transition-opacity duration-150 select-none pointer-events-auto p-4"
    >
      <div className="flex flex-col items-center justify-center gap-3 max-w-[280px]">
        {/* Concentric Dual-Ring Circular Spinner */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
          {/* Subtle static track */}
          <div
            className={`absolute inset-0 rounded-full border-[3px] ${
              isRose ? 'border-rose-500/20' : 'border-blue-500/20'
            }`}
          />

          {/* Smooth spinning primary arc */}
          <div
            data-spin="true"
            className={`spin-ring absolute inset-0 rounded-full border-[3px] border-transparent ${
              isRose ? 'border-t-rose-500 border-r-rose-500' : 'border-t-blue-500 border-r-blue-500'
            }`}
          />

          {/* Inner counter-rotating dashed ring */}
          <div
            data-spin="true"
            className={`spin-ring-reverse absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-dashed ${
              isRose ? 'border-rose-400/70' : 'border-blue-400/70'
            }`}
          />

          {/* Center glowing focal point */}
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              isRose ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]'
            }`}
          />
        </div>

        {/* Live Status and Percent Feedback */}
        {(typeof percent === 'number' || stage) && (
          <div className="flex flex-col items-center text-center gap-1">
            {typeof percent === 'number' && percent > 0 && (
              <span className="font-mono text-xs sm:text-sm font-bold text-white bg-black/40 dark:bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 shadow-xs">
                {Math.round(percent)}%
              </span>
            )}
            {stage && (
              <span className="text-[11px] sm:text-xs text-white/90 font-medium tracking-wide drop-shadow-xs truncate max-w-[240px]">
                {stage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Convenient alias for semantic readability
export const Canvas2DSpinner = HumanLoadingOverlay;
