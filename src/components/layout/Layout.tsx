import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Layers,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Trophy,
  MessageSquare,
  UserCircle,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { MaktabLogo } from '../common/MaktabLogo';
import { SiteFooter } from '../common/SiteFooter';
import { getAllowedGrades, isSuperAdmin } from '../../utils/adminScope';
import type { Language } from '../../types';

const NAV_COPY = {
  uz: {
    dashboard: 'Boshqaruv',
    admins: 'Adminlar paneli',
    myClasses: 'Sinflarim',
    students: "O'quvchilar",
    grades: 'Baholar jurnali',
    attendance: 'Davomat',
    homework: 'Uy vazifalari',
    rating: 'Reyting',
    chats: 'Chatlar',
    profile: 'Profil',
    settings: 'Sozlamalar',
    logout: 'Chiqish',
    groupMain: 'Boshqaruv',
    groupAcademic: "O'quv jarayoni",
    groupSystem: 'Tizim',
  },
  ru: {
    dashboard: 'Главная',
    admins: 'Панель админов',
    myClasses: 'Мои классы',
    students: 'Ученики',
    grades: 'Журнал оценок',
    attendance: 'Посещаемость',
    homework: 'Домашние задания',
    rating: 'Рейтинг',
    chats: 'Чаты',
    profile: 'Профиль',
    settings: 'Настройки',
    logout: 'Выход',
    groupMain: 'Управление',
    groupAcademic: 'Учебный процесс',
    groupSystem: 'Система',
  },
  en: {
    dashboard: 'Dashboard',
    admins: 'Admin Panel',
    myClasses: 'My Classes',
    students: 'Students',
    grades: 'Gradebook',
    attendance: 'Attendance',
    homework: 'Homework',
    rating: 'Leaderboard',
    chats: 'Chats',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Sign Out',
    groupMain: 'Management',
    groupAcademic: 'Academics',
    groupSystem: 'System',
  },
};

export const Layout: React.FC = () => {
  const { logout, user } = useAuth();
  const { language, setLanguage, theme, toggleTheme } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const L = NAV_COPY[language] || NAV_COPY.uz;
  const superAdmin = isSuperAdmin(user);
  const allowedGrades = getAllowedGrades(user);

  const navGroups = [
    {
      label: L.groupMain,
      items: superAdmin
        ? [
            { path: '/', label: L.dashboard, icon: LayoutDashboard, end: true },
            { path: '/admins', label: L.admins, icon: ShieldCheck },
          ]
        : [
            { path: '/', label: L.dashboard, icon: LayoutDashboard, end: true },
            { path: '/my-classes', label: L.myClasses, icon: Layers },
          ],
    },
    {
      label: L.groupAcademic,
      items: [
        { path: '/students', label: L.students, icon: Users },
        { path: '/grades', label: L.grades, icon: BookOpen },
        { path: '/attendance', label: L.attendance, icon: CalendarCheck },
        { path: '/homework', label: L.homework, icon: ClipboardList },
        { path: '/rating', label: L.rating, icon: Trophy },
        { path: '/chats', label: L.chats, icon: MessageSquare },
      ],
    },
    {
      label: L.groupSystem,
      items: [
        { path: '/profile', label: L.profile, icon: UserCircle },
        { path: '/settings', label: L.settings, icon: Settings },
      ],
    },
  ];

  const allItems = navGroups.flatMap((g) => g.items);
  const currentTitle =
    allItems.find((item) =>
      item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
    )?.label || L.dashboard;

  const mobileAdminTabs = [
    { path: '/', label: language === 'uz' ? 'Asosiy' : L.dashboard, icon: LayoutDashboard, end: true },
    { path: '/students', label: L.students, icon: Users },
    { path: '/grades', label: language === 'uz' ? 'Baholar' : L.grades, icon: BookOpen },
    { path: '/attendance', label: L.attendance, icon: CalendarCheck },
    { path: '/homework', label: language === 'uz' ? 'Vazifa' : L.homework, icon: ClipboardList },
  ];

  const handleLogout = () => {
    logout();
    showToast(L.logout, 'info');
    navigate('/login');
  };

  const renderSidebarContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <NavLink to="/" onClick={onItemClick} className="focus:outline-none">
          <MaktabLogo />
        </NavLink>
        {onItemClick && (
          <button
            type="button"
            onClick={onItemClick}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#EFF6FF] dark:bg-blue-950/50 text-[#1D4ED8] dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="px-3 py-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user?.fullName || user?.login}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {superAdmin
                ? 'Bosh Admin · Barcha sinflar'
                : allowedGrades.length > 0
                ? allowedGrades.join(', ')
                : 'Sinf biriktirilmagan'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
            title={L.logout}
            aria-label={L.logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[248px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 fixed inset-y-0 left-0 z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[264px] max-w-[82vw] bg-white dark:bg-[#111827] h-full shadow-xl z-10">
            {renderSidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[248px]">
        {/* Crisp Top Header Bar */}
        <header className="sticky top-0 z-20 h-14 sm:h-16 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden min-h-[40px] min-w-[40px] -ml-1 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Menyu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 whitespace-nowrap">
                Maktab.Uz
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
              <h1 className="font-display font-bold text-slate-900 dark:text-white truncate text-[15px] sm:text-base">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Compact Language Segmented Switch */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700">
              {(
                [
                  { code: 'uz', label: "O'z" },
                  { code: 'ru', label: 'Ru' },
                  { code: 'en', label: 'En' },
                ] as { code: Language; label: string }[]
              ).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    language === item.code
                      ? 'bg-white dark:bg-slate-900 text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Mavzuni almashtirish"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <NavLink
              to="/homework"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>{L.homework}</span>
            </NavLink>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-8">
          <Outlet />
        </main>

        <SiteFooter withMobileNavOffset />

        {/* Mobile Fixed Bottom Quick Bar for Admins */}
        <nav
          aria-label="Admin mobil menyusi"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
        >
          <div className="grid grid-cols-5 h-14 max-w-[600px] mx-auto">
            {mobileAdminTabs.map((tab) => {
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
                  <span className="text-[10px] tracking-tight truncate max-w-[66px]">
                    {tab.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
