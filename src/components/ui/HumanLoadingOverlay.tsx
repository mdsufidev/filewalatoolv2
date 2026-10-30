import React from 'react';

interface HumanLoadingOverlayProps {
  title?: string;
  stage?: string;
  percent?: number;
  accentColor?: 'rose' | 'blue';
}

/**
 * Clean, modern 2D flat circular spinning loader.
 * Completely textless, lightweight, and perfectly centered across the canvas viewport.
 */
export const HumanLoadingOverlay: React.FC<HumanLoadingOverlayProps> = ({
  accentColor = 'rose',
}) => {
  const isRose = accentColor === 'rose';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/25 dark:bg-black/45 backdrop-blur-[2px] transition-opacity duration-150 select-none pointer-events-auto">
      <div className="relative flex items-center justify-center">
        {/* Main 2D Flat Rotating Spinner Ring */}
        <svg
          className={`w-14 h-14 sm:w-16 sm:h-16 animate-spin ${
            isRose ? 'text-rose-500' : 'text-blue-500'
          }`}
          viewBox="0 0 50 50"
          fill="none"
          role="status"
          aria-label="Loading..."
        >
          {/* Subtle 2D flat track ring */}
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
            strokeWidth="3.5"
            className="opacity-20"
          />
          {/* 2D Flat spinning stroke arc */}
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="85 125"
          />
        </svg>

        {/* Inner concentric counter-spinning 2D dashed ring */}
        <div
          className={`absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-dashed ${
            isRose ? 'border-rose-400/60' : 'border-blue-400/60'
          } animate-[spin_2.5s_linear_infinite_reverse]`}></div>
      </div>
    </div>
  );
};

// Convenient alias for semantic readability
export const Canvas2DSpinner = HumanLoadingOverlay;
