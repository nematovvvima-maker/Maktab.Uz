import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { TableSkeleton } from '../../components/common/Skeleton';
import type { StudentPortalPayload } from '../../types';

export const StudentGradesPage: React.FC = () => {
  const [data, setData] = useState<StudentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'graded' | 'pending'>('all');

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

  const rows = useMemo(() => {
    if (!data) return [];
    const list = data.subjects.map((subject) => ({
      subject,
      score: data.grades[subject] ?? null,
    }));
    if (filter === 'graded') return list.filter((r) => r.score !== null);
    if (filter === 'pending') return list.filter((r) => r.score === null);
    return list;
  }, [data, filter]);

  const counts = useMemo(() => {
    const map = { 5: 0, 4: 0, 3: 0, 2: 0 };
    if (!data) return map;
    Object.values(data.grades).forEach((s) => {
      if (s === 5 || s === 4 || s === 3 || s === 2) map[s] += 1;
    });
    return map;
  }, [data]);

  const scoreLabel = (score: number | null) => {
    if (score === 5) return "A'lo";
    if (score === 4) return 'Yaxshi';
    if (score === 3) return 'Qoniqarli';
    if (score === 2) return 'Qoniqarsiz';
    return 'Baholanmagan';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mening baholarim
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {data ? `${data.student.grade} · O'rtacha ball: ${data.averageGrade.toFixed(2)}` : '...'}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 self-start">
          {(
            [
              { id: 'all', label: 'Barcha fanlar' },
              { id: 'graded', label: 'Baholangan' },
              { id: 'pending', label: 'Kutilmoqda' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-[#0F172A] dark:bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Grade Tally Ledger */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">5 baho (A&apos;lo)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {counts[5]}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">4 baho (Yaxshi)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
            {counts[4]}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">3 baho (Qoniqarli)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {counts[3]}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">2 baho</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            {counts[2]}
          </p>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Fanlar topilmadi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Fan nomi</th>
                  <th className="py-3 px-4">Daraja</th>
                  <th className="py-3 px-4 w-56">Ko&apos;rsatkich</th>
                  <th className="py-3 px-6 text-right">Baho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {rows.map(({ subject, score }) => (
                  <tr
                    key={subject}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-slate-100">
                      {subject}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {scoreLabel(score)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            score === 5
                              ? 'bg-emerald-600'
                              : score === 4
                              ? 'bg-blue-600'
                              : score === 3
                              ? 'bg-amber-500'
                              : score === 2
                              ? 'bg-red-600'
                              : 'bg-transparent'
                          }`}
                          style={{ width: score ? `${(score / 5) * 100}%` : '0%' }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold tabular-nums">
                      {score !== null ? (
                        <span
                          className={
                            score === 5
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : score === 4
                              ? 'text-blue-700 dark:text-blue-400'
                              : score === 3
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {score}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
