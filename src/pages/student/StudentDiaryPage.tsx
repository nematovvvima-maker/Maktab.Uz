import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { buildWeeklySchedule } from '../../data/schoolSchedule';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import type { GradeValue, HomeworkItem, StudentPortalPayload } from '../../types';

const COPY = {
  uz: {
    title: 'Kundalik',
    subtitle: 'Haftalik darslar, uy vazifalari va qo‘yilgan baholar',
    prevWeek: 'Oldingi hafta',
    nextWeek: 'Keyingi hafta',
    colSubject: 'Fan',
    colHomework: 'Uy vazifasi',
    colMark: 'Baho',
    weeklyAvg: 'O‘rtacha ball',
    lessonsCount: 'Haftalik darslar',
    noMark: '—',
  },
  ru: {
    title: 'Дневник',
    subtitle: 'Уроки, домашние задания и оценки за учебную неделю',
    prevWeek: 'Пред. неделя',
    nextWeek: 'След. неделя',
    colSubject: 'Предмет',
    colHomework: 'Домашнее задание',
    colMark: 'Оценка',
    weeklyAvg: 'Средний балл',
    lessonsCount: 'Уроков в неделю',
    noMark: '—',
  },
  en: {
    title: 'Diary',
    subtitle: 'Weekly lessons, homework tasks, and subject marks',
    prevWeek: 'Prev week',
    nextWeek: 'Next week',
    colSubject: 'Subject',
    colHomework: 'Homework',
    colMark: 'Mark',
    weeklyAvg: 'Average grade',
    lessonsCount: 'Weekly lessons',
    noMark: '—',
  },
};

function getMondayOfWeek(weekOffset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff + weekOffset * 7);
  return monday;
}

function formatShortDate(date: Date, lang: 'uz' | 'ru' | 'en'): string {
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

function markStyle(score: GradeValue): string {
  if (score === 5) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  if (score === 4) return 'bg-[#EFF6FF] text-[#1D4ED8] border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  if (score === 3) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
}

export const StudentDiaryPage: React.FC = () => {
  const { language } = useSettings();
  const [data, setData] = useState<StudentPortalPayload | null>(null);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const T = COPY[language] || COPY.uz;

  useEffect(() => {
    let active = true;
    Promise.all([api.getStudentDashboard(), api.getStudentHomework()])
      .then(([dash, hw]) => {
        if (active) {
          setData(dash);
          setHomeworkList(hw.items);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const monday = useMemo(() => getMondayOfWeek(weekOffset), [weekOffset]);

  const homeworkBySubject = useMemo(() => {
    const map: Record<string, string> = {};
    homeworkList.forEach((item) => {
      if (!map[item.subject]) {
        map[item.subject] = item.title;
      }
    });
    return map;
  }, [homeworkList]);

  const schedule = useMemo(() => {
    if (!data) return [];
    return buildWeeklySchedule(data.student.grade);
  }, [data]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const totalLessons = schedule.reduce((sum, d) => sum + d.lessons.length, 0);

  return (
    <div className="space-y-5">
      {/* Header & Week Switcher */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#2563EB]" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {T.title} · {data.student.grade}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{T.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="px-2.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              aria-label={T.prevWeek}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="tabular-nums">
                {formatShortDate(monday, language)} – {formatShortDate(saturday, language)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="px-2.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              aria-label={T.nextWeek}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 whitespace-nowrap">
            <span>{T.weeklyAvg}:</span>
            <span className="font-mono font-bold text-[#1D4ED8] dark:text-blue-400 tabular-nums">
              {data.averageGrade.toFixed(2)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{T.lessonsCount}:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {totalLessons}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Diary Grid (Mon–Sat) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schedule.map((day, idx) => {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + idx);
          const dayName =
            language === 'ru' ? day.dayRu : language === 'en' ? day.dayEn : day.dayUz;
          const isToday =
            weekOffset === 0 &&
            new Date().toDateString() === dayDate.toDateString();

          return (
            <section
              key={day.dayKey}
              className={`bg-white dark:bg-[#111827] border rounded-xl overflow-hidden ${
                isToday
                  ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div
                className={`px-4 py-2.5 flex items-center justify-between border-b ${
                  isToday
                    ? 'bg-[#2563EB] text-white border-[#1D4ED8]'
                    : 'bg-[#F8FAFC] dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="text-sm font-bold">{dayName}</span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isToday ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {formatShortDate(dayDate, language)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40">
                      <th className="py-2 pl-3 pr-2 w-8 text-center">#</th>
                      <th className="py-2 px-2">{T.colSubject}</th>
                      <th className="py-2 px-2">{T.colHomework}</th>
                      <th className="py-2 pl-2 pr-3 w-14 text-center">{T.colMark}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[13px]">
                    {day.lessons.map((lesson) => {
                      const mark = data.grades[lesson.subject];
                      const liveHw = homeworkBySubject[lesson.subject] || lesson.homework;
                      return (
                        <tr
                          key={`${day.dayKey}-${lesson.period}`}
                          className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 pl-3 pr-2 text-center font-mono text-xs text-slate-400 tabular-nums align-top">
                            {lesson.period}
                          </td>
                          <td className="py-2.5 px-2 align-top">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                              {lesson.subject}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400 tabular-nums mt-0.5">
                              {lesson.time}
                            </p>
                          </td>
                          <td className="py-2.5 px-2 text-xs text-slate-600 dark:text-slate-300 align-top leading-relaxed">
                            {liveHw}
                          </td>
                          <td className="py-2.5 pl-2 pr-3 text-center align-top">
                            {mark !== undefined ? (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md border font-mono text-xs font-bold tabular-nums ${markStyle(
                                  mark
                                )}`}
                              >
                                {mark}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">
                                {T.noMark}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
