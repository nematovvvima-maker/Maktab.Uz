import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { api } from '../../services/api';
import { TableSkeleton } from '../../components/common/Skeleton';
import type { StudentPortalPayload } from '../../types';

export const StudentLeaderboardPage: React.FC = () => {
  const [data, setData] = useState<StudentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'class' | 'school'>('class');

  useEffect(() => {
    let active = true;
    api
      .getStudentDashboard()
      .then((res) => {
        if (active) setData(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = !data ? [] : scope === 'class' ? data.classLeaderboard : data.schoolLeaderboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reyting jadvali
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {data
              ? `Sinfingizda #${data.classRank}-o'rin · Maktab bo'yicha #${data.schoolRank}-o'rin`
              : '...'}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setScope('class')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              scope === 'class'
                ? 'bg-[#0F172A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Mening sinfim ({data?.student.grade || '...'})
          </button>
          <button
            type="button"
            onClick={() => setScope('school')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              scope === 'school'
                ? 'bg-[#0F172A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Butun maktab
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">O&apos;rin</th>
                  <th className="py-3 px-4">O&apos;quvchi</th>
                  <th className="py-3 px-4">Sinf</th>
                  <th className="py-3 px-4 text-right">Baholar soni</th>
                  <th className="py-3 px-6 text-right">O&apos;rtacha ball</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {rows.map((entry) => (
                  <tr
                    key={entry.id}
                    className={
                      entry.isCurrentStudent
                        ? 'bg-blue-50/80 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors'
                    }
                  >
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        #{entry.rank}
                        {entry.rank === 1 && <Award className="w-4 h-4 text-amber-600" />}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          entry.isCurrentStudent
                            ? 'font-bold text-blue-800 dark:text-blue-300'
                            : 'font-medium text-slate-900 dark:text-slate-100'
                        }
                      >
                        {entry.firstName} {entry.lastName}
                      </span>
                      {entry.isCurrentStudent && (
                        <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          (Siz)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {entry.grade}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      {entry.totalGradesCount}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                      {entry.averageGrade.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
