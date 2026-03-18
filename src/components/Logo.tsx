import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ className, collapsed, variant = 'dark' }) => {
  const isLight = variant === 'light';
  const mainColor = isLight ? 'black' : 'white';
  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const subTextColor = isLight ? 'text-blue-600' : 'text-blue-400';
  const lineColor = isLight ? 'bg-blue-200' : 'bg-blue-500/50';

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          {/* Outer Ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="url(#ringGradient)" 
            strokeWidth="4" 
            className="animate-pulse"
          />
          {/* Stylized N */}
          <path 
            d="M35 70V30L65 70V30" 
            fill="none" 
            stroke={mainColor} 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          {/* Outer Ring with Glow effect */}
          <circle 
            cx="50" 
            cy="50" 
            r="42" 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="3" 
            className="opacity-50"
          />
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="url(#ringGradient)" 
            strokeWidth="4" 
          />
          {/* Stylized N */}
          <path 
            d="M35 70V30L65 70V30" 
            fill="none" 
            stroke={mainColor} 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`text-2xl font-black tracking-tighter ${textColor} leading-none`}>NORB</span>
        <div className="flex items-center">
          <div className={`h-[1px] flex-1 ${lineColor}`}></div>
          <span className={`text-[9px] font-bold tracking-[0.15em] ${subTextColor} px-2 uppercase whitespace-nowrap`}>Gestão Pro</span>
          <div className={`h-[1px] flex-1 ${lineColor}`}></div>
        </div>
      </div>
    </div>
  );
};
