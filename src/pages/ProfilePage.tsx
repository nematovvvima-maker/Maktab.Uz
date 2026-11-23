import React, { useState, useEffect } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings, TranslationKey } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { getAllowedGrades, isSuperAdmin } from '../utils/adminScope';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useSettings();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setPhone(user.phone);
    }
  }, [user]);

  if (!user) return null;

  const superAdmin = isSuperAdmin(user);
  const allowedGrades = getAllowedGrades(user);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Parameters<typeof api.updateProfile>[0] = {
        fullName,
        email,
        phone,
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }
      await api.updateProfile(payload);
      await refreshUser();
      setNewPassword('');
      showToast(t('profileUpdated'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t('adminProfile')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
          {user.id} · {user.login} · {user.role}
        </p>
      </div>

      {/* Account Summary */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
              {user.fullName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user.role} · {t('activeStatus')}
            </p>
          </div>
          <ShieldCheck className="w-6 h-6 text-[#2563EB] dark:text-blue-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Biriktirilgan sinflar</p>
            <p className="mt-1 font-mono text-xs font-semibold text-[#1D4ED8] dark:text-blue-400">
              {superAdmin
                ? 'Barcha 11 sinf'
                : allowedGrades.length > 0
                ? allowedGrades.join(' · ')
                : 'Biriktirilmagan'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('permissions')}</p>
            <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium text-xs">
              {user.permissions.map((p) => t(`perm_${p}` as TranslationKey)).join(' · ')}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('lastLoginTime')}</p>
            <p className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200 tabular-nums">
              {user.lastLogin ? new Date(user.lastLogin).toLocaleString('uz-UZ') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Editable Form */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-[#181A1E] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5"
      >
        <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-50">
          {t('updateProfile')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t('fullName')}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-[#111315] border border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-[#111315] border border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t('phone')}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-[#111315] border border-zinc-300 dark:border-zinc-700 text-sm font-mono focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t('password')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('newPasswordHint')}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-[#111315] border border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('loading') : t('save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
