import React, { useState } from 'react';
import { getInitials } from '../../utils/timeUtils';

export default function InitialsAvatar({ 
  photoUrl, 
  firstName = '', 
  lastName = '', 
  size = 'md', // 'sm' (10/40px), 'md' (12/48px), 'lg' (16/64px), 'xl' (28/112px), 'card' (32/128px)
  className = '' 
}) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-16 h-16 text-xl rounded-2xl',
    xl: 'w-28 h-28 text-3xl rounded-2xl',
    card: 'w-[100px] h-[100px] text-3xl rounded-2xl'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  if (photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        onError={() => setImageError(true)}
        className={`${currentSizeClass} object-cover border border-slate-700/80 shadow-md ${className}`}
      />
    );
  }

  // Initials badge fallback
  return (
    <div 
      className={`${currentSizeClass} bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center border border-white/20 shadow-md uppercase tracking-wider shrink-0 select-none ${className}`}
      title={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
