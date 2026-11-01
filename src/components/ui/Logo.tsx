import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  allowCustomUpload?: boolean;
}

/**
 * FileWalaTool Official Logo Icon
 * Renders the crisp multi-resolution official brand emblem
 */
export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  return (
    <picture className="shrink-0 inline-flex items-center">
      <source srcSet="/favicon-96x96.webp?v=11" type="image/webp" />
      <img
        src="/favicon-96x96.png?v=11"
        width={size}
        height={size}
        alt="FileWalaTool Logo"
        draggable={false}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`shrink-0 object-contain select-none ${className}`}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/logo.png?v=11";
        }}
      />
    </picture>
  );
};

/**
 * FileWalaTool Official Logo Component
 * - Supports custom user logo from localStorage if uploaded
 * - Fallbacks to official multi-resolution brand emblem
 * - Optional inline wordmark
 */
export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 96,
  showText = false,
}) => {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for user-provided custom logo
    const stored = localStorage.getItem('filewala_custom_logo');
    if (stored) {
      setCustomLogo(stored);
    }

    const handleUpdate = () => {
      const updated = localStorage.getItem('filewala_custom_logo');
      setCustomLogo(updated);
    };

    window.addEventListener('filewala_logo_updated', handleUpdate);
    return () => window.removeEventListener('filewala_logo_updated', handleUpdate);
  }, []);

  const logoRender = customLogo ? (
    <img
      src={customLogo}
      alt="FileWalaTool Logo"
      width={size}
      height={size}
      draggable={false}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`shrink-0 object-contain select-none ${className}`}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/logo.png?v=11";
      }}
    />
  ) : (
    <picture className={`shrink-0 inline-flex items-center ${className}`}>
      <source srcSet="/web-app-manifest-192x192.webp?v=11" type="image/webp" />
      <img
        src="/web-app-manifest-192x192.png?v=11"
        alt="FileWalaTool Logo"
        width={size}
        height={size}
        draggable={false}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="shrink-0 object-contain select-none"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/logo.png?v=11";
        }}
      />
    </picture>
  );

  if (showText) {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        {logoRender}
        <span className="inline-flex items-baseline gap-1 select-none leading-none">
          <span className="font-brand-filewala text-[#7ED957] font-extrabold text-xl tracking-tight">FileWala</span>
          <span className="font-brand-tool text-[#FF3131] font-black text-xl tracking-normal">TOOL</span>
        </span>
      </div>
    );
  }

  return logoRender;
};

/**
 * Utility function to set or clear custom logo in localStorage
 */
export const setAppLogo = (dataUrl: string | null) => {
  if (dataUrl) {
    localStorage.setItem('filewala_custom_logo', dataUrl);
  } else {
    localStorage.removeItem('filewala_custom_logo');
  }
  window.dispatchEvent(new Event('filewala_logo_updated'));
};
