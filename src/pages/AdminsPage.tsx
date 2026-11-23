import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldPlus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  Ban,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Lock,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { ALL_GRADES } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import { useSettings, TranslationKey } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TableSkeleton } from '../components/common/Skeleton';
import type { AdminAccount, AdminPermission, AdminRole, AuditLog } from '../types';

const ALL_PERMISSIONS: { id: AdminPermission; labelKey: TranslationKey }[] = [
  { id: 'students', labelKey: 'perm_students' },
  { id: 'grades', labelKey: 'perm_grades' },
  { id: 'attendance', labelKey: 'perm_attendance' },
  { id: 'settings', labelKey: 'perm_settings' },
];

const ROLES: AdminRole[] = ['Admin', 'Moderator', 'Super Admin'];

export const AdminsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useSettings();
  const { showToast } = useToast();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [gradeOwners, setGradeOwners] = useState<
    Record<string, { id: string; fullName: string; login: string }>
  >({});
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'logs'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [fullName, setFullName] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AdminRole>('Admin');
  const [permissions, setPermissions] = useState<AdminPermission[]>([
    'students',
    'grades',
    'attendance',
  ]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);

  const loadData = async () => {
    try {
      const [aRes, lRes] = await Promise.all([api.getAdmins(), api.getAuditLogs()]);
      setAdmins(aRes.admins);
      setAvailableGrades(aRes.availableGrades || []);
      setGradeOwners(aRes.gradeOwners || {});
      setLogs(lRes.logs);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return admins.filter((a) => {
      const matchesRole = roleFilter === 'all' || a.role === roleFilter;
      const gradesText = (a.assignedGrades || []).join(' ').toLowerCase();
      const matchesSearch =
        !q ||
        a.fullName.toLowerCase().includes(q) ||
        a.login.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        gradesText.includes(q);
      return matchesRole && matchesSearch;
    });
  }, [admins, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const active = admins.filter((a) => a.status === 'active').length;
    const assignedCount = ALL_GRADES.length - availableGrades.length;
    return {
      total: admins.length,
      active,
      emptyGrades: availableGrades.length,
      assignedCount,
      logsCount: logs.length,
    };
  }, [admins, availableGrades, logs]);

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFullName('');
    setLoginName('');
    setPassword('');
    setShowPass(false);
    setEmail('');
    setPhone('+998');
    setRole('Admin');
    setPermissions(['students', 'grades', 'attendance']);
    setSelectedGrades(availableGrades.length > 0 ? [availableGrades[0]] : []);
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminAccount) => {
    setEditingAdmin(admin);
    setFullName(admin.fullName);
    setLoginName(admin.login);
    setPassword('');
    setShowPass(false);
    setEmail(admin.email);
    setPhone(admin.phone);
    setRole(admin.role);
    setPermissions(admin.permissions.length ? admin.permissions : ['students', 'grades', 'attendance']);
    setSelectedGrades(Array.isArray(admin.assignedGrades) ? admin.assignedGrades : []);
    setIsModalOpen(true);
  };

  const togglePermission = (perm: AdminPermission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleGrade = (grade: string) => {
    const owner = gradeOwners[grade];
    if (owner && owner.id !== editingAdmin?.id) return;
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 8; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(out);
    setShowPass(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'Super Admin' && selectedGrades.length === 0) {
      showToast("Oddiy admin uchun kamida bitta bo'sh sinfni tanlang", 'error');
      return;
    }

    setSaving(true);
    try {
      const finalPermissions: AdminPermission[] =
        role === 'Super Admin'
          ? ['students', 'grades', 'attendance', 'admins', 'settings']
          : permissions.filter((p) => p !== 'admins');
      const finalGrades = role === 'Super Admin' ? [] : selectedGrades;

      if (editingAdmin) {
        const payload: Parameters<typeof api.updateAdmin>[1] = {
          fullName,
          login: loginName,
          email,
          phone,
          role,
          permissions: finalPermissions,
          assignedGrades: finalGrades,
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        await api.updateAdmin(editingAdmin.id, payload);
        showToast(t('adminUpdated'), 'success');
        if (editingAdmin.id === user?.id) {
          await refreshUser();
        }
      } else {
        await api.createAdmin({
          fullName,
          login: loginName,
          password,
          email,
          phone,
          role,
          permissions: finalPermissions,
          assignedGrades: finalGrades,
        });
        showToast(t('adminAdded'), 'success');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (admin: AdminAccount) => {
    const nextStatus = admin.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateAdmin(admin.id, { status: nextStatus });
      showToast(t('adminUpdated'), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi', 'error');
    }
  };

  const handleDelete = async (admin: AdminAccount) => {
    try {
      await api.deleteAdmin(admin.id);
      showToast(t('adminDeleted'), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi', 'error');
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return t('neverLoggedIn');
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('adminPanelTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Bosh administrator paneli — yangi adminlar qo&apos;shing va ularga faqat bo&apos;sh
            sinflarni biriktiring.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <ShieldPlus className="w-4 h-4" />
          <span>{t('addAdmin')}</span>
        </button>
      </div>

      {/* 4-Column Summary Ledger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('totalAdmins')}</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('activeAdmins')}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {stats.active}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Bo&apos;sh sinflar
          </p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-semibold text-[#1D4ED8] dark:text-blue-400 tabular-nums">
              {stats.emptyGrades}
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {stats.assignedCount} band
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('activityHistory')}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {stats.logsCount}
          </p>
        </div>
      </div>

      {/* Empty Grades Overview Strip */}
      {!loading && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              Bo&apos;sh sinflar ({availableGrades.length}):
            </span>{' '}
            {availableGrades.length > 0 ? (
              <span className="font-mono text-[#1D4ED8] dark:text-blue-400">
                {availableGrades.join(' · ')}
              </span>
            ) : (
              <span className="text-slate-500">Barcha 11 sinf adminlarga taqsimlangan</span>
            )}
          </div>
          {availableGrades.length > 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              Bo&apos;sh sinfga admin biriktirish →
            </button>
          )}
        </div>
      )}

      {/* Workspace Tabs & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'list'
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('adminListTab')} ({admins.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('activityHistory')} ({logs.length})
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ism, login yoki sinf..."
                className="w-full sm:w-60 pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-x-auto">
              {(['all', 'Super Admin', 'Admin', 'Moderator'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    roleFilter === r
                      ? 'bg-[#2563EB] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {r === 'all' ? t('allRoles') : r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      {activeTab === 'list' ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('noData')}</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
              >
                <ShieldPlus className="w-4 h-4" />
                <span>{t('addAdmin')}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">{t('fullName')} / Login</th>
                    <th className="py-3 px-4">{t('userRole')}</th>
                    <th className="py-3 px-4">Biriktirilgan sinflar</th>
                    <th className="py-3 px-4">{t('status')}</th>
                    <th className="py-3 px-4">
                      {t('addedBy')} / {t('lastLogin')}
                    </th>
                    <th className="py-3 px-6 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {filteredAdmins.map((admin) => {
                    const isSelf = admin.id === user?.id;
                    const isSuper = admin.role === 'Super Admin';
                    return (
                      <tr
                        key={admin.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{admin.fullName}</span>
                            {isSelf && (
                              <span className="text-xs font-medium text-[#1D4ED8] dark:text-blue-400">
                                ({t('youBadge')})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 tabular-nums">
                            {admin.login} · {admin.id}
                            {admin.phone ? ` · ${admin.phone}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              isSuper
                                ? 'text-[#1D4ED8] dark:text-blue-400'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {admin.role}
                          </span>
                          {admin.email && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {admin.email}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {isSuper ? (
                            <span className="text-xs font-semibold text-[#1D4ED8] dark:text-blue-400">
                              Barcha 11 sinf (To&apos;liq huquq)
                            </span>
                          ) : admin.assignedGrades && admin.assignedGrades.length > 0 ? (
                            <p className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                              {admin.assignedGrades.join(' · ')}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400">Biriktirilmagan</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {admin.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('active')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                              <Ban className="w-3.5 h-3.5" />
                              <span>{t('suspended')}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {admin.createdBy}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">
                            {formatDateTime(admin.lastLogin)}
                          </p>
                        </td>

                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(admin)}
                              className="p-2 rounded-lg text-slate-500 hover:text-[#1D4ED8] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title={t('edit')}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(admin)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title={
                                    admin.status === 'active'
                                      ? t('suspendAdmin')
                                      : t('activateAdmin')
                                  }
                                >
                                  {admin.status === 'active' ? (
                                    <Ban className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(admin)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title={t('delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Activity Log View */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">{t('noData')}</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 dark:hover:bg-slate-800/20"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      <span className="font-semibold">{log.actorName}</span>
                      <span className="font-mono text-xs text-slate-500 ml-1.5">
                        ({log.actorLogin})
                      </span>
                      <span className="text-slate-400 mx-2" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{log.details}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Obyekt: {log.target}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Admin Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAdmin ? t('editAdmin') : t('addAdmin')}
        subtitle={
          editingAdmin
            ? `${editingAdmin.id} · ${editingAdmin.login}`
            : "Yangi admin qo'shing va faqat bo'sh sinflardan biriktiring."
        }
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('fullName')} *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Azizbek Toshmatov"
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('loginName')} *
              </label>
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Azizbek"
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maktab.uz"
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('phone')}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('password')} {editingAdmin ? '' : '*'}
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563EB] dark:text-blue-400 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('generatePassword')}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required={!editingAdmin}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingAdmin ? t('newPasswordHint') : 'Kamida 4 belgi'}
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Parolni ko'rsatish"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('userRole')}
              </label>
              <select
                value={role}
                disabled={editingAdmin?.id === user?.id}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exclusive Empty-Grade Assignment Selector */}
          {role !== 'Super Admin' ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Biriktiriladigan sinflar (faqat bo&apos;sh sinflar) *
                </label>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  Tanlandi: {selectedGrades.length}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {ALL_GRADES.map((grade) => {
                  const owner = gradeOwners[grade];
                  const occupiedByOther = Boolean(owner && owner.id !== editingAdmin?.id);
                  const isSelected = selectedGrades.includes(grade);

                  return (
                    <button
                      key={grade}
                      type="button"
                      disabled={occupiedByOther}
                      onClick={() => toggleGrade(grade)}
                      className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                        occupiedByOther
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/40 text-[#1D4ED8] dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-[#2563EB]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-semibold">{grade}</span>
                        {occupiedByOther ? (
                          <Lock className="w-3 h-3 shrink-0 opacity-70" />
                        ) : isSelected ? (
                          <Check className="w-3.5 h-3.5 shrink-0 text-[#2563EB]" />
                        ) : null}
                      </div>
                      <p className="text-[10px] truncate mt-0.5 opacity-80">
                        {occupiedByOther
                          ? `Band: ${owner?.login}`
                          : isSelected
                          ? 'Tanlangan'
                          : "Bo'sh"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Boshqa adminga berilgan sinflar qulflangan — yangi admin faqat o&apos;ziga
                biriktirilgan sinflarni ko&apos;radi.
              </p>
            </div>
          ) : (
            <div className="px-3.5 py-2.5 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-[#1D4ED8] dark:text-blue-300">
              Super Admin maktabdagi barcha 11 sinfni va Adminlar panelini to&apos;liq boshqaradi.
            </div>
          )}

          {role !== 'Super Admin' && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('permissions')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_PERMISSIONS.map((perm) => {
                  const checked = permissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        checked
                          ? 'border-[#2563EB]/60 bg-[#EFF6FF]/80 dark:bg-blue-950/30 text-[#1D4ED8] dark:text-blue-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.id)}
                        className="accent-[#2563EB] rounded"
                      />
                      <span className="truncate">{t(perm.labelKey)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white disabled:opacity-60 transition-colors"
            >
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title={t('delete')}
        message={`${deleteTarget?.fullName || ''} (${deleteTarget?.login || ''}) admin hisobini o'chirishni tasdiqlaysizmi? Unga biriktirilgan sinflar bo'sh sinflarga qaytadi.`}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
  );
};
