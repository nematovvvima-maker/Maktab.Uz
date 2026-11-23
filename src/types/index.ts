export type AccountType = 'admin' | 'student';

export type AdminRole = 'Super Admin' | 'Admin' | 'Moderator';

export type AdminPermission =
  | 'students'
  | 'grades'
  | 'attendance'
  | 'admins'
  | 'settings';

export type AdminStatus = 'active' | 'suspended';

export interface AdminAccount {
  id: string;
  fullName: string;
  login: string;
  email: string;
  phone: string;
  role: AdminRole;
  permissions: AdminPermission[];
  assignedGrades: string[];
  status: AdminStatus;
  createdBy: string;
  createdAt: string;
  lastLogin: string | null;
}

export interface AuditLog {
  id: string;
  actorLogin: string;
  actorName: string;
  action:
    | 'admin_created'
    | 'admin_updated'
    | 'admin_deleted'
    | 'student_created'
    | 'student_updated'
    | 'student_deleted'
    | 'grades_updated'
    | 'attendance_updated'
    | 'homework_created'
    | 'homework_updated'
    | 'homework_deleted'
    | 'system_reset';
  target: string;
  details: string;
  createdAt: string;
}

export type ClassLetter = 'A' | 'B' | 'V' | 'G' | 'D';

export interface Student {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  phone: string;
  password?: string;
  grade: string;
  classLetter?: ClassLetter;
  region?: string;
  district?: string;
  school?: string;
  createdAt: string;
}

export type GradeValue = 2 | 3 | 4 | 5;

export interface StudentGrades {
  [studentId: string]: {
    [subject: string]: GradeValue;
  };
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceData {
  [date: string]: {
    [studentId: string]: AttendanceStatus;
  };
}

export type ThemeMode = 'light' | 'dark';
export type Language = 'uz' | 'en' | 'ru';

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
}

export interface StudentRating {
  rank: number;
  student: Student;
  averageGrade: number;
  totalGradesCount: number;
}

export interface StudentLeaderboardEntry {
  rank: number;
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  averageGrade: number;
  totalGradesCount: number;
  isCurrentStudent: boolean;
}

export interface StudentAttendanceEntry {
  date: string;
  status: AttendanceStatus;
}

export interface StudentPortalPayload {
  student: Omit<Student, 'password'>;
  subjects: string[];
  grades: Record<string, GradeValue>;
  averageGrade: number;
  gradedCount: number;
  attendanceHistory: StudentAttendanceEntry[];
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  classRank: number;
  classTotal: number;
  schoolRank: number;
  schoolTotal: number;
  classLeaderboard: StudentLeaderboardEntry[];
  schoolLeaderboard: StudentLeaderboardEntry[];
}

export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  teacher: string;
  grade: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'Administrator' | "O'quvchi";
  senderLogin: string;
  channel: string;
  text: string;
  createdAt: string;
}

export interface ScheduleLesson {
  period: number;
  time: string;
  subject: string;
  room: string;
  teacher: string;
  homework?: string;
}

export interface DaySchedule {
  dayKey: string;
  dayUz: string;
  dayRu: string;
  dayEn: string;
  lessons: ScheduleLesson[];
}

export interface TelegramParentPayload {
  student: Omit<Student, 'password'>;
  classCode: string;
  subjects: string[];
  grades: Record<string, GradeValue>;
  averageGrade: number;
  gradedCount: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  attendanceHistory: StudentAttendanceEntry[];
  weeklySchedule: DaySchedule[];
  homework: HomeworkItem[];
}

export interface TelegramChatLink {
  chatId: string;
  studentId: string;
  role: 'parent' | 'student';
  userName: string;
  updatedAt: string;
}

export interface TelegramSessionSummary {
  chatId: string;
  userName: string;
  regionName?: string;
  districtName?: string;
  schoolName?: string;
  classCode?: string;
  studentName?: string;
  role?: 'parent' | 'student';
  updatedAt: string;
}

export interface TelegramBotStatus {
  connected: boolean;
  running: boolean;
  botUsername: string | null;
  botFirstName: string | null;
  appBaseUrl: string;
  lastError: string | null;
  linkedParentsCount: number;
  linkedStudentsCount: number;
  recentSessions: TelegramSessionSummary[];
}

export interface TelegramInlineButton {
  text: string;
  callbackData?: string;
  webAppUrl?: string;
}

export interface TelegramSimulatorStep {
  text: string;
  buttons: TelegramInlineButton[][];
  openButtonVisible: boolean;
  openAppUrl: string | null;
  role: 'parent' | 'student' | null;
  breadcrumb: string[];
}
