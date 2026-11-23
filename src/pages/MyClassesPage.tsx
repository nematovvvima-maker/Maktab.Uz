import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ArrowUpRight,
  Layers,
  Award,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAllowedGrades, isSuperAdmin } from '../utils/adminScope';
import { getSubjectsForGrade } from '../data/initialData';
import { CardSkeleton } from '../components/common/Skeleton';
import type { AttendanceData, HomeworkItem, Student, StudentGrades } from '../types';

export const MyClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<StudentGrades>({});
  const [attendance, setAttendance] = useState<AttendanceData>({});
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const superAdmin = isSuperAdmin(user);
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sRes, gRes, aRes, hRes] = await Promise.all([
          api.getStudents(),
          api.getGrades(),
          api.getAttendance(),
          api.getAdminHomework(),
        ]);
        if (!active) return;
        setStudents(sRes.students);
        setGrades(gRes.grades);
        setAttendance(aRes.attendance);
        setHomework(hRes.items);
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
  }, [showToast]);

  const classCards = useMemo(() => {
    const todayMap = attendance[todayStr] || {};
    return allowedGrades.map((gradeName) => {
      const classStudents = students.filter((s) => s.grade === gradeName);
      const classHomework = homework.filter((hw) => hw.grade === gradeName);
      const subjects = getSubjectsForGrade(gradeName);

      let scoreSum = 0;
      let scoreCount = 0;
      let presentToday = 0;
      let markedToday = 0;

      classStudents.forEach((st) => {
        const stGrades = grades[st.id] || {};
        const gradeValues: number[] = Object.values(stGrades);
        gradeValues.forEach((val) => {
          scoreSum += val;
          scoreCount += 1;
        });
        const att = todayMap[st.id];
        if (att === 'present') {
          presentToday += 1;
          markedToday += 1;
        } else if (att === 'absent') {
          markedToday += 1;
        }
      });

      const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(2) : '—';
      const attendancePct =
        markedToday > 0 ? Math.round((presentToday / markedToday) * 100) : null;

      return {
        gradeName,
        studentCount: classStudents.length,
        subjectCount: subjects.length,
        homeworkCount: classHomework.length,
        avgScore,
        presentToday,
        attendancePct,
        topStudents: classStudents.slice(0, 3),
      };
    });
  }, [allowedGrades, students, grades, attendance, homework, todayStr]);

  const totals = useMemo(() => {
    const totalStudents = classCards.reduce((acc, c) => acc + c.studentCount, 0);
    const totalHomework = classCards.reduce((acc, c) => acc + c.homeworkCount, 0);
    return { totalStudents, totalHomework };
  }, [classCards]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {user?.fullName} ({user?.login}) · {user?.role}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Mening sinflarim
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {superAdmin
              ? 'Bosh administrator sifatida maktabdagi barcha sinflarni boshqarasiz.'
              : allowedGrades.length > 0
              ? `Bosh administrator tomonidan sizga biriktirilgan sinflar: ${allowedGrades.join(', ')}`
              : 'Hozircha sizga biriktirilgan sinf mavjud emas.'}
          </p>
        </div>

        {allowedGrades.length > 0 && (
          <div className="inline-flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Sinflar: </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {allowedGrades.length} ta
              </span>
            </div>
            <span className="text-slate-200 dark:text-slate-700">|</span>
            <div>
              <span className="text-slate-500 dark:text-slate-400">O&apos;quvchilar: </span>
              <span className="font-mono font-bold text-[#1D4ED8] dark:text-blue-400 tabular-nums">
                {totals.totalStudents} nafar
              </span>
            </div>
            <span className="text-slate-200 dark:text-slate-700">|</span>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Vazifalar: </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {totals.totalHomework} ta
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : allowedGrades.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Sizga hali sinf biriktirilmagan
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Bosh administrator (Davronbek) Adminlar paneli orqali bo&apos;sh sinflarni hisobingizga
            biriktirgach, ular shu yerda ko&apos;rinadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {classCards.map((card) => (
            <section
              key={card.gradeName}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
            >
              {/* Top Band */}
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {card.gradeName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    {card.subjectCount} ta fan · {card.homeworkCount} ta faol uy vazifasi
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-medium text-slate-400">O&apos;rtacha ball</p>
                  <p className="font-mono text-xl font-bold text-[#1D4ED8] dark:text-blue-400 tabular-nums inline-flex items-center gap-1 mt-0.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>{card.avgScore}</span>
                  </p>
                </div>
              </div>

              {/* 3-Column Metrics */}
              <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/40">
                <div className="p-4">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">O&apos;quvchilar</p>
                  <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {card.studentCount}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Bugungi davomat</p>
                  <p className="font-mono text-lg font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                    {card.attendancePct !== null ? `${card.attendancePct}%` : '—'}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Uy vazifalari</p>
                  <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {card.homeworkCount}
                  </p>
                </div>
              </div>

              {/* Quick Student Preview */}
              <div className="px-6 py-4 flex-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                  Sinf o&apos;quvchilari
                </p>
                {card.topStudents.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Ushbu sinfda hali o&apos;quvchi qo&apos;shilmagan.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {card.topStudents.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/70 last:border-b-0"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {st.firstName} {st.lastName}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums shrink-0">
                          {st.login}
                        </span>
                      </div>
                    ))}
                    {card.studentCount > 3 && (
                      <p className="text-[11px] text-slate-400 pt-1">
                        va yana {card.studentCount - 3} nafar o&apos;quvchi...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Link
                  to={`/students?grade=${encodeURIComponent(card.gradeName)}`}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/60 hover:bg-[#EFF6FF]/70 dark:hover:bg-blue-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>O&apos;quvchilar</span>
                </Link>
                <Link
                  to={`/grades?grade=${encodeURIComponent(card.gradeName)}`}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/60 hover:bg-[#EFF6FF]/70 dark:hover:bg-blue-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Baholar</span>
                </Link>
                <Link
                  to={`/attendance?grade=${encodeURIComponent(card.gradeName)}`}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/60 hover:bg-[#EFF6FF]/70 dark:hover:bg-blue-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
                >
                  <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Davomat</span>
                </Link>
                <Link
                  to={`/homework?grade=${encodeURIComponent(card.gradeName)}`}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors whitespace-nowrap"
                >
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                  <span>Vazifalar</span>
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
