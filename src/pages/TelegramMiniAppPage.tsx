import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  Award,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { AppLoader } from '../components/common/AppLoader';
import type { TelegramParentPayload } from '../types';

type AppTab = 'grades' | 'diary' | 'homework' | 'attendance';

interface TelegramWebAppWindow extends Window {
  Telegram?: {
    WebApp?: {
      ready?: () => void;
      expand?: () => void;
      setHeaderColor?: (color: string) => void;
      setBackgroundColor?: (color: string) => void;
    };
  };
}

function getGradeMeta(score: number): { label: string; textClass: string; barClass: string } {
  if (score === 5) {
    return {
      label: "A'lo",
      textClass: 'text-emerald-700 dark:text-emerald-400',
      barClass: 'bg-emerald-600',
    };
  }
  if (score === 4) {
    return {
      label: 'Yaxshi',
      textClass: 'text-[#1D4ED8] dark:text-blue-400',
      barClass: 'bg-[#2563EB]',
    };
  }
  if (score === 3) {
    return {
      label: 'Qoniqarli',
      textClass: 'text-amber-700 dark:text-amber-400',
      barClass: 'bg-amber-500',
    };
  }
  return {
    label: 'Qoniqarsiz',
    textClass: 'text-red-600 dark:text-red-400',
    barClass: 'bg-red-600',
  };
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName[0] || '').toUpperCase()}${(lastName[0] || '').toUpperCase()}` || 'O';
}

export const TelegramMiniAppPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [data, setData] = useState<TelegramParentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('grades');
  const [selectedDay, setSelectedDay] = useState<string>('mon');

  useEffect(() => {
    const tg = (window as TelegramWebAppWindow).Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
    tg?.setHeaderColor?.('#FFFFFF');
    tg?.setBackgroundColor?.('#F2F4F7');
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Ota-ona havolasi topilmadi. Iltimos, Telegram botdagi Open tugmasi orqali kiring.");
      setLoading(false);
      return;
    }
    let active = true;
    api
      .getTelegramParentData(token)
      .then((res) => {
        if (active) {
          setData(res);
          const todayIdx = new Date().getDay();
          const map: Record<number, string> = {
            1: 'mon',
            2: 'tue',
            3: 'wed',
            4: 'thu',
            5: 'fri',
            6: 'sat',
          };
          setSelectedDay(map[todayIdx] || 'mon');
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const visibleDays = useMemo(() => {
    if (!data) return [];
    if (selectedDay === 'all') return data.weeklySchedule;
    return data.weeklySchedule.filter((d) => d.dayKey === selectedDay);
  }, [data, selectedDay]);

  if (loading) {
    return <AppLoader message="Farzandingiz ma'lumotlari yuklanmoqda..." />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] dark:bg-[#0B1120] flex items-center justify-center p-5">
        <div className="max-w-sm w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-9 h-9 text-red-600 mx-auto" />
          <h1 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Kirish havolasi yaroqsiz
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || "Iltimos, Telegram botda /start bosib, Ota-onaman rolini qayta tanlang."}
          </p>
        </div>
      </div>
    );
  }

  const gradedSubjects = data.subjects.filter((s) => data.grades[s] !== undefined);
  const latestAttendance = data.attendanceHistory[0] || null;
  const homeworkList = data.homework || [];

  return (
    <div className="min-h-screen bg-[#F2F4F7] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 pb-24">
      <div className="max-w-[520px] mx-auto px-3.5 pt-3.5 space-y-3.5">
        {/* Native App Profile Card (Ism Familiya + Maktab/Sinf + Teacher-set Status) */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white font-display font-bold text-base flex items-center justify-center shrink-0">
              {getInitials(data.student.firstName, data.student.lastName)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[17px] font-bold text-slate-900 dark:text-white truncate leading-snug">
                {data.student.firstName} {data.student.lastName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {data.student.school} · {data.classCode} sinf
              </p>
            </div>
            {data.gradedCount > 0 && (
              <div className="text-right shrink-0">
                <p className="font-mono text-lg font-bold text-[#1D4ED8] dark:text-blue-400 tabular-nums leading-none">
                  {data.averageGrade.toFixed(1)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">O&apos;rtacha</p>
              </div>
            )}
          </div>

          {/* Teacher-marked Latest Attendance Strip (ONLY shown if teacher/admin recorded attendance) */}
          {latestAttendance && (
            <div className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Darsda qatnashishi ({latestAttendance.date}):
              </span>
              {latestAttendance.status === 'present' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Darsda qatnashdi</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Darsga kelmadi</span>
                </span>
              )}
            </div>
          )}
        </section>

        {/* TAB 1: BAHOLAR (Only teacher/admin entered grades) */}
        {activeTab === 'grades' && (
          <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#2563EB]" />
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Baholar
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {gradedSubjects.length} ta fan
              </span>
            </div>

            {gradedSubjects.length === 0 ? (
              <div className="py-12 px-5 text-center space-y-1.5">
                <BookOpen className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Hozircha baho qo&apos;yilmagan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ustoz yoki admin baho kiritishi bilan shu yerda ko&apos;rinadi.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {gradedSubjects.map((subject) => {
                  const score = data.grades[subject];
                  const meta = getGradeMeta(score);
                  const pct = Math.round((score / 5) * 100);
                  return (
                    <div key={subject} className="px-4 py-3.5 flex items-center gap-3.5">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                            {subject}
                          </span>
                          <span className={`text-[11px] font-semibold ${meta.textClass} shrink-0`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <span
                          className={`font-mono text-base font-bold tabular-nums ${meta.textClass}`}
                        >
                          {score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: HAFTALIK KUNDALIK (1 haftalik dars jadvali) */}
        {activeTab === 'diary' && (
          <section className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {data.weeklySchedule.map((day) => (
                <button
                  key={day.dayKey}
                  type="button"
                  onClick={() => setSelectedDay(day.dayKey)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                    selectedDay === day.dayKey
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {day.dayUz}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedDay('all')}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                  selectedDay === 'all'
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                Barcha kunlar
              </button>
            </div>

            <div className="space-y-3">
              {visibleDays.map((day) => (
                <div
                  key={day.dayKey}
                  className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      {day.dayUz}
                    </h3>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {day.lessons.length} soat
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {day.lessons.map((lesson) => (
                      <div key={lesson.period} className="px-4 py-3 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/50 text-[#1D4ED8] dark:text-blue-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          {lesson.period}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                              {lesson.subject}
                            </p>
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                              <Clock className="w-3 h-3" />
                              {lesson.time}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {lesson.teacher}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono">
                              <MapPin className="w-3 h-3" />
                              {lesson.room}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 3: UY VAZIFALARI (Read-only, assigned by teacher/admin) */}
        {activeTab === 'homework' && (
          <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#2563EB]" />
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Uy vazifalari
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {homeworkList.length} ta
              </span>
            </div>

            {homeworkList.length === 0 ? (
              <div className="py-12 px-5 text-center space-y-1.5">
                <ClipboardList className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Hozircha uy vazifasi berilmagan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ustoz yangi vazifa qo&apos;shganda avtomatik shu yerda chiqadi.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {homeworkList.map((hw) => (
                  <div key={hw.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-bold text-slate-900 dark:text-white">
                        {hw.subject}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#1D4ED8] dark:text-blue-400 tabular-nums shrink-0">
                        <Calendar className="w-3 h-3" />
                        {hw.dueDate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {hw.title}
                    </p>
                    <p className="text-[11px] text-slate-400">Ustoz: {hw.teacher}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: DAVOMAT (Only teacher/admin marked attendance) */}
        {activeTab === 'attendance' && (
          <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Darsda qatnashishi
                </h2>
                {data.attendanceHistory.length > 0 && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    Keldi: {data.presentCount} · Kelmadi: {data.absentCount}
                  </p>
                )}
              </div>
              {data.attendanceHistory.length > 0 && (
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {data.attendanceRate}%
                </span>
              )}
            </div>

            {data.attendanceHistory.length === 0 ? (
              <div className="py-12 px-5 text-center space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Davomat hali belgilanmagan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ustoz davomat qo&apos;yganda farzandingizning qatnashishi shu yerda chiqadi.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {data.attendanceHistory.map((item) => (
                  <div
                    key={item.date}
                    className="px-4 py-3.5 flex items-center justify-between gap-4"
                  >
                    <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                      {item.date}
                    </span>
                    {item.status === 'present' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Darsda qatnashdi</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                        <XCircle className="w-4 h-4" />
                        <span>Darsga kelmadi</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Native Fixed Bottom Tab Bar (Always Visible, Touch-First Mobile App Bar) */}
      <nav
        aria-label="Ilova bo'limlari"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-14 max-w-[520px] mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'grades'
                ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Baholar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diary')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'diary'
                ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Kundalik</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('homework')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'homework'
                ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Vazifa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'attendance'
                ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Davomat</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
