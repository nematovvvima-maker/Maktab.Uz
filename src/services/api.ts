import type {
  AccountType,
  AdminAccount,
  AdminPermission,
  AdminRole,
  AdminStatus,
  AttendanceData,
  AttendanceStatus,
  AuditLog,
  ChatMessage,
  ClassLetter,
  HomeworkItem,
  Student,
  StudentGrades,
  StudentPortalPayload,
  TelegramParentPayload,
} from '../types';

const TOKEN_KEY = 'maktab_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export type LoginResponse =
  | { token: string; accountType: 'admin'; user: AdminAccount }
  | { token: string; accountType: 'student'; student: Omit<Student, 'password'> };

export type MeResponse =
  | { accountType: 'admin'; user: AdminAccount }
  | { accountType: 'student'; student: Omit<Student, 'password'> };

export const api = {
  login: (login: string, password: string, mode: 'auto' | AccountType = 'auto') =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password, mode }),
    }),

  me: () => request<MeResponse>('/api/auth/me'),

  updateProfile: (payload: {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
  }) =>
    request<{ admin: AdminAccount }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Chats & Announcements
  getChats: () => request<{ messages: ChatMessage[] }>('/api/chats'),

  sendChatMessage: (text: string, channel?: string) =>
    request<{ message: ChatMessage }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ text, channel }),
    }),

  // Student Portal
  getStudentDashboard: () => request<StudentPortalPayload>('/api/student/dashboard'),

  getStudentHomework: () => request<{ items: HomeworkItem[] }>('/api/student/homework'),

  // Homework Management (Admin)
  getAdminHomework: (grade?: string) =>
    request<{ items: HomeworkItem[] }>(
      grade ? `/api/homework?grade=${encodeURIComponent(grade)}` : '/api/homework'
    ),

  createHomework: (payload: {
    grade: string;
    subject: string;
    title: string;
    dueDate: string;
    teacher?: string;
  }) =>
    request<{ item: HomeworkItem }>('/api/homework', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateHomework: (
    id: string,
    payload: Partial<{
      grade: string;
      subject: string;
      title: string;
      dueDate: string;
      teacher: string;
    }>
  ) =>
    request<{ item: HomeworkItem }>(`/api/homework/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteHomework: (id: string) =>
    request<{ ok: boolean }>(`/api/homework/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  updateStudentProfile: (payload: {
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    request<{ student: Omit<Student, 'password'> }>('/api/student/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Admins (Super Admin only)
  getAdmins: () =>
    request<{
      admins: AdminAccount[];
      availableGrades: string[];
      gradeOwners: Record<string, { id: string; fullName: string; login: string }>;
    }>('/api/admins'),

  createAdmin: (payload: {
    fullName: string;
    login: string;
    password: string;
    email: string;
    phone: string;
    role: AdminRole;
    permissions: AdminPermission[];
    assignedGrades: string[];
  }) =>
    request<{ admin: AdminAccount }>('/api/admins', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdmin: (
    id: string,
    payload: Partial<{
      fullName: string;
      login: string;
      password: string;
      email: string;
      phone: string;
      role: AdminRole;
      permissions: AdminPermission[];
      assignedGrades: string[];
      status: AdminStatus;
    }>
  ) =>
    request<{ admin: AdminAccount }>(`/api/admins/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAdmin: (id: string) =>
    request<{ ok: boolean }>(`/api/admins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Students (Admin)
  getStudents: () => request<{ students: Student[] }>('/api/students'),

  createStudent: (payload: {
    firstName: string;
    lastName: string;
    login: string;
    phone: string;
    password: string;
    grade: string;
    classLetter?: ClassLetter;
    region?: string;
    district?: string;
    school?: string;
  }) =>
    request<{ student: Student }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStudent: (
    id: string,
    payload: Partial<{
      firstName: string;
      lastName: string;
      login: string;
      phone: string;
      password: string;
      grade: string;
      classLetter: ClassLetter;
      region: string;
      district: string;
      school: string;
    }>
  ) =>
    request<{ student: Student }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteStudent: (id: string) =>
    request<{ ok: boolean }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Grades
  getGrades: () => request<{ grades: StudentGrades }>('/api/grades'),

  saveGrades: (grades: StudentGrades, gradeLabel: string) =>
    request<{ grades: StudentGrades }>('/api/grades', {
      method: 'PUT',
      body: JSON.stringify({ grades, gradeLabel }),
    }),

  // Attendance
  getAttendance: () => request<{ attendance: AttendanceData }>('/api/attendance'),

  saveAttendance: (date: string, records: Record<string, AttendanceStatus>) =>
    request<{ attendance: AttendanceData }>(`/api/attendance/${encodeURIComponent(date)}`, {
      method: 'PUT',
      body: JSON.stringify({ records }),
    }),

  // Audit logs & System
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/api/audit-logs'),

  exportSystemData: () => request<Record<string, unknown>>('/api/system/export'),

  resetSystemData: () =>
    request<{ ok: boolean }>('/api/system/reset', {
      method: 'POST',
    }),

  // Parent Telegram Mini App ("Open")
  getTelegramParentData: (token: string) =>
    request<TelegramParentPayload>(`/api/tg-app/student?token=${encodeURIComponent(token)}`),
};
