import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, UserPlus, ShieldPlus, Layers } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { getAllowedGrades, isSuperAdmin } from '../utils/adminScope';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import type { AdminAccount, AttendanceData, AuditLog, Student, StudentGrades } from '../types';

export const DashboardPage: React.FC = () => {
  const { t } = useSettings();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [grades, setGrades] = useState<StudentGrades>({});
  const [attendance, setAttendance] = useState<AttendanceData>({});
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const superAdmin = isSuperAdmin(user);
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sRes, aRes, gRes, attRes, lRes] = await Promise.all([
          api.getStudents(),
          superAdmin ? api.getAdmins() : Promise.resolve({ admins: [] as AdminAccount[] }),
          api.getGrades(),
          api.getAttendance(),
          api.getAuditLogs(),
        ]);
        if (!active) return;
        setStudents(sRes.students);
        setAdmins(aRes.admins);
        setGrades(gRes.grades);
        setAttendance(attRes.attendance);
        setLogs(lRes.logs);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [superAdmin]);

  const todayStr = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const todayRecord = attendance[todayStr] || {};
    const presentCount = Object.values(todayRecord).filter((v) => v === 'present').length;
    const absentCount = Object.values(todayRecord).filter((v) => v === 'absent').length;
    const totalMarked = presentCount + absentCount;
    const attendancePct = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

    let sum = 0;
    let count = 0;
    Object.values(grades).forEach((subjMap) => {
      Object.values(subjMap).forEach((score) => {
        sum += score;
        count += 1;
      });
    });
    const avgGrade = count > 0 ? (sum / count).toFixed(2) : '0.00';
    const activeAdminCount = admins.filter((a) => a.status === 'active').length;

    const classCounts: Record<string, number> = {};
    students.forEach((s) => {
      classCounts[s.grade] = (classCounts[s.grade] || 0) + 1;
    });
    const distribution = Object.entries(classCounts).sort((a, b) => {
      const na = parseInt(a[0], 10) || 0;
      const nb = parseInt(b[0], 10) || 0;
      return na - nb;
    });

    return {
      presentCount,
      absentCount,
      attendancePct,
      avgGrade,
      activeAdminCount,
      distribution,
      maxClassCount: Math.max(...distribution.map((d) => d[1]), 1),
    };
  }, [students, admins, grades, attendance, todayStr]);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {todayStr} · {user?.role}
            {!superAdmin && allowedGrades.length > 0 ? ` · ${allowedGrades.join(', ')}` : ''}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-1">
            Xush kelibsiz, {user?.fullName || user?.login}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/students"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>{t('addStudent')}</span>
          </Link>
          {superAdmin ? (
            <Link
              to="/admins"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldPlus className="w-4 h-4" />
              <span>{t('addAdmin')}</span>
            </Link>
          ) : (
            <Link
              to="/my-classes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Layers className="w-4 h-4" />
              <span>Sinflarim</span>
            </Link>
          )}
        </div>
      </div>

      {/* 4-Column Hairline KPI Ledger */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('totalStudents')}
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
                {students.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {metrics.distribution.length} sinf
              </span>
            </div>
          </div>

          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('presentToday')}
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
                {metrics.presentCount}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {metrics.attendancePct}% · {metrics.absentCount} {t('absent').toLowerCase()}
              </span>
            </div>
          </div>

          {superAdmin ? (
            <div className="p-6">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('activeAdmins')}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-mono text-3xl font-semibold tracking-tight text-[#1D4ED8] dark:text-blue-400 tabular-nums">
                  {metrics.activeAdminCount}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  / {admins.length} jami
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Mening sinflarim
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-mono text-3xl font-semibold tracking-tight text-[#1D4ED8] dark:text-blue-400 tabular-nums">
                  {allowedGrades.length}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {allowedGrades.length > 0 ? allowedGrades.join(', ') : '—'}
                </span>
              </div>
            </div>
          )}

          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('averageSchoolGrade')}
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
                {metrics.avgGrade}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">/ 5.00</span>
            </div>
          </div>
        </div>
      )}

      {/* Middle Analytical Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Class Distribution */}
        <section className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
              {t('classDistribution')}
            </h2>
            <Link
              to="/students"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Barchasi</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-3.5 flex-1">
            {loading ? (
              <TableSkeleton rows={4} />
            ) : metrics.distribution.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">{t('noData')}</p>
            ) : (
              metrics.distribution.map(([gradeName, count]) => {
                const pct = Math.round((count / metrics.maxClassCount) * 100);
                return (
                  <div key={gradeName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {gradeName}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {count} nafar
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Recent Admin Activity */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
              {t('recentActivity')}
            </h2>
            <Link
              to={superAdmin ? '/admins' : '/my-classes'}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>{superAdmin ? t('admins') : 'Sinflarim'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {loading ? (
              <div className="pt-4">
                <TableSkeleton rows={4} />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">{t('noData')}</p>
            ) : (
              logs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100 truncate">
                      <span className="font-semibold">{log.actorLogin}</span>
                      <span className="text-slate-400 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{log.details}</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Recently Added Students Ledger */}
      <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
            {t('recentlyAdded')}
          </h2>
          <Link
            to="/students"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>{t('students')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">{t('id')}</th>
                  <th className="py-3 px-4">{t('fullName')}</th>
                  <th className="py-3 px-4">Login</th>
                  <th className="py-3 px-4">{t('gradeClass')}</th>
                  <th className="py-3 px-6 text-right">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {students.slice(0, 5).map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-6 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {student.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                      {student.login}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{student.grade}</td>
                    <td className="py-3 px-6 text-right font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {student.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Platform Overview Section (Home Page Only) */}
      <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="space-y-1.5 max-w-3xl">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
            Maktab.Uz tizimi haqida
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Maktab.Uz — umumta&apos;lim maktablarida o&apos;quv jarayonini raqamlashtirish,
            o&apos;quvchilarning bilim va davomatini nazorat qilish hamda ota-onalar bilan tezkor
            aloqa o&apos;rnatish uchun mo&apos;ljallangan yagona platforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5">01.</span>
              Tartibli sinf va jurnal boshqaruvi
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Bosh admin barcha 1–11-sinflarni, sinf adminlari esa o&apos;zlariga biriktirilgan
              sinflardagi o&apos;quvchilar, baholar, uy vazifalari va kunlik davomatni mustaqil
              boshqaradi.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5">02.</span>
              O&apos;quvchilarning shaxsiy kabineti
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Ro&apos;yxatga qo&apos;shilgan har bir o&apos;quvchi shaxsiy login va paroli bilan
              saytga kirib, kundalik dars jadvali, uy vazifalari, fan baholari va sinfdagi
              reytingini kuzatadi.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5">03.</span>
              Telegram bot bilan jonli sinxronizatsiya
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Saytda saqlangan yangi o&apos;quvchilar, baholar, uy vazifalari va «Kelmadi»
              belgilari bir zumda @MaktabUz1_bot orqali ota-onalar va o&apos;quvchilarga yetib
              boradi.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
