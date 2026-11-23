import React from 'react';
import { MaktabLogo } from './MaktabLogo';

interface AppLoaderProps {
  message?: string;
  compact?: boolean;
  fullScreen?: boolean;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  message = 'Yuklanmoqda...',
  compact = false,
  fullScreen = true,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        fullScreen ? 'min-h-screen' : 'min-h-[260px]'
      } w-full bg-[#F8FAFC] dark:bg-[#0B1120] flex flex-col items-center justify-center p-6`}
    >
      <div className="flex flex-col items-center gap-5">
        {!compact && <MaktabLogo compact />}

        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#2563EB] border-r-[#2563EB]/40 animate-spin" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
        </div>

        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
          {message}
        </p>
      </div>
    </div>
  );
};
