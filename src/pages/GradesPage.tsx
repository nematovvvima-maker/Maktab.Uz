import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api } from '../services/api';
import { getSubjectsForGrade } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { getAllowedGrades } from '../utils/adminScope';
import { TableSkeleton } from '../components/common/Skeleton';
import type { GradeValue, Student, StudentGrades } from '../types';

const SCORE_OPTIONS: GradeValue[] = [2, 3, 4, 5];

export const GradesPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);

  const initialGradeParam = searchParams.get('grade');
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<StudentGrades>({});
  const [selectedClass, setSelectedClass] = useState(
    initialGradeParam && allowedGrades.includes(initialGradeParam)
      ? initialGradeParam
      : allowedGrades[0] || ''
  );
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (allowedGrades.length > 0 && !allowedGrades.includes(selectedClass)) {
      setSelectedClass(allowedGrades[0]);
    }
  }, [allowedGrades, selectedClass]);

  const subjects = useMemo(
    () => (selectedClass ? getSubjectsForGrade(selectedClass) : []),
    [selectedClass]
  );

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sRes, gRes] = await Promise.all([api.getStudents(), api.getGrades()]);
        if (!active) return;
        setStudents(sRes.students);
        setGrades(gRes.grades);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Yuklashda xatolik', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const classStudents = useMemo(
    () => students.filter((s) => s.grade === selectedClass),
    [students, selectedClass]
  );

  const setStudentScore = (studentId: string, score: GradeValue) => {
    if (!selectedSubject) return;
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [selectedSubject]: score,
      },
    }));
  };

  const getStudentAverage = (studentId: string): string => {
    const map = grades[studentId];
    if (!map) return '—';
    const vals: number[] = Object.values(map);
    if (vals.length === 0) return '—';
    const avg = vals.reduce((acc, v) => acc + v, 0) / vals.length;
    return avg.toFixed(2);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveGrades(grades, `${selectedClass} · ${selectedSubject}`);
      showToast(t('gradesSaved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3.5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('grades')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('selectClassForGrades')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || classStudents.length === 0}
          className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? t('loading') : t('save')}</span>
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('gradeClass')}
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={allowedGrades.length === 0}
            className="w-full sm:w-44 min-h-[42px] px-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
          >
            {allowedGrades.length === 0 ? (
              <option value="">Sinf biriktirilmagan</option>
            ) : (
              allowedGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1 flex-1 sm:max-w-xs">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('subject')}
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
          >
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gradebook: Mobile Cards + Desktop Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 sm:p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : classStudents.length === 0 ? (
          <div className="py-14 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('noStudentsInClass')}
          </div>
        ) : (
          <>
            {/* Mobile Touch Grade Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {classStudents.map((student) => {
                const current = grades[student.id]?.[selectedSubject];
                return (
                  <div key={student.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400 tabular-nums mt-0.5">
                          {student.id} · {selectedSubject}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-bold text-[#1D4ED8] dark:text-blue-400 tabular-nums">
                          {getStudentAverage(student.id)}
                        </p>
                        <p className="text-[10px] text-slate-400">{t('averageScore')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {SCORE_OPTIONS.map((score) => {
                        const active = current === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setStudentScore(student.id, score)}
                            className={`h-11 rounded-lg font-mono text-base font-bold transition-colors tabular-nums border ${
                              active
                                ? score === 5
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : score === 4
                                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                  : score === 3
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-red-600 text-white border-red-600'
                                : 'bg-[#F8FAFC] dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">{t('id')}</th>
                    <th className="py-3 px-4">{t('fullName')}</th>
                    <th className="py-3 px-4">
                      {selectedSubject} ({t('selectGrade')})
                    </th>
                    <th className="py-3 px-6 text-right">{t('averageScore')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {classStudents.map((student) => {
                    const current = grades[student.id]?.[selectedSubject];
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {student.id}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5">
                            {SCORE_OPTIONS.map((score) => {
                              const active = current === score;
                              return (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => setStudentScore(student.id, score)}
                                  className={`w-9 h-9 rounded-lg font-mono text-sm font-semibold transition-colors tabular-nums border ${
                                    active
                                      ? score === 5
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : score === 4
                                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                        : score === 3
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-red-600 text-white border-red-600'
                                      : 'bg-[#F8FAFC] dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                  }`}
                                >
                                  {score}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {getStudentAverage(student.id)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
