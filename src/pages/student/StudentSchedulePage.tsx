import React, { useMemo, useState } from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { buildWeeklySchedule } from '../../data/schoolSchedule';

const COPY = {
  uz: {
    title: 'Dars jadvali',
    subtitle: 'Haftalik darslar, vaqt oralig‘i, xona va fan o‘qituvchilari',
    allDays: 'Butun hafta',
    period: 'Dars',
    time: 'Vaqt',
    subject: 'Fan nomi',
    teacher: 'O‘qituvchi',
    room: 'Xona',
  },
  ru: {
    title: 'Расписание уроков',
    subtitle: 'Учебная сетка на неделю, время уроков, кабинеты и учителя',
    allDays: 'Вся неделя',
    period: 'Урок',
    time: 'Время',
    subject: 'Предмет',
    teacher: 'Учитель',
    room: 'Кабинет',
  },
  en: {
    title: 'Class Schedule',
    subtitle: 'Weekly timetable, bell times, rooms, and teachers',
    allDays: 'Full week',
    period: 'Period',
    time: 'Time',
    subject: 'Subject',
    teacher: 'Teacher',
    room: 'Room',
  },
};

export const StudentSchedulePage: React.FC = () => {
  const { student } = useAuth();
  const { language } = useSettings();
  const [selectedDay, setSelectedDay] = useState<string>('all');

  const T = COPY[language] || COPY.uz;
  const grade = student?.grade || '9-sinf';

  const schedule = useMemo(() => buildWeeklySchedule(grade), [grade]);

  const visibleDays =
    selectedDay === 'all' ? schedule : schedule.filter((d) => d.dayKey === selectedDay);

  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  return (
    <div className="space-y-5">
      {/* Header & Day Filter Tabs */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {T.title} · {grade}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{T.subtitle}</p>
          </div>
          <span className="font-mono text-xs text-[#2563EB] dark:text-blue-400 font-semibold tabular-nums">
            08:30 – 13:00
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedDay === 'all'
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#F8FAFC] dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-slate-800'
            }`}
          >
            {T.allDays}
          </button>
          {schedule.map((day) => {
            const label =
              language === 'ru' ? day.dayRu : language === 'en' ? day.dayEn : day.dayUz;
            const isSelected = selectedDay === day.dayKey;
            return (
              <button
                key={day.dayKey}
                type="button"
                onClick={() => setSelectedDay(day.dayKey)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#F8FAFC] dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timetable Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleDays.map((day) => {
          const dayLabel =
            language === 'ru' ? day.dayRu : language === 'en' ? day.dayEn : day.dayUz;
          const isToday = day.dayKey === todayKey;

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
                    : 'bg-[#F8FAFC] dark:bg-slate-900/80 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800'
                }`}
              >
                <h2 className="text-sm font-bold">{dayLabel}</h2>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isToday ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {day.lessons.length} {T.period.toLowerCase()}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {day.lessons.map((lesson) => (
                  <div
                    key={`${day.dayKey}-${lesson.period}`}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1D4ED8] dark:text-blue-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                        {lesson.period}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {lesson.subject}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{lesson.teacher}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{lesson.room}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lesson.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
