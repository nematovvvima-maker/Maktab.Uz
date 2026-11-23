import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { api } from '../../services/api';
import { TableSkeleton } from '../../components/common/Skeleton';
import type { StudentPortalPayload } from '../../types';

export const StudentAttendancePage: React.FC = () => {
  const [data, setData] = useState<StudentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mening davomatim
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Darslarga qatnashish tarixi va umumiy davomat ko&apos;rsatkichi
        </p>
      </div>

      {/* Attendance Summary Strip */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Umumiy davomat</p>
            <p className="mt-1 font-mono text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
              {data.attendanceRate}%
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Kelgan kunlar</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {data.presentCount}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Qoldirilgan kunlar</p>
            <p className="mt-1 font-mono text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
              {data.absentCount}
            </p>
          </div>
        </div>
      )}

      {/* Chronological Ledger */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : !data || data.attendanceHistory.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">
            Hozircha davomat yozuvlari kiritilmagan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.attendanceHistory.map((item) => (
              <div
                key={item.date}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                    {item.date}
                  </span>
                </div>

                {item.status === 'present' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kelgan</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span>Kelmagan</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
