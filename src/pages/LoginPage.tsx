import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { MaktabLogo } from '../components/common/MaktabLogo';
import { SiteFooter } from '../components/common/SiteFooter';
import type { AccountType, Language } from '../types';

const CAMPUS_PHOTO = '/src/assets/images/login_campus_architecture_1795178642591.jpg';

const COPY = {
  uz: {
    heroTitle: 'Zamonaviy maktab boshqaruvi va shaxsiy o‘quvchi kabineti',
    heroBody:
      'Maktab.Uz — umumta’lim maktablari, ustozlar, o‘quvchilar va ota-onalarni yagona raqamli maydonda bog‘lovchi elektron ta’lim tizimi. Dars jadvali, haftalik kundalik, uy vazifalari, fan baholari va davomat ko‘rsatkichlari real vaqt rejimida bir joyda yuritiladi.',
    heroSubNote:
      'Saytga kiritilgan har bir baho, uy vazifasi va davomat o‘zgarishi avtomatik ravishda @MaktabUz1_bot Telegram botiga ham uzatiladi.',
    signInTitle: 'Tizimga kirish',
    signInSubtitle: 'Shaxsiy login va parolingizni kiriting',
    studentTab: "O'quvchi",
    adminTab: 'Administrator',
    loginLabel: 'Login',
    passwordLabel: 'Parol',
    loginBtn: 'Kirish',
    studentPlaceholder: 'Loginni kiriting',
    adminPlaceholder: 'Loginni kiriting',
    aboutHeading: 'Maktab.Uz platformasi haqida',
    aboutLead:
      'Maktab.Uz maktabdagi kundalik o‘quv jarayonini shaffof, tez va qulay boshqarish uchun yaratilgan. Tizim qog‘oz jurnallardan voz kechib, o‘qituvchi, o‘quvchi va ota-ona o‘rtasidagi aloqani bir necha soniyaga qisqartiradi.',
    aboutParagraph:
      'Har bir maktab, sinf va o‘quvchi uchun alohida tartibli hisob yuritiladi. Bosh administrator maktab bo‘yicha barcha 1–11-sinflarni nazorat qiladi, sinf adminlari esa o‘zlariga biriktirilgan sinflarda baho qo‘yadi, davomat oladi va uy vazifalarini joylaydi. O‘quvchilar shaxsiy kabineti orqali o‘z o‘zlashtirish darajasini kuzatib boradi, ota-onalar esa Telegram botdagi maxsus ilova orqali farzandining maktabdagi holatidan doimiy xabardor bo‘ladi.',
    pillars: [
      {
        num: '01.',
        title: 'O‘quvchilar uchun shaxsiy kabinet',
        body: 'Har bir o‘quvchi o‘zining login va paroli orqali kirib, haftalik dars jadvali, fanlar kesimidagi baholari, ustozlar bergan uy vazifalari, davomat tarixi hamda sinf reytingini telefon yoki kompyuterdan bemalol ko‘ra oladi.',
      },
      {
        num: '02.',
        title: 'Ustoz va adminlar uchun aniq nazorat',
        body: 'Sinf rahbarlari va fan o‘qituvchilari o‘quvchilar ro‘yxatini yuritish, baholar jurnalini to‘ldirish, kunlik davomatni belgilash va yangi uy vazifalarini yuborishni bitta qulay paneldan bajaradi.',
      },
      {
        num: '03.',
        title: 'Ota-onalar uchun @MaktabUz1_bot aloqasi',
        body: 'Ustoz saytda o‘quvchini «Kelmadi» deb belgilashi bilan ota-onaning Telegramiga darhol ogohlantirish boradi. Shuningdek, bot ichidagi Open tugmasi orqali farzandning baholari, kundaligi va uy vazifalarini istalgan payt tekshirish mumkin.',
      },
    ],
    footerText: '© 2026 Maktab.Uz · Yagona raqamli maktab va kundalik tizimi',
  },
  ru: {
    heroTitle: 'Современный школьный портал для учеников и администрации',
    heroBody:
      'Maktab.Uz — единая цифровая образовательная платформа, объединяющая школы, учителей, учеников и родителей. Расписание, электронный дневник, домашние задания, оценки и посещаемость синхронизируются в реальном времени.',
    heroSubNote:
      'Все внесённые на сайте оценки, задания и отметки посещаемости автоматически передаются в Telegram-бот @MaktabUz1_bot.',
    signInTitle: 'Вход в систему',
    signInSubtitle: 'Введите ваш персональный логин и пароль',
    studentTab: 'Ученик',
    adminTab: 'Администратор',
    loginLabel: 'Логин',
    passwordLabel: 'Пароль',
    loginBtn: 'Войти',
    studentPlaceholder: 'Введите логин',
    adminPlaceholder: 'Введите логин',
    aboutHeading: 'О платформе Maktab.Uz',
    aboutLead:
      'Maktab.Uz создан для прозрачного, быстрого и удобного управления ежедневным учебным процессом в школах. Платформа заменяет бумажные журналы и обеспечивает мгновенную связь между школой и семьёй.',
    aboutParagraph:
      'Главный администратор контролирует все классы с 1 по 11, а классные администраторы ведут журнал оценок, отмечают посещаемость и публикуют домашние задания по своим классам. Ученики отслеживают успеваемость в личном кабинете, а родители получают уведомления и просматривают дневник ребёнка прямо в Telegram.',
    pillars: [
      {
        num: '01.',
        title: 'Личный кабинет ученика',
        body: 'Каждый ученик входит по личному логину и паролю, чтобы просматривать расписание уроков, оценки по предметам, домашние задания, историю посещаемости и рейтинг класса с любого устройства.',
      },
      {
        num: '02.',
        title: 'Удобная панель для учителей и админов',
        body: 'Преподаватели и администраторы быстро добавляют учеников, выставляют оценки, ведут ежедневный учёт посещаемости и отправляют домашние задания без лишних действий.',
      },
      {
        num: '03.',
        title: 'Мгновенная связь через @MaktabUz1_bot',
        body: 'При отметке отсутствия на уроке родитель сразу получает уведомление в Telegram, а кнопка Open открывает удобное мобильное приложение с оценками, дневником и заданиями.',
      },
    ],
    footerText: '© 2026 Maktab.Uz · Единая цифровая школьная платформа',
  },
  en: {
    heroTitle: 'Modern school management and personal student portal',
    heroBody:
      'Maktab.Uz is a unified digital education platform connecting schools, teachers, students, and parents. Track weekly schedules, grades, homework assignments, and attendance in real time.',
    heroSubNote:
      'Every grade, homework assignment, and attendance update saved on the site syncs automatically with @MaktabUz1_bot on Telegram.',
    signInTitle: 'Sign in to Maktab.Uz',
    signInSubtitle: 'Enter your personal login and password',
    studentTab: 'Student',
    adminTab: 'Administrator',
    loginLabel: 'Login',
    passwordLabel: 'Password',
    loginBtn: 'Sign in',
    studentPlaceholder: 'Enter login',
    adminPlaceholder: 'Enter login',
    aboutHeading: 'About the Maktab.Uz platform',
    aboutLead:
      'Maktab.Uz is built to make daily school operations transparent, fast, and effortless for teachers, students, and families alike.',
    aboutParagraph:
      'School administrators oversee grades 1 through 11 while assigned class admins manage gradebooks, daily attendance, and homework for their classes. Students track their academic progress in a dedicated portal, and parents stay informed through instant Telegram notifications and a built-in diary app.',
    pillars: [
      {
        num: '01.',
        title: 'Personal student workspace',
        body: 'Each student signs in with personal credentials to check weekly timetables, subject grades, teacher-assigned homework, attendance logs, and class standings from phone or desktop.',
      },
      {
        num: '02.',
        title: 'Streamlined teacher & admin tools',
        body: 'Manage student rosters, enter grades in one tap, record daily attendance, and publish homework assignments from a structured, role-scoped dashboard.',
      },
      {
        num: '03.',
        title: 'Live parent updates via @MaktabUz1_bot',
        body: 'When a teacher marks a student absent, parents receive an instant Telegram alert and can open the native mini app to review grades, weekly schedules, and homework anytime.',
      },
    ],
    footerText: '© 2026 Maktab.Uz · Unified digital school & diary platform',
  },
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, theme, toggleTheme } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AccountType>('student');
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const T = COPY[language] || COPY.uz;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !password) {
      showToast('Login va parolni kiriting', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(loginInput.trim(), password, mode);
      if (result.ok) {
        showToast('Xush kelibsiz!', 'success');
        navigate(result.accountType === 'student' ? '/student' : '/', { replace: true });
      } else {
        showToast(result.error || "Noto'g'ri login yoki parol", 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Main Split Hero + Sign-In Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[82vh]">
        {/* Left Visual Brand Column (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 relative bg-[#0F2764] overflow-hidden flex-col justify-between p-12 text-white">
          {!imgError ? (
            <img
              src={CAMPUS_PHOTO}
              alt="Maktab.Uz zamonaviy ta'lim binosi"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F2764] via-[#1D4ED8] to-[#0B1120]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B193D]/95 via-[#0F2764]/80 to-[#1E3A8A]/55" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="bg-white/95 px-3.5 py-2 rounded-xl shadow-xs">
              <MaktabLogo compact />
            </div>
            <span className="font-mono text-xs text-blue-200 tabular-nums">2026 / 2027</span>
          </div>

          <div className="relative z-10 max-w-lg space-y-4">
            <h1 className="font-display text-4xl font-extrabold tracking-tight leading-[1.15] [text-wrap:balance]">
              {T.heroTitle}
            </h1>
            <p className="text-[15px] text-blue-100/95 leading-relaxed">{T.heroBody}</p>
            <p className="text-sm text-blue-200/90 leading-relaxed">{T.heroSubNote}</p>

            <div className="pt-6 border-t border-white/15 grid grid-cols-3 gap-6">
              <div>
                <p className="font-mono text-2xl font-bold tabular-nums">1–11</p>
                <p className="text-xs text-blue-200 mt-0.5">Sinf dasturlari</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold tabular-nums">100%</p>
                <p className="text-xs text-blue-200 mt-0.5">Shaxsiy kabinet</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold tabular-nums">24/7</p>
                <p className="text-xs text-blue-200 mt-0.5">Telegram aloqa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Form Column */}
        <div className="lg:col-span-6 flex flex-col justify-between p-5 sm:p-10 lg:p-14 bg-white dark:bg-[#0B1120] border-b lg:border-b-0 border-slate-200 dark:border-slate-800">
          {/* Top Utility Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <MaktabLogo />
            </div>
            <div className="hidden lg:block text-xs font-medium text-slate-400">
              Maktab.Uz · Yagona ta&apos;lim portali
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
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
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      language === item.code
                        ? 'bg-white dark:bg-slate-900 text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
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
            </div>
          </div>

          {/* Centered Form Box */}
          <div className="w-full max-w-[410px] mx-auto my-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {T.signInTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{T.signInSubtitle}</p>
            </div>

            {/* Account Type Segmented Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('student')}
                className={`min-h-[42px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'student'
                    ? 'bg-white dark:bg-[#111827] text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{T.studentTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={`min-h-[42px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'admin'
                    ? 'bg-white dark:bg-[#111827] text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{T.adminTab}</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {T.loginLabel}
                </label>
                <input
                  id="login-input"
                  type="text"
                  autoComplete="username"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder={mode === 'student' ? T.studentPlaceholder : T.adminPlaceholder}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {T.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Parolni ko'rsatish"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{T.loginBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-xs text-slate-400 text-center lg:text-left">
            Maktab.Uz · 1–11-sinflar · @MaktabUz1_bot
          </p>
        </div>
      </div>

      {/* Platform Overview Section (Visible on Both Desktop & Mobile) */}
      <section className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 space-y-10">
          <div className="max-w-3xl space-y-3.5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              {T.aboutHeading}
            </h2>
            <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              {T.aboutLead}
            </p>
            <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {T.aboutParagraph}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            {T.pillars.map((pillar) => (
              <div key={pillar.num} className="space-y-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  <span className="font-mono text-[#2563EB] dark:text-blue-400 mr-1.5 tabular-nums">
                    {pillar.num}
                  </span>
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
