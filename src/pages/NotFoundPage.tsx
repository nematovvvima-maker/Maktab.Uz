import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MaktabLogo } from '../components/common/MaktabLogo';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated, accountType } = useAuth();
  const navigate = useNavigate();

  const homePath = !isAuthenticated ? '/login' : accountType === 'student' ? '/student' : '/';
  const homeLabel = !isAuthenticated ? 'Kirish sahifasiga o‘tish' : 'Asosiy sahifaga qaytish';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(homePath)}
          className="focus:outline-none"
        >
          <MaktabLogo />
        </button>
        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 tabular-nums">
          Xatolik · 404
        </span>
      </header>

      <main className="w-full max-w-md mx-auto my-10">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
            <Compass className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight text-[#2563EB] dark:text-blue-400 tabular-nums leading-none">
              404
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sahifa topilmadi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Siz ochmoqchi bo&apos;lgan sahifa mavjud emas, manzili noto&apos;g&apos;ri yozilgan
              yoki boshqa bo&apos;limga ko&apos;chirilgan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Orqaga</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(homePath, { replace: true })}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>{homeLabel}</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-slate-400 dark:text-slate-500">
        © 2026 Maktab.Uz · Yagona ta&apos;lim portali
      </footer>
    </div>
  );
};
