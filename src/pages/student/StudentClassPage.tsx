import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, MessageSquare, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import type { StudentPortalPayload } from '../../types';

const COPY = {
  uz: {
    title: 'Mening sinfim',
    subtitle: 'Sinfdoshlar ro‘yxati, o‘rtacha ko‘rsatkichlar va sinf rahbari ma’lumotlari',
    classTeacher: 'Sinf rahbari',
    totalStudents: 'Sinfdagi o‘quvchilar',
    yourRank: 'Sizning o‘rningiz',
    classAverage: 'Sinf o‘rtacha balli',
    openChat: 'Sinf chatiga o‘tish',
    openDiary: 'Kundalikni ochish',
    colRank: 'O‘rin',
    colStudent: 'O‘quvchi F.I.Sh.',
    colSubjects: 'Baholangan fanlar',
    colAvg: 'O‘rtacha ball',
    you: '(Siz)',
  },
  ru: {
    title: 'Мой класс',
    subtitle: 'Список одноклассников, средний балл и данные классного руководителя',
    classTeacher: 'Классный руководитель',
    totalStudents: 'Учеников в классе',
    yourRank: 'Ваше место',
    classAverage: 'Средний балл класса',
    openChat: 'Открыть чат класса',
    openDiary: 'Открыть дневник',
    colRank: 'Место',
    colStudent: 'Ф.И.О. ученика',
    colSubjects: 'Оценено предметов',
    colAvg: 'Средний балл',
    you: '(Вы)',
  },
  en: {
    title: 'My Class',
    subtitle: 'Classmates roster, academic averages, and homeroom details',
    classTeacher: 'Homeroom teacher',
    totalStudents: 'Classmates',
    yourRank: 'Your rank',
    classAverage: 'Class average',
    openChat: 'Open class chat',
    openDiary: 'Open diary',
    colRank: 'Rank',
    colStudent: 'Student name',
    colSubjects: 'Graded subjects',
    colAvg: 'Average score',
    you: '(You)',
  },
};

export const StudentClassPage: React.FC = () => {
  const { language } = useSettings();
  const [data, setData] = useState<StudentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const T = COPY[language] || COPY.uz;

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

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const classAverage =
    data.classLeaderboard.length > 0
      ? data.classLeaderboard.reduce((sum, s) => sum + s.averageGrade, 0) /
        data.classLeaderboard.length
      : 0;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {T.title} · {data.student.grade}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{T.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/student/diary"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{T.openDiary}</span>
          </Link>
          <Link
            to="/student/chats"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{T.openChat}</span>
          </Link>
        </div>
      </div>

      {/* 4-Cell Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{T.classTeacher}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
            D. Abdullayeva
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{T.totalStudents}</p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {data.classTotal}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{T.yourRank}</p>
          <p className="font-mono text-2xl font-bold text-[#1D4ED8] dark:text-blue-400 mt-1 tabular-nums">
            #{data.classRank}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{T.classAverage}</p>
          <p className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {classAverage.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Classmates Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-20">{T.colRank}</th>
                <th className="py-3 px-4">{T.colStudent}</th>
                <th className="py-3 px-4 text-center">{T.colSubjects}</th>
                <th className="py-3 px-4 text-right">{T.colAvg}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {data.classLeaderboard.map((member) => (
                <tr
                  key={member.id}
                  className={
                    member.isCurrentStudent
                      ? 'bg-[#EFF6FF] dark:bg-blue-950/30'
                      : 'hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40'
                  }
                >
                  <td className="py-3 px-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <span>#{member.rank}</span>
                      {member.rank === 1 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        member.isCurrentStudent
                          ? 'font-bold text-[#1D4ED8] dark:text-blue-300'
                          : 'font-medium text-slate-800 dark:text-slate-100'
                      }
                    >
                      {member.firstName} {member.lastName}{' '}
                      {member.isCurrentStudent ? T.you : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    {member.totalGradesCount} / {data.subjects.length}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {member.averageGrade.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
