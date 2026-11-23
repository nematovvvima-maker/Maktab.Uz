import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserPlus, Search, Edit3, Trash2, Copy, RefreshCw, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { getGradeNumber } from '../data/initialData';
import {
  REGIONS_CATALOG,
  CLASS_LETTERS,
  DEFAULT_REGION,
  DEFAULT_DISTRICT,
  DEFAULT_SCHOOL,
  getRegionByName,
  formatClassCode,
} from '../data/regionsCatalog';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { getAllowedGrades } from '../utils/adminScope';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TableSkeleton } from '../components/common/Skeleton';
import type { ClassLetter, Student } from '../types';

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const allowedGrades = useMemo(() => getAllowedGrades(user), [user]);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const initialGradeParam = searchParams.get('grade');
  const [classFilter, setClassFilter] = useState(
    initialGradeParam && allowedGrades.includes(initialGradeParam) ? initialGradeParam : 'all'
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginName, setLoginName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState(allowedGrades[0] || '');
  const [classLetter, setClassLetter] = useState<ClassLetter>('G');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [district, setDistrict] = useState(DEFAULT_DISTRICT);
  const [school, setSchool] = useState(DEFAULT_SCHOOL);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const selectedRegionObj = useMemo(
    () => getRegionByName(region) || REGIONS_CATALOG[0],
    [region]
  );
  const selectedDistrictObj = useMemo(
    () =>
      selectedRegionObj.districts.find((d) => d.name === district) ||
      selectedRegionObj.districts[0],
    [selectedRegionObj, district]
  );

  const loadStudents = async () => {
    try {
      const res = await api.getStudents();
      setStudents(res.students);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchClass = classFilter === 'all' || s.grade === classFilter;
      const classCode = formatClassCode(s.grade, s.classLetter).toLowerCase();
      const matchSearch =
        !q ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.login.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.school || '').toLowerCase().includes(q) ||
        (s.district || '').toLowerCase().includes(q) ||
        classCode.includes(q);
      return matchClass && matchSearch;
    });
  }, [students, searchQuery, classFilter]);

  const handleRegionChange = (nextRegion: string) => {
    setRegion(nextRegion);
    const rObj = getRegionByName(nextRegion) || REGIONS_CATALOG[0];
    const firstDist = rObj.districts[0];
    setDistrict(firstDist?.name || '');
    setSchool(firstDist?.schools[0] || '');
  };

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    const dObj = selectedRegionObj.districts.find((d) => d.name === nextDistrict);
    setSchool(dObj?.schools[0] || '');
  };

  const openCreate = () => {
    if (allowedGrades.length === 0) {
      showToast("Sizga hali sinf biriktirilmagan", 'error');
      return;
    }
    setEditing(null);
    setFirstName('');
    setLastName('');
    setLoginName('');
    setPhone('+998');
    setPassword('pass1234');
    setGrade(classFilter !== 'all' ? classFilter : allowedGrades[0]);
    setClassLetter('G');
    setRegion(DEFAULT_REGION);
    setDistrict(DEFAULT_DISTRICT);
    setSchool(DEFAULT_SCHOOL);
    setIsModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setLoginName(student.login);
    setPhone(student.phone);
    setPassword(student.password || 'pass1234');
    setGrade(student.grade);
    setClassLetter(student.classLetter || 'A');
    setRegion(student.region || DEFAULT_REGION);
    setDistrict(student.district || DEFAULT_DISTRICT);
    setSchool(student.school || DEFAULT_SCHOOL);
    setIsModalOpen(true);
  };

  const autoGenerateLogin = () => {
    const base = (firstName || 'student').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'student';
    const num = String(getGradeNumber(grade)).padStart(2, '0');
    setLoginName(`${base}${num}${classLetter.toLowerCase()}`);
  };

  const copyCredentials = async (student: Student) => {
    const text = `O'quvchi: ${student.firstName} ${student.lastName}\nLogin: ${student.login}\nParol: ${student.password || 'pass1234'}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${student.login} — login va parol nusxalandi`, 'info');
    } catch {
      showToast('Nusxa olishda xatolik', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.updateStudent(editing.id, {
          firstName,
          lastName,
          login: loginName,
          phone,
          password,
          grade,
          classLetter,
          region,
          district,
          school,
        });
        showToast(t('studentUpdated'), 'success');
      } else {
        await api.createStudent({
          firstName,
          lastName,
          login: loginName,
          phone,
          password,
          grade,
          classLetter,
          region,
          district,
          school,
        });
        showToast(t('studentAdded'), 'success');
      }
      setIsModalOpen(false);
      await loadStudents();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    try {
      await api.deleteStudent(student.id);
      showToast(t('studentDeleted'), 'success');
      await loadStudents();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "O'chirishda xatolik", 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('students')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {filtered.length} / {students.length} nafar o&apos;quvchi · har birida shaxsiy kirish
            logini mavjud
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={allowedGrades.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('addStudent')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ism, login, ID yoki telefon..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-600"
        >
          <option value="all">{t('allClasses')}</option>
          {allowedGrades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Students List: Mobile Cards + Desktop Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 sm:p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('noData')}</p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('addStudent')}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((student) => (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {student.school || DEFAULT_SCHOOL} ·{' '}
                        {formatClassCode(student.grade, student.classLetter)}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                      {student.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] dark:bg-slate-900/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400">Login / Parol</p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-200 truncate mt-0.5 tabular-nums">
                        <span className="font-semibold text-[#1D4ED8] dark:text-blue-400">
                          {student.login}
                        </span>{' '}
                        / {student.password || 'pass1234'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400">{t('phone')}</p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-200 truncate mt-0.5 tabular-nums">
                        {student.phone}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => copyCredentials(student)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Nusxa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(student)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#1D4ED8] dark:text-blue-400 active:bg-blue-50 dark:active:bg-blue-950/30 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(student)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-red-600 dark:text-red-400 active:bg-red-50 dark:active:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('delete')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">{t('id')}</th>
                    <th className="py-3 px-4">{t('fullName')}</th>
                    <th className="py-3 px-4">Login / Parol</th>
                    <th className="py-3 px-4">{t('gradeClass')}</th>
                    <th className="py-3 px-4">{t('phone')}</th>
                    <th className="py-3 px-6 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {filtered.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {student.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {student.login}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {student.password || 'pass1234'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {student.school || DEFAULT_SCHOOL} · {formatClassCode(student.grade, student.classLetter)}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {student.district || DEFAULT_DISTRICT}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                        {student.phone}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyCredentials(student)}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Login va parolni nusxalash"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(student)}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={t('edit')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(student)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={t('delete')}
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

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? t('editStudent') : t('addStudent')}
        subtitle="O'quvchi ushbu login va parol bilan o'zining shaxsiy portaliga kirishi mumkin."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('name')} *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('enterFirstName')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('lastName')} *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('enterLastName')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Viloyat / Shahar
              </label>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              >
                {REGIONS_CATALOG.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tuman
              </label>
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              >
                {selectedRegionObj.districts.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Maktab
              </label>
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              >
                {(selectedDistrictObj?.schools || []).map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('gradeClass')} *
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
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
                Sinf harfi *
              </label>
              <select
                value={classLetter}
                onChange={(e) => setClassLetter(e.target.value as ClassLetter)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-600"
              >
                {CLASS_LETTERS.map((letter) => (
                  <option key={letter} value={letter}>
                    {letter}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('phone')} *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('enterPhone')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Student Portal Credentials Section */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <KeyRound className="w-3.5 h-3.5" />
              <span>O&apos;quvchi kirish ma&apos;lumotlari</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Login
                  </label>
                  <button
                    type="button"
                    onClick={autoGenerateLogin}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Avto yaratish</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Masalan: sardor09"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('password')} *
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('enterPassword')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
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
        message={`${deleteTarget?.firstName || ''} ${deleteTarget?.lastName || ''} (${deleteTarget?.login || ''}) — ${t('confirmDelete')}`}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
  );
};
