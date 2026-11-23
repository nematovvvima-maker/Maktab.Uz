import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, XCircle, Award } from 'lucide-react';
import { api } from '../../services/api';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import type { StudentPortalPayload } from '../../types';

const LIBRARY_BANNER = '/src/assets/images/student_portal_campus_library_1795180612763.jpg';

export const StudentHomePage: React.FC = () => {
  const [data, setData] = useState<StudentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

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
      <div className="space-y-6">
        <div className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const gradedSubjects = data.subjects
    .filter((subj) => data.grades[subj] !== undefined)
    .map((subj) => ({ subject: subj, score: data.grades[subj] }));

  return (
    <div className="space-y-6">
      {/* Original Maktab.Uz Hero Banner */}
      <section className="relative rounded-2xl overflow-hidden bg-[#0F2764] min-h-[210px] sm:min-h-[235px] flex items-end border border-slate-200 dark:border-slate-800">
        {!imgError ? (
          <img
            src={LIBRARY_BANNER}
            alt="Zamonaviy o'quv kutubxonasi"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F2764] via-[#1D4ED8] to-[#2563EB]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B193D]/92 via-[#0F2764]/78 to-[#1E3A8A]/45" />

        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-5 text-white">
          <div className="space-y-1.5 max-w-xl">
            <p className="text-xs font-mono text-blue-200 tabular-nums">
              {data.student.grade} · ID: {data.student.id} · Login: {data.student.login}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight [text-wrap:balance]">
              Salom, {data.student.firstName} {data.student.lastName}
            </h1>
            <p className="text-sm text-blue-50/90 leading-relaxed">
              Maktab.Uz shaxsiy kabinetingiz: haftalik kundalik, uy vazifalari, fan baholari va
              davomat ko&apos;rsatkichlari.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/student/diary"
              className="px-4 py-2.5 rounded-lg bg-white text-[#1D4ED8] hover:bg-blue-50 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Kundalikni ochish
            </Link>
            <Link
              to="/student/homework"
              className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Uy vazifalari
            </Link>
          </div>
        </div>
      </section>

      {/* 4-Column Crisp White KPI Ledger */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">O&apos;rtacha ball</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-[#1D4ED8] dark:text-blue-400 tabular-nums">
              {data.averageGrade.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 5.00</span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sinfdagi o&apos;rningiz
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              #{data.classRank}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {data.classTotal} o&apos;quvchidan
            </span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Davomat darajasi</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {data.attendanceRate}%
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {data.presentCount} kelgan
            </span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Baholangan fanlar</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {data.gradedCount}
            </span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              / {data.subjects.length} fan
            </span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Subject Performance Sheet */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Fanlar bo&apos;yicha baholarim
            </h2>
            <Link
              to="/student/grades"
              className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <span>To&apos;liq jurnal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3.5 flex-1">
            {gradedSubjects.length === 0 ? (
              <p className="text-sm text-slate-500 py-10 text-center">
                Hozircha fanlardan baholar qo&apos;yilmagan.
              </p>
            ) : (
              gradedSubjects.slice(0, 6).map(({ subject, score }) => {
                const pct = (score / 5) * 100;
                const barColor =
                  score === 5
                    ? 'bg-emerald-600'
                    : score === 4
                    ? 'bg-[#2563EB]'
                    : score === 3
                    ? 'bg-amber-500'
                    : 'bg-red-600';
                return (
                  <div key={subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {subject}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {score} / 5
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Stack: Recent Attendance & Class Top 4 */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Attendance Card */}
          <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Oxirgi davomat
              </h2>
              <Link
                to="/student/attendance"
                className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Tarix</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {data.attendanceHistory.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Yozuvlar topilmadi</p>
              ) : (
                data.attendanceHistory.slice(0, 4).map((entry) => (
                  <div key={entry.date} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      {entry.date}
                    </span>
                    {entry.status === 'present' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kelgan</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Kelmagan</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Class Leaderboard Snapshot */}
          <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {data.student.grade} reytingi
              </h2>
              <Link
                to="/student/rating"
                className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Barchasi</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {data.classLeaderboard.slice(0, 4).map((row) => (
                <div
                  key={row.id}
                  className={`py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between text-sm ${
                    row.isCurrentStudent ? 'bg-[#EFF6FF] dark:bg-blue-950/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-500 w-6 tabular-nums">
                      #{row.rank}
                    </span>
                    <span
                      className={`truncate ${
                        row.isCurrentStudent
                          ? 'font-semibold text-[#1D4ED8] dark:text-blue-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {row.firstName} {row.lastName}
                      {row.isCurrentStudent ? ' (Siz)' : ''}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums inline-flex items-center gap-1 shrink-0">
                    {row.rank === 1 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                    {row.averageGrade.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Platform Overview Section (Student Home Page Only) */}
      <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5 max-w-3xl">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Maktab.Uz portali haqida
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Maktab.Uz — o&apos;quvchilar, o&apos;qituvchilar va ota-onalar uchun yagona elektron
            maktab kundaligi. Bu yerda sinfingizning haftalik dars jadvali, ustozlar tomonidan
            berilgan uy vazifalari, fanlardan olgan baholaringiz va darsda qatnashish tarixingiz
            doimiy ravishda yangilanib boradi.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5">01.</span>
              Haftalik kundalik va jadval
            </h3>
            <p>
              Har kungi darslar tartibi, boshlanish vaqti, o&apos;qituvchi ismi va xona raqami
              bitta bo&apos;limda jamlangan.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5">02.</span>
              Baholar va sinf reytingi
            </h3>
            <p>
              Ustozlar kiritgan barcha baholar o&apos;rtacha ballingizni avtomatik hisoblaydi va
              sinfdagi o&apos;rningizni ko&apos;rsatadi.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5">03.</span>
              @MaktabUz1_bot orqali qulaylik
            </h3>
            <p>
              Telegram bot orqali istalgan payt dars jadvali, uy vazifalari hamda shaxsiy login va
              parolingizni tezda ko&apos;rishingiz mumkin.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
