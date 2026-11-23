import React, { useState } from 'react';
import { Save, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export const StudentProfilePage: React.FC = () => {
  const { student, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState(student?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateStudentProfile({
        phone,
        ...(newPassword.trim()
          ? { currentPassword: currentPassword.trim(), newPassword: newPassword.trim() }
          : {}),
      });
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      showToast("Profil ma'lumotlari saqlandi", 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Shaxsiy profilim
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
          {student.id} · {student.login} · {student.grade}
        </p>
      </div>

      {/* Student ID Sheet */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {student.grade} o&apos;quvchisi
            </p>
          </div>
          <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">O&apos;quvchi ID</p>
            <p className="mt-1 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {student.id}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kirish logini</p>
            <p className="mt-1 font-mono font-semibold text-blue-700 dark:text-blue-400">
              {student.login}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ro&apos;yxatdan o&apos;tgan sana</p>
            <p className="mt-1 font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              {student.createdAt}
            </p>
          </div>
        </div>
      </div>

      {/* Update Phone & Password */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
      >
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Aloqa va parol sozlamalari
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Telefon raqami
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Joriy parol (o&apos;zgartirish uchun)
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Joriy parol"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Yangi parol
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kamida 4 belgi"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
