import React from 'react';

interface MaktabLogoProps {
  compact?: boolean;
  className?: string;
}

export const MaktabLogo: React.FC<MaktabLogoProps> = ({ compact = false, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={compact ? 28 : 32}
        height={compact ? 28 : 32}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="36" height="36" rx="9" fill="#1D4ED8" />
        <path
          d="M9.5 24.5V12.2C9.5 11.54 10.04 11 10.7 11H12.9C13.38 11 13.81 11.28 14.01 11.72L18 20.1L21.99 11.72C22.19 11.28 22.62 11 23.1 11H25.3C25.96 11 26.5 11.54 26.5 12.2V24.5"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.2 25.5H20.8"
          stroke="#93C5FD"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>

      <span className="font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-none text-[19px]">
        Maktab<span className="text-[#2563EB] dark:text-blue-400">.Uz</span>
      </span>
    </span>
  );
};
