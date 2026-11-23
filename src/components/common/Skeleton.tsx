import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-2.5 animate-pulse">
      <div className="h-10 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg w-full" />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-xl bg-white dark:bg-[#181A1E] border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-3">
      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
      <div className="h-7 bg-zinc-200/80 dark:bg-zinc-800/80 rounded w-1/2" />
    </div>
  );
};
