import React, { useState } from 'react';
import { Sun, Moon, Download, RotateCcw, Copy, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin } from '../utils/adminScope';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import type { Language } from '../types';

const SUPABASE_SCHEMA_PREVIEW = `-- Supabase PostgreSQL (supabase/schema.sql)
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Admin',
  permissions TEXT[] NOT NULL DEFAULT ARRAY['students','grades','attendance','admins'],
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const { showToast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const superAdmin = isSuperAdmin(user);

  const handleExport = async () => {
    try {
      const data = await api.exportSystemData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maktab-uz-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('exportData'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Eksportda xatolik', 'error');
    }
  };

  const handleReset = async () => {
    try {
      await api.resetSystemData();
      showToast(t('resetSuccess'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tiklashda xatolik', 'error');
    }
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_PREVIEW);
      setCopied(true);
      showToast(t('copied'), 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Nusxa olishda xatolik', 'error');
    }
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'uz', label: "O'zbekcha" },
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('settings')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {t('appearance')} · {t('language')} · {t('dataManagement')}
        </p>
      </div>

      {/* Appearance & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-[#181A1E] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-50">
            {t('appearance')}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>{t('lightMode')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-950/50 text-blue-200'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{t('darkMode')}</span>
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
            {t('language')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
                  language === lang.code
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Data Management (Super Admin only) */}
      {superAdmin && (
        <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
            {t('dataManagement')}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('exportData')}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('resetDefaultData')}</span>
            </button>
          </div>
        </section>
      )}

      {/* Project Architecture & Deployment Blueprint */}
      <section className="bg-white dark:bg-[#181A1E] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-50">
            {t('stackTitle')}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('stackSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">01. Backend</p>
            <p className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
              Nest.js / REST API
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              /api/auth · /api/admins · /api/students
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">02. Frontend</p>
            <p className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
              Next.js / React SPA
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Tailwind v4 · Dual Theme · UZ/EN/RU
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">03. Database</p>
            <p className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
              Supabase PostgreSQL
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              supabase/schema.sql + RLS tayyor
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">04. Deployment</p>
            <p className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
              Vercel &amp; Railway
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              vercel.json va railway.json qo&apos;shilgan
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              supabase/schema.sql
            </span>
            <button
              type="button"
              onClick={copySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('copied') : t('copySql')}</span>
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-200 text-xs font-mono overflow-x-auto leading-relaxed">
            {SUPABASE_SCHEMA_PREVIEW}
          </pre>
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title={t('resetDefaultData')}
        message="Barcha o'quvchilar, baholar va davomat yozuvlari boshlang'ich holatga qaytariladi (admin hisoblari saqlanib qoladi). Davom etasizmi?"
        confirmText={t('resetDefaultData')}
        cancelText={t('cancel')}
      />
    </div>
  );
};
