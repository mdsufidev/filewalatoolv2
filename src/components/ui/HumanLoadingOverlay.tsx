import React from 'react';

interface HumanLoadingOverlayProps {
  title?: string;
  stage?: string;
  percent?: number;
  accentColor?: 'rose' | 'blue';
}

export const HumanLoadingOverlay: React.FC<HumanLoadingOverlayProps> = ({
  title = 'Loading',
  stage,
  percent = 0,
  accentColor = 'rose',
}) => {
  const isRose = accentColor === 'rose';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm p-6 sm:p-7 rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-center shadow-2xl space-y-4">
        {/* Friendly Human Retoucher Character Animation */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          {/* Gentle Ambient Glow behind human character */}
          <div
            className={`absolute inset-2 rounded-full blur-xl opacity-35 animate-pulse ${
              isRose ? 'bg-rose-400' : 'bg-blue-400'
            }`}
          />

          {/* Stylized Human Figure SVG */}
          <svg
            viewBox="0 0 120 120"
            className="w-24 h-24 relative z-10 animate-human-bounce"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Body / Shoulders */}
            <path
              d="M34 105 C34 84, 45 75, 60 75 C75 75, 86 84, 86 105 Z"
              fill="currentColor"
              className="text-zinc-600 dark:text-zinc-400"
            />

            {/* Neck */}
            <rect
              x="55"
              y="61"
              width="10"
              height="15"
              rx="3"
              fill="currentColor"
              className="text-amber-200 dark:text-amber-300/80"
            />

            {/* Head */}
            <circle
              cx="60"
              cy="44"
              r="20"
              fill="currentColor"
              className="text-amber-200 dark:text-amber-300/80"
            />

            {/* Hair */}
            <path
              d="M40 42 C40 26, 52 22, 60 22 C72 22, 80 28, 80 42 C76 36, 70 32, 60 32 C50 32, 44 36, 40 42 Z"
              fill="currentColor"
              className="text-zinc-800 dark:text-zinc-950"
            />

            {/* Friendly Eyes */}
            <circle cx="53" cy="44" r="2.2" fill="#18181b" />
            <circle cx="67" cy="44" r="2.2" fill="#18181b" />

            {/* Friendly Smile */}
            <path
              d="M55 52 Q60 57 65 52"
              stroke="#18181b"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Cheeks */}
            <circle cx="50" cy="48" r="2" fill="#f43f5e" opacity="0.4" />
            <circle cx="70" cy="48" r="2" fill="#f43f5e" opacity="0.4" />

            {/* Magic Stylus / Brush held in hand */}
            <g className="origin-[82px_68px] animate-retoucher-wand">
              <line
                x1="82"
                y1="68"
                x2="104"
                y2="42"
                stroke={isRose ? '#f43f5e' : '#3b82f6'}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle
                cx="104"
                cy="42"
                r="3"
                fill={isRose ? '#fb7185' : '#60a5fa'}
              />
            </g>

            {/* Magical Sparkles */}
            <circle
              cx="106"
              cy="34"
              r="2.5"
              fill={isRose ? '#f43f5e' : '#38bdf8'}
              className="animate-ping"
            />
            <circle
              cx="32"
              cy="48"
              r="1.8"
              fill={isRose ? '#fb7185' : '#60a5fa'}
              className="animate-pulse"
            />
            <circle
              cx="38"
              cy="22"
              r="2"
              fill={isRose ? '#f43f5e' : '#38bdf8'}
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Loading ..... Typography with animated bouncing dots wave */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            <span>{title}</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-xl font-extrabold ml-1 ${
                isRose ? 'text-rose-500' : 'text-blue-500'
              }`}
              aria-label="Loading dots"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="inline-block animate-dot-hop"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  .
                </span>
              ))}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {stage || (isRose ? 'Retouching & enhancing photo...' : 'Cutting out background cleanly...')}
          </p>
        </div>

        {/* Clean, simple progress bar with active glossy shimmer */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 relative">
            <div
              className={`h-full rounded-full transition-all duration-150 ease-out relative overflow-hidden ${
                isRose
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${Math.max(6, Math.min(100, percent))}%` }}
            >
              {/* Subtle fast gloss streak traveling across the active bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-gloss-shimmer" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Processing</span>
            <span className="font-bold text-zinc-600 dark:text-zinc-300">{Math.round(percent)}%</span>
          </div>
        </div>

        {/* Client-side privacy guarantee */}
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono pt-1">
          100% In-Browser · Private &amp; Fast · Zero Uploads
        </p>
      </div>
    </div>
  );
};
