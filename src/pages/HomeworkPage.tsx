import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Calendar, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSubjectsForGrade } from '../data/initialData';
import { getAllowedGrades } from '../utils/adminScope';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TableSkeleton } from '../components/common/Skeleton';
import type { HomeworkItem } from '../types';

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
}

export const HomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);
  const initialGradeParam = searchParams.get('grade');

  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>(
    initialGradeParam && allowedGrades.includes(initialGradeParam) ? initialGradeParam : 'all'
  );
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkItem | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultFormGrade = allowedGrades[0] || '';
  const [formGrade, setFormGrade] = useState<string>(defaultFormGrade);
  const [formSubject, setFormSubject] = useState<string>(
    defaultFormGrade ? getSubjectsForGrade(defaultFormGrade)[0] || '' : ''
  );
  const [formTitle, setFormTitle] = useState('');
  const [formDueDate, setFormDueDate] = useState(defaultDueDate());
  const [formTeacher, setFormTeacher] = useState(user?.fullName || '');

  const [deleteTarget, setDeleteTarget] = useState<HomeworkItem | null>(null);

  const loadHomework = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminHomework();
      setItems(res.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, []);

  const subjectsForFormGrade = useMemo(() => getSubjectsForGrade(formGrade), [formGrade]);

  const handleGradeChange = (nextGrade: string) => {
    setFormGrade(nextGrade);
    const nextSubjects = getSubjectsForGrade(nextGrade);
    if (!nextSubjects.includes(formSubject)) {
      setFormSubject(nextSubjects[0] || '');
    }
  };

  const openCreateModal = () => {
    if (allowedGrades.length === 0) {
      showToast('Sizga hali sinf biriktirilmagan', 'error');
      return;
    }
    const initialGrade = gradeFilter !== 'all' ? gradeFilter : allowedGrades[0];
    const subjects = getSubjectsForGrade(initialGrade);
    setEditing(null);
    setFormGrade(initialGrade);
    setFormSubject(subjects[0] || '');
    setFormTitle('');
    setFormDueDate(defaultDueDate());
    setFormTeacher(user?.fullName || '');
    setModalOpen(true);
  };

  const openEditModal = (hw: HomeworkItem) => {
    setEditing(hw);
    setFormGrade(hw.grade);
    setFormSubject(hw.subject);
    setFormTitle(hw.title);
    setFormDueDate(hw.dueDate);
    setFormTeacher(hw.teacher);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate.trim()) {
      showToast('Vazifa matni va muddatni kiriting', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const res = await api.updateHomework(editing.id, {
          grade: formGrade,
          subject: formSubject,
          title: formTitle.trim(),
          dueDate: formDueDate,
          teacher: formTeacher.trim() || user?.fullName || 'O‘qituvchi',
        });
        setItems((prev) => prev.map((item) => (item.id === editing.id ? res.item : item)));
        showToast('Uy vazifasi yangilandi', 'success');
      } else {
        const res = await api.createHomework({
          grade: formGrade,
          subject: formSubject,
          title: formTitle.trim(),
          dueDate: formDueDate,
          teacher: formTeacher.trim() || user?.fullName || 'O‘qituvchi',
        });
        setItems((prev) => [res.item, ...prev]);
        showToast('Yangi uy vazifasi o‘quvchilarga yuborildi', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteHomework(deleteTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      showToast("Uy vazifasi o'chirildi", 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : "O'chirishda xatolik", 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (gradeFilter !== 'all' && item.grade !== gradeFilter) return false;
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.teacher.toLowerCase().includes(q) ||
        item.grade.toLowerCase().includes(q)
      );
    });
  }, [items, gradeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Uy vazifalari boshqaruvi
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Har bir sinf va fan bo&apos;yicha topshiriqlar qo&apos;shing — o&apos;quvchilar o&apos;z
            kabinetida darhol ko&apos;radi.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={allowedGrades.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Uy vazifasi qo&apos;shish</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fan, mavzu yoki o'qituvchi bo'yicha qidirish..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">Barcha sinflar ({items.length})</option>
            {allowedGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Homework Ledger: Mobile Cards + Desktop Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tanlangan filtr bo&apos;yicha uy vazifalari topilmadi.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Birinchi vazifani qo&apos;shish</span>
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Homework Cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((hw) => (
                  <div key={hw.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#1D4ED8] dark:text-blue-400">
                        {hw.grade}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{hw.dueDate}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                        {hw.subject}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                        {hw.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5">Ustoz: {hw.teacher}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(hw)}
                        className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#1D4ED8] dark:text-blue-400 active:bg-blue-50 dark:active:bg-blue-950/30 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(hw)}
                        className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-red-600 dark:text-red-400 active:bg-red-50 dark:active:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>O&apos;chirish</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 w-24">Sinf</th>
                      <th className="py-3 px-4 w-44">Fan</th>
                      <th className="py-3 px-4">Topshiriq matni</th>
                      <th className="py-3 px-4 w-40">O&apos;qituvchi</th>
                      <th className="py-3 px-4 w-32">Muddat</th>
                      <th className="py-3 px-4 w-24 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {filtered.map((hw) => (
                      <tr
                        key={hw.id}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#1D4ED8] dark:text-blue-400 whitespace-nowrap">
                          {hw.grade}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {hw.subject}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed max-w-md">
                          {hw.title}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {hw.teacher}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{hw.dueDate}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(hw)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-[#1D4ED8] hover:bg-[#EFF6FF] dark:hover:bg-blue-950/40 transition-colors"
                              title="Tahrirlash"
                              aria-label="Tahrirlash"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(hw)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="O'chirish"
                              aria-label="O'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create / Edit Homework Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Uy vazifasini tahrirlash' : "Yangi uy vazifasi qo'shish"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sinf
              </label>
              <select
                value={formGrade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
              >
                {allowedGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Fan
              </label>
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
              >
                {subjectsForFormGrade.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Topshiriq matni
            </label>
            <textarea
              rows={3}
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Masalan: 14-paragrafni o'qish va 214–218-misollarni daftariga yechish"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Topshirish muddati
              </label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                O&apos;qituvchi ismi
              </label>
              <input
                type="text"
                value={formTeacher}
                onChange={(e) => setFormTeacher(e.target.value)}
                placeholder="M. Qodirova"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Uy vazifasini o'chirish"
        message={
          deleteTarget
            ? `"${deleteTarget.grade} · ${deleteTarget.subject}" uy vazifasini o'chirishni tasdiqlaysizmi?`
            : ''
        }
        confirmText="O'chirish"
        cancelText="Bekor qilish"
      />
    </div>
  );
};
