import React, { useEffect, useState, useMemo } from 'react';
import { Award } from 'lucide-react';
import { api } from '../services/api';
import { DEFAULT_SCHOOL, formatClassCode } from '../data/regionsCatalog';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getAllowedGrades } from '../utils/adminScope';
import { TableSkeleton } from '../components/common/Skeleton';
import type { Student, StudentGrades, StudentRating } from '../types';

export const RatingPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<StudentGrades>({});
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sRes, gRes] = await Promise.all([api.getStudents(), api.getGrades()]);
        if (!active) return;
        setStudents(sRes.students);
        setGrades(gRes.grades);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const rankings: StudentRating[] = useMemo(() => {
    const filtered =
      classFilter === 'all' ? students : students.filter((s) => s.grade === classFilter);

    const list = filtered.map((student) => {
      const subjectMap = grades[student.id] || {};
      const values: number[] = Object.values(subjectMap);
      const averageGrade =
        values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return {
        rank: 0,
        student,
        averageGrade,
        totalGradesCount: values.length,
      };
    });

    list.sort((a, b) => {
      if (b.averageGrade !== a.averageGrade) return b.averageGrade - a.averageGrade;
      return b.totalGradesCount - a.totalGradesCount;
    });

    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [students, grades, classFilter]);

  const topThree = rankings.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('rating')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('topStudents')}</p>
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-600 self-start sm:self-auto"
        >
          <option value="all">{t('allClasses')}</option>
          {allowedGrades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Top 3 Editorial Highlight Strip */}
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((entry) => (
            <div
              key={entry.student.id}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                  #{entry.rank} {t('rank')}
                </span>
                <span className="truncate">
                  {entry.student.school || DEFAULT_SCHOOL} ·{' '}
                  {formatClassCode(entry.student.grade, entry.student.classLetter)}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
                  {entry.student.firstName} {entry.student.lastName}
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {entry.student.id} · {entry.student.login} · {entry.totalGradesCount}{' '}
                  {t('totalGrades').toLowerCase()}
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('averageScore')}
                </span>
                <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {entry.averageGrade.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : rankings.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">{t('noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">{t('rank')}</th>
                  <th className="py-3 px-4">{t('fullName')}</th>
                  <th className="py-3 px-4">{t('gradeClass')}</th>
                  <th className="py-3 px-4 text-right">{t('totalGrades')}</th>
                  <th className="py-3 px-6 text-right">{t('averageScore')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {rankings.map((item) => (
                  <tr
                    key={item.student.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-6 font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      #{item.rank}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {item.student.firstName} {item.student.lastName}
                      </span>
                      <span className="ml-2 font-mono text-xs text-slate-400">
                        {item.student.login}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.student.school || DEFAULT_SCHOOL} ·{' '}
                      {formatClassCode(item.student.grade, item.student.classLetter)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      {item.totalGradesCount}
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                      {item.averageGrade.toFixed(2)}
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
