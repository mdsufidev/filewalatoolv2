import React, { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: { container: 'w-5 h-5 text-[10px]', icon: 'w-3 h-3' },
  sm: { container: 'w-6 h-6 text-xs', icon: 'w-3.5 h-3.5' },
  md: { container: 'w-8 h-8 text-xs font-semibold', icon: 'w-4 h-4' },
  lg: { container: 'w-10 h-10 text-sm font-semibold', icon: 'w-5 h-5' },
  xl: { container: 'w-14 h-14 text-base font-bold', icon: 'w-7 h-7' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const initial = (name.trim().charAt(0) || 'U').toUpperCase();

  // If valid src and not errored, render image with referrerPolicy="no-referrer"
  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${sizeConfig.container} rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-xs ${className}`}
      />
    );
  }

  // Graceful Fallback: Letter initial with neutral styling
  return (
    <div
      className={`${sizeConfig.container} rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold shrink-0 select-none shadow-xs ${className}`}
      title={name}
    >
      {initial ? initial : <User className={`${sizeConfig.icon} text-zinc-500`} />}
    </div>
  );
};
