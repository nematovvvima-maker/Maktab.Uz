import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Search, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { TableSkeleton } from '../../components/common/Skeleton';
import type { HomeworkItem } from '../../types';

const COPY = {
  uz: {
    title: 'Uy vazifalari',
    subtitle: "O'qituvchilar tomonidan sinfingiz uchun berilgan barcha topshiriqlar",
    allSubjects: 'Barcha fanlar',
    searchPlaceholder: "Fan yoki mavzu bo'yicha qidirish...",
    colSubject: 'Fan',
    colTask: 'Topshiriq',
    colTeacher: "O'qituvchi",
    colDue: 'Topshirish muddati',
    totalLabel: 'Jami vazifalar',
    empty: "Hozircha ushbu bo'limda uy vazifalari mavjud emas.",
  },
  ru: {
    title: 'Домашние задания',
    subtitle: 'Актуальные задания по предметам для вашего класса',
    allSubjects: 'Все предметы',
    searchPlaceholder: 'Поиск по предмету или заданию...',
    colSubject: 'Предмет',
    colTask: 'Задание',
    colTeacher: 'Учитель',
    colDue: 'Срок сдачи',
    totalLabel: 'Всего заданий',
    empty: 'Домашних заданий пока нет.',
  },
  en: {
    title: 'Homework',
    subtitle: 'All current assignments published for your class',
    allSubjects: 'All subjects',
    searchPlaceholder: 'Search by subject or assignment...',
    colSubject: 'Subject',
    colTask: 'Assignment',
    colTeacher: 'Teacher',
    colDue: 'Due date',
    totalLabel: 'Total assignments',
    empty: 'No homework assignments found.',
  },
};

export const StudentHomeworkPage: React.FC = () => {
  const { student } = useAuth();
  const { language } = useSettings();
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [search, setSearch] = useState('');

  const T = COPY[language] || COPY.uz;

  useEffect(() => {
    let active = true;
    api
      .getStudentHomework()
      .then((res) => {
        if (active) setItems(res.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const subjects = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.subject)));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedSubject !== 'all' && item.subject !== selectedSubject) return false;
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.teacher.toLowerCase().includes(q)
      );
    });
  }, [items, selectedSubject, search]);

  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#2563EB] dark:text-blue-400">
            {student?.grade} · {T.totalLabel}: {items.length}
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            {T.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{T.subtitle}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T.searchPlaceholder}
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Subject Filter Tabs */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedSubject === 'all'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]/50'
            }`}
          >
            {T.allSubjects} ({items.length})
          </button>
          {subjects.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedSubject === subj
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]/50'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      )}

      {/* Clean Read-Only Homework Table (No checkboxes or Done buttons) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{T.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5 w-48">{T.colSubject}</th>
                  <th className="py-3 px-5">{T.colTask}</th>
                  <th className="py-3 px-5 w-44">{T.colTeacher}</th>
                  <th className="py-3 px-5 w-40 text-right">{T.colDue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-5 font-semibold text-[#1D4ED8] dark:text-blue-400 whitespace-nowrap align-top">
                      {item.subject}
                    </td>
                    <td className="py-4 px-5 text-slate-800 dark:text-slate-200 leading-relaxed align-top">
                      {item.title}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
                      {item.teacher}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap align-top">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.dueDate}</span>
                      </span>
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
