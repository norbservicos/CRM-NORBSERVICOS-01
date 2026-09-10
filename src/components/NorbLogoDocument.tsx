import React from 'react';

interface NorbLogoDocumentProps {
  customLogoUrl?: string | null;
  className?: string;
}

export const NorbLogoDocument: React.FC<NorbLogoDocumentProps> = ({ customLogoUrl, className = '' }) => {
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt="Norb Serviços"
        className={`h-16 w-auto object-contain ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 3D Cyan Orbital Ring + Sphere with N */}
      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#bae6fd" />
              <stop offset="85%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#075985" />
            </radialGradient>
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0284c7" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Elliptical Orbit Ring Back */}
          <ellipse
            cx="60"
            cy="60"
            rx="54"
            ry="24"
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="5.5"
            transform="rotate(-28 60 60)"
            strokeDasharray="180 80"
          />

          {/* Core Sphere / Disc */}
          <circle
            cx="60"
            cy="60"
            r="32"
            fill="url(#sphereGrad)"
            filter="url(#cyanGlow)"
          />

          {/* Futuristic Letter N */}
          <path
            d="M48 76 L48 44 L72 76 L72 44"
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Orbit Ring Front Section (Overlapping) */}
          <ellipse
            cx="60"
            cy="60"
            rx="54"
            ry="24"
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="6"
            transform="rotate(-28 60 60)"
            strokeDashoffset="120"
            strokeDasharray="130 160"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <span
          className="text-2xl font-black tracking-tight leading-none text-slate-900"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          NORB
        </span>
        <div className="flex items-center gap-1 mt-1">
          <div className="h-[1.5px] w-4 bg-sky-500 rounded-full" />
          <span className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase whitespace-nowrap">
            SERVIÇOS
          </span>
          <div className="h-[1.5px] w-4 bg-sky-500 rounded-full" />
        </div>
      </div>
    </div>
  );
};
