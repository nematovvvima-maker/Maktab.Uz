import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, CheckCheck, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { getAllowedGrades } from '../utils/adminScope';
import { TableSkeleton } from '../components/common/Skeleton';
import type { AttendanceData, AttendanceStatus, Student } from '../types';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);

  const initialGradeParam = searchParams.get('grade');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData>({});
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState(
    initialGradeParam && allowedGrades.includes(initialGradeParam) ? initialGradeParam : 'all'
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sRes, aRes] = await Promise.all([api.getStudents(), api.getAttendance()]);
        if (!active) return;
        setStudents(sRes.students);
        setAttendance(aRes.attendance);
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

  const visibleStudents = useMemo(
    () => (selectedClass === 'all' ? students : students.filter((s) => s.grade === selectedClass)),
    [students, selectedClass]
  );

  const dayMap = attendance[selectedDate] || {};

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    visibleStudents.forEach((s) => {
      const st = dayMap[s.id];
      if (st === 'present') present += 1;
      else if (st === 'absent') absent += 1;
    });
    const pct =
      visibleStudents.length > 0 ? Math.round((present / visibleStudents.length) * 100) : 0;
    return { present, absent, pct };
  }, [visibleStudents, dayMap]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [studentId]: status,
      },
    }));
  };

  const markAllPresent = () => {
    const nextDay: Record<string, AttendanceStatus> = { ...(attendance[selectedDate] || {}) };
    visibleStudents.forEach((s) => {
      nextDay[s.id] = 'present';
    });
    setAttendance((prev) => ({ ...prev, [selectedDate]: nextDay }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveAttendance(selectedDate, attendance[selectedDate] || {});
      showToast(t('attendanceSaved'), 'success');
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
            {t('attendance')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {selectedDate} · {summary.present} {t('present').toLowerCase()} · {summary.absent}{' '}
            {t('absent').toLowerCase()} ({summary.pct}%)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={markAllPresent}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{t('markAllPresent')}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{saving ? t('loading') : t('save')}</span>
          </button>
        </div>
      </div>

      {/* Filters + Progress Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto min-h-[42px] px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full sm:w-auto min-h-[42px] px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">{t('allClasses')}</option>
            {allowedGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 sm:min-w-[200px]">
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
              style={{ width: `${summary.pct}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {summary.pct}%
          </span>
        </div>
      </div>

      {/* Attendance List: Mobile Cards + Desktop Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 sm:p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="py-14 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('noData')}
          </div>
        ) : (
          <>
            {/* Mobile Touch Attendance Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {visibleStudents.map((student) => {
                const status = dayMap[student.id];
                return (
                  <div key={student.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {student.grade} ·{' '}
                          <span className="font-mono tabular-nums">{student.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, 'present')}
                        className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-[#F8FAFC] dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{t('present')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, 'absent')}
                        className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                          status === 'absent'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-[#F8FAFC] dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{t('absent')}</span>
                      </button>
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
                    <th className="py-3 px-4">{t('gradeClass')}</th>
                    <th className="py-3 px-6 text-right">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {visibleStudents.map((student) => {
                    const status = dayMap[student.id];
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-6 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {student.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {student.grade}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setStatus(student.id, 'present')}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                                status === 'present'
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('present')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus(student.id, 'absent')}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                                status === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{t('absent')}</span>
                            </button>
                          </div>
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
