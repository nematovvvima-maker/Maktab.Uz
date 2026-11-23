import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  Trophy,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { MaktabLogo } from '../common/MaktabLogo';
import { SiteFooter } from '../common/SiteFooter';
import type { Language } from '../../types';

const LABELS = {
  uz: {
    home: 'Asosiy',
    diary: 'Kundalik',
    homework: 'Uy vazifalari',
    grades: 'Baholar',
    schedule: 'Dars jadvali',
    chats: 'Chatlar',
    myClass: 'Mening sinfim',
    attendance: 'Davomatim',
    rating: 'Reyting',
    profile: 'Profilim',
    logout: 'Chiqish',
    roleStudent: "O'quvchi",
  },
  ru: {
    home: 'Главная',
    diary: 'Дневник',
    homework: 'Домашние задания',
    grades: 'Оценки',
    schedule: 'Расписание',
    chats: 'Чаты',
    myClass: 'Мой класс',
    attendance: 'Посещаемость',
    rating: 'Рейтинг',
    profile: 'Профиль',
    logout: 'Выход',
    roleStudent: 'Ученик',
  },
  en: {
    home: 'Overview',
    diary: 'Diary',
    homework: 'Homework',
    grades: 'Grades',
    schedule: 'Schedule',
    chats: 'Chats',
    myClass: 'My Class',
    attendance: 'Attendance',
    rating: 'Leaderboard',
    profile: 'Profile',
    logout: 'Sign Out',
    roleStudent: 'Student',
  },
};

export const StudentLayout: React.FC = () => {
  const { student, logout } = useAuth();
  const { language, setLanguage, theme, toggleTheme } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const L = LABELS[language] || LABELS.uz;

  const primaryLinks = [
    { path: '/student', label: L.home, end: true },
    { path: '/student/diary', label: L.diary },
    { path: '/student/homework', label: L.homework },
    { path: '/student/grades', label: L.grades },
    { path: '/student/schedule', label: L.schedule },
    { path: '/student/chats', label: L.chats },
  ];

  const secondaryLinks = [
    { path: '/student/class', label: L.myClass, icon: Users },
    { path: '/student/attendance', label: L.attendance, icon: CalendarCheck },
    { path: '/student/rating', label: L.rating, icon: Trophy },
    { path: '/student/profile', label: L.profile, icon: UserCircle },
  ];

  const mobileBottomTabs = [
    { path: '/student', label: L.home, icon: Home, end: true },
    { path: '/student/diary', label: L.diary, icon: BookOpen },
    { path: '/student/homework', label: language === 'uz' ? 'Vazifa' : L.homework, icon: ClipboardList },
    { path: '/student/grades', label: L.grades, icon: Award },
    { path: '/student/chats', label: L.chats, icon: MessageSquare },
  ];

  const initials = student
    ? `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase()
    : 'OQ';
  const shortName = student
    ? `${student.firstName} ${student.lastName.charAt(0)}.`
    : L.roleStudent;

  const handleLogout = () => {
    logout();
    showToast(L.logout, 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Original Maktab.Uz Clean Single-Row Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <NavLink to="/student" className="focus:outline-none shrink-0">
            <MaktabLogo />
          </NavLink>

          {/* Zone 2: Clean Single-Line Text Navigation */}
          <nav
            aria-label="O'quvchi menyusi"
            className="hidden lg:flex items-center gap-6 h-full"
          >
            {primaryLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `relative h-full inline-flex items-center text-[14px] transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#1D4ED8] dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{link.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 inset-x-0 h-[2px] bg-[#2563EB] dark:bg-blue-400 rounded-t-full"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Student Account Menu */}
          <div className="flex items-center gap-3 shrink-0" ref={dropdownRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#2563EB]/50 transition-colors whitespace-nowrap"
              >
                <span className="w-7 h-7 rounded-md bg-[#EFF6FF] dark:bg-blue-950/70 text-[#1D4ED8] dark:text-blue-300 font-display text-xs font-bold flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {shortName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {student?.firstName} {student?.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {student?.grade} · {student?.login}
                    </p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {secondaryLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-[#EFF6FF] dark:bg-blue-950/50 text-[#1D4ED8] dark:text-blue-300 font-semibold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>

                  {/* Language & Theme Controls inside Account Popover */}
                  <div className="pt-1.5 pb-1 px-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      {(
                        [
                          { code: 'uz', label: "O'z" },
                          { code: 'ru', label: 'Ru' },
                          { code: 'en', label: 'En' },
                        ] as { code: Language; label: string }[]
                      ).map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setLanguage(lang.code)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            language === lang.code
                              ? 'bg-white dark:bg-slate-900 text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Mavzuni almashtirish"
                    >
                      {theme === 'light' ? (
                        <Moon className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{L.logout}</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              aria-label="Menyu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-3 space-y-1">
            {[...primaryLinks, ...secondaryLinks].map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/student'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-[#EFF6FF] dark:bg-blue-950/50 text-[#1D4ED8] dark:text-blue-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 dark:border-red-900"
            >
              {L.logout}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-3.5 sm:px-6 py-5 sm:py-7 pb-8">
        <Outlet />
      </main>

      <SiteFooter
        withMobileNavOffset
        metaText={
          student ? `${student.firstName} ${student.lastName} · ${student.grade}` : undefined
        }
      />

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        aria-label="Tezkor mobil menyu"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-14 max-w-[600px] mx-auto">
          {mobileBottomTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
                    isActive
                      ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] tracking-tight truncate max-w-[64px]">
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
