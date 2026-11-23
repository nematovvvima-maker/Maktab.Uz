import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  ALL_GRADES,
  INITIAL_STUDENTS,
  INITIAL_GRADES,
  INITIAL_ATTENDANCE,
  getSubjectsForGrade,
  getGradeNumber,
} from './src/data/initialData.ts';
import { buildHomeworkForGrade } from './src/data/schoolSchedule.ts';
import {
  CLASS_LETTERS,
  DEFAULT_DISTRICT,
  DEFAULT_REGION,
  DEFAULT_SCHOOL,
} from './src/data/regionsCatalog.ts';
import { MaktabTelegramBot } from './telegramBot.ts';
import type {
  AccountType,
  AdminAccount,
  AdminPermission,
  AdminRole,
  AdminStatus,
  AttendanceData,
  AuditLog,
  ChatMessage,
  ClassLetter,
  HomeworkItem,
  Student,
  StudentGrades,
  StudentLeaderboardEntry,
  StudentPortalPayload,
  TelegramChatLink,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '.data');
const STORE_PATH = path.join(DATA_DIR, 'maktab-store.json');
const SECRET_PATH = path.join(DATA_DIR, 'auth-secret.key');

function loadOrCreateAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim()) {
    return process.env.AUTH_SECRET.trim();
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_PATH)) {
      const existing = fs.readFileSync(SECRET_PATH, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_PATH, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const AUTH_SECRET = loadOrCreateAuthSecret();

interface StoredAdmin extends AdminAccount {
  passwordHash: string;
}

interface DataStore {
  admins: StoredAdmin[];
  students: Student[];
  grades: StudentGrades;
  attendance: AttendanceData;
  auditLogs: AuditLog[];
  homework: HomeworkItem[];
  chats: ChatMessage[];
  telegramLinks: TelegramChatLink[];
}

interface AuthedRequest extends Request {
  accountType?: AccountType;
  admin?: StoredAdmin;
  student?: Student;
}

function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signToken(accountType: AccountType, subjectId: string, login: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      type: accountType,
      sub: subjectId,
      login,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(
  token: string
): { type: AccountType; sub: string; login: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.sub || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    const type: AccountType = decoded.type === 'student' ? 'student' : 'admin';
    return { type, sub: decoded.sub, login: decoded.login };
  } catch {
    return null;
  }
}

function sanitizeAdmin(admin: StoredAdmin): AdminAccount {
  const { passwordHash: _removed, ...safe } = admin;
  return safe;
}

function sanitizeStudent(student: Student): Omit<Student, 'password'> {
  const { password: _removed, ...safe } = student;
  return safe;
}

function generateStudentLogin(firstName: string, grade: string, existingLogins: Set<string>): string {
  const baseName =
    firstName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || 'student';
  const gradeNum = String(getGradeNumber(grade)).padStart(2, '0');
  let candidate = `${baseName}${gradeNum}`;
  let suffix = 1;
  while (existingLogins.has(candidate.toLowerCase())) {
    candidate = `${baseName}${gradeNum}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

const DEFAULT_CHATS: ChatMessage[] = [
  {
    id: 'MSG-1001',
    senderName: 'Davronbek Karimov',
    senderRole: 'Administrator',
    senderLogin: 'Davronbek01',
    channel: 'Maktab e’lonlari',
    text: "Assalomu alaykum! BSB va CHSB nazorat ishlari jadvali Kundalik bo'limida yangilandi. Barcha o'quvchilarga omad tilaymiz!",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'MSG-1002',
    senderName: 'Dilnoza Abdullayeva',
    senderRole: 'Administrator',
    senderLogin: 'Dilnoza_admin',
    channel: '9-sinf',
    text: 'Ertaga 1-soatda Ona tili fanidan yozma ish bo‘ladi. 105-mashqni takrorlab keling.',
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
  {
    id: 'MSG-1003',
    senderName: 'Madina Oripova',
    senderRole: "O'quvchi",
    senderLogin: 'madina09',
    channel: '9-sinf',
    text: 'Rahmat ustoz, barcha mashqlarni tayyorlab qo‘ydik!',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

function createSeedAdmins(nowIso: string): StoredAdmin[] {
  return [
    {
      id: 'ADM-1001',
      fullName: 'Davronbek Karimov',
      login: 'Davronbek',
      email: 'davronbek@maktab.uz',
      phone: '+998901112233',
      role: 'Super Admin',
      permissions: ['students', 'grades', 'attendance', 'admins', 'settings'],
      assignedGrades: [],
      status: 'active',
      createdBy: 'Tizim',
      createdAt: '2026-08-01T09:00:00.000Z',
      lastLogin: nowIso,
      passwordHash: hashPassword('1234'),
    },
    {
      id: 'ADM-1002',
      fullName: 'Dilnoza Abdullayeva',
      login: 'Dilnoza',
      email: 'dilnoza@maktab.uz',
      phone: '+998912223344',
      role: 'Admin',
      permissions: ['students', 'grades', 'attendance'],
      assignedGrades: ['9-sinf', '10-sinf'],
      status: 'active',
      createdBy: 'Davronbek',
      createdAt: '2026-08-03T10:30:00.000Z',
      lastLogin: '2026-11-19T14:20:00.000Z',
      passwordHash: hashPassword('1234'),
    },
    {
      id: 'ADM-1003',
      fullName: 'Sherzod Rahimov',
      login: 'Sherzod',
      email: 'sherzod@maktab.uz',
      phone: '+998933334455',
      role: 'Admin',
      permissions: ['students', 'grades', 'attendance'],
      assignedGrades: ['7-sinf', '8-sinf'],
      status: 'active',
      createdBy: 'Davronbek',
      createdAt: '2026-08-05T11:15:00.000Z',
      lastLogin: '2026-11-18T08:45:00.000Z',
      passwordHash: hashPassword('1234'),
    },
    {
      id: 'ADM-1004',
      fullName: 'Malika Tursunova',
      login: 'Malika',
      email: 'malika@maktab.uz',
      phone: '+998944445566',
      role: 'Admin',
      permissions: ['students', 'grades', 'attendance'],
      assignedGrades: ['5-sinf', '6-sinf'],
      status: 'active',
      createdBy: 'Davronbek',
      createdAt: '2026-08-06T09:20:00.000Z',
      lastLogin: '2026-11-17T12:10:00.000Z',
      passwordHash: hashPassword('1234'),
    },
    {
      id: 'ADM-1005',
      fullName: 'Jasur Alimov',
      login: 'Jasur',
      email: 'jasur@maktab.uz',
      phone: '+998955556677',
      role: 'Admin',
      permissions: ['students', 'grades', 'attendance'],
      assignedGrades: ['11-sinf'],
      status: 'active',
      createdBy: 'Davronbek',
      createdAt: '2026-08-07T10:05:00.000Z',
      lastLogin: '2026-11-16T16:30:00.000Z',
      passwordHash: hashPassword('1234'),
    },
  ];
}

function createInitialStore(): DataStore {
  const nowIso = new Date().toISOString();
  const initialAdmins = createSeedAdmins(nowIso);

  const initialLogs: AuditLog[] = [
    {
      id: 'LOG-1003',
      actorLogin: 'Davronbek',
      actorName: 'Davronbek Karimov',
      action: 'admin_created',
      target: 'Jasur',
      details: 'Jasur Alimov (11-sinf) admin sifatida biriktirildi',
      createdAt: '2026-08-07T10:05:00.000Z',
    },
    {
      id: 'LOG-1002',
      actorLogin: 'Davronbek',
      actorName: 'Davronbek Karimov',
      action: 'admin_created',
      target: 'Dilnoza',
      details: 'Dilnoza Abdullayeva (9-sinf, 10-sinf) admin sifatida biriktirildi',
      createdAt: '2026-08-03T10:30:00.000Z',
    },
    {
      id: 'LOG-1001',
      actorLogin: 'Davronbek',
      actorName: 'Davronbek Karimov',
      action: 'grades_updated',
      target: '9-sinf',
      details: "9-sinf o'quvchilari baholari yangilandi",
      createdAt: '2026-08-02T15:10:00.000Z',
    },
  ];

  const seededGrades = Array.from(new Set(INITIAL_STUDENTS.map((s) => s.grade)));
  const initialHomework: HomeworkItem[] = seededGrades.flatMap((grade) =>
    buildHomeworkForGrade(grade).map((item) => ({
      ...item,
      createdBy: 'Davronbek',
      createdAt: nowIso,
    }))
  );

  return {
    admins: initialAdmins,
    students: structuredClone(INITIAL_STUDENTS),
    grades: structuredClone(INITIAL_GRADES),
    attendance: structuredClone(INITIAL_ATTENDANCE),
    auditLogs: initialLogs,
    homework: initialHomework,
    chats: structuredClone(DEFAULT_CHATS),
    telegramLinks: [],
  };
}

function ensureStoreIntegrity(data: DataStore): boolean {
  let mutated = false;
  const nowIso = new Date().toISOString();
  const seedAdmins = createSeedAdmins(nowIso);

  // Seamless migration from older 3-admin Davronbek01 seed to 5-admin scoped seed
  const oldSuper = data.admins.find((a) => a.id === 'ADM-1001' && a.login === 'Davronbek01');
  if (oldSuper) {
    oldSuper.login = 'Davronbek';
    oldSuper.role = 'Super Admin';
    oldSuper.assignedGrades = [];
    mutated = true;
  }

  const oldDilnoza = data.admins.find((a) => a.id === 'ADM-1002' && a.login === 'Dilnoza_admin');
  if (oldDilnoza) {
    oldDilnoza.login = 'Dilnoza';
    oldDilnoza.passwordHash = hashPassword('1234');
    oldDilnoza.assignedGrades = ['9-sinf', '10-sinf'];
    mutated = true;
  }

  const oldSherzod = data.admins.find((a) => a.id === 'ADM-1003' && a.login === 'Sherzod_mod');
  if (oldSherzod) {
    oldSherzod.login = 'Sherzod';
    oldSherzod.role = 'Admin';
    oldSherzod.passwordHash = hashPassword('1234');
    oldSherzod.assignedGrades = ['7-sinf', '8-sinf'];
    mutated = true;
  }

  // Ensure every admin has assignedGrades array
  data.admins.forEach((a) => {
    if (!Array.isArray(a.assignedGrades)) {
      const seedMatch = seedAdmins.find((s) => s.id === a.id);
      a.assignedGrades = a.role === 'Super Admin' ? [] : seedMatch?.assignedGrades || [];
      mutated = true;
    }
    if (a.role === 'Super Admin' && a.assignedGrades.length > 0) {
      a.assignedGrades = [];
      mutated = true;
    }
  });

  // Seed missing default admins up to 5 if upgrading from old 3-admin store
  if (data.admins.length < 5) {
    const takenGrades = new Set<string>(
      data.admins.filter((a) => a.role !== 'Super Admin').flatMap((a) => a.assignedGrades)
    );
    for (const seed of seedAdmins) {
      const exists = data.admins.some(
        (a) => a.id === seed.id || a.login.toLowerCase() === seed.login.toLowerCase()
      );
      if (!exists) {
        const freeGrades = seed.assignedGrades.filter((g) => !takenGrades.has(g));
        freeGrades.forEach((g) => takenGrades.add(g));
        data.admins.push({ ...seed, assignedGrades: freeGrades });
        mutated = true;
      }
    }
  }

  const used = new Set<string>(
    data.students.map((s) => (s.login ? s.login.toLowerCase() : '')).filter(Boolean)
  );
  data.students.forEach((student) => {
    if (!student.login || !student.login.trim()) {
      const seedMatch = INITIAL_STUDENTS.find((s) => s.id === student.id);
      const login =
        seedMatch && !used.has(seedMatch.login.toLowerCase())
          ? seedMatch.login
          : generateStudentLogin(student.firstName, student.grade, used);
      student.login = login;
      used.add(login.toLowerCase());
      mutated = true;
    }
    if (!student.password) {
      student.password = 'pass1234';
      mutated = true;
    }
    const seedMatch = INITIAL_STUDENTS.find((s) => s.id === student.id);
    if (!student.region) {
      student.region = seedMatch?.region || DEFAULT_REGION;
      mutated = true;
    }
    if (!student.district) {
      student.district = seedMatch?.district || DEFAULT_DISTRICT;
      mutated = true;
    }
    if (!student.school) {
      student.school = seedMatch?.school || DEFAULT_SCHOOL;
      mutated = true;
    }
    if (!student.classLetter || !CLASS_LETTERS.includes(student.classLetter)) {
      student.classLetter = seedMatch?.classLetter || 'A';
      mutated = true;
    }
  });

  // Ensure 91-maktab 8-G seed students exist when upgrading from older store
  for (const seedStudent of INITIAL_STUDENTS) {
    if (seedStudent.grade === '8-sinf' && seedStudent.classLetter === 'G') {
      const exists = data.students.some(
        (s) =>
          s.id === seedStudent.id || s.login.toLowerCase() === seedStudent.login.toLowerCase()
      );
      if (!exists) {
        data.students.push({ ...seedStudent });
        if (INITIAL_GRADES[seedStudent.id] && !data.grades[seedStudent.id]) {
          data.grades[seedStudent.id] = { ...INITIAL_GRADES[seedStudent.id] };
        }
        Object.entries(INITIAL_ATTENDANCE).forEach(([date, dayMap]) => {
          if (dayMap[seedStudent.id]) {
            data.attendance[date] = {
              ...(data.attendance[date] || {}),
              [seedStudent.id]: dayMap[seedStudent.id],
            };
          }
        });
        mutated = true;
      }
    }
  }
  if (!Array.isArray(data.homework)) {
    data.homework = [];
    mutated = true;
  }
  const existingGradesWithStudents = Array.from(new Set(data.students.map((s) => s.grade)));
  existingGradesWithStudents.forEach((grade) => {
    const hasHw = data.homework.some((hw) => hw.grade === grade);
    if (!hasHw) {
      data.homework.push(
        ...buildHomeworkForGrade(grade).map((item) => ({
          ...item,
          createdBy: 'Davronbek',
          createdAt: nowIso,
        }))
      );
      mutated = true;
    }
  });
  if (!Array.isArray(data.chats)) {
    data.chats = structuredClone(DEFAULT_CHATS);
    mutated = true;
  }
  if (!Array.isArray(data.telegramLinks)) {
    data.telegramLinks = [];
    mutated = true;
  }
  return mutated;
}

function loadStore(): DataStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as DataStore;
      if (parsed && Array.isArray(parsed.admins) && parsed.admins.length > 0) {
        if (ensureStoreIntegrity(parsed)) {
          saveStore(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load store from disk, recreating seed:', err);
  }
  const fresh = createInitialStore();
  saveStore(fresh);
  return fresh;
}

function saveStore(data: DataStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

let store: DataStore = loadStore();

function appendLog(
  actor: StoredAdmin,
  action: AuditLog['action'],
  target: string,
  details: string
): void {
  const entry: AuditLog = {
    id: `LOG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
    actorLogin: actor.login,
    actorName: actor.fullName,
    action,
    target,
    details,
    createdAt: new Date().toISOString(),
  };
  store.auditLogs = [entry, ...store.auditLogs].slice(0, 100);
}

const VALID_ROLES: AdminRole[] = ['Super Admin', 'Admin', 'Moderator'];
const VALID_PERMISSIONS: AdminPermission[] = [
  'students',
  'grades',
  'attendance',
  'admins',
  'settings',
];
const VALID_STATUSES: AdminStatus[] = ['active', 'suspended'];

function parseAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan' });
  }
  req.accountType = payload.type;

  if (payload.type === 'admin') {
    const admin = store.admins.find((a) => a.id === payload.sub);
    if (!admin || admin.status !== 'active') {
      return res.status(403).json({ error: 'Admin hisobi faol emas' });
    }
    req.admin = admin;
    return next();
  }

  const student = store.students.find((s) => s.id === payload.sub);
  if (!student) {
    return res.status(403).json({ error: "O'quvchi hisobi topilmadi" });
  }
  req.student = student;
  return next();
}

function requireAdminAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  return parseAuth(req, res, () => {
    if (req.accountType !== 'admin' || !req.admin) {
      return res.status(403).json({ error: 'Faqat administratorlar uchun ruxsat etilgan' });
    }
    return next();
  });
}

function requireSuperAdminAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  return requireAdminAuth(req, res, () => {
    if (req.admin?.role !== 'Super Admin') {
      return res
        .status(403)
        .json({ error: 'Bu amal faqat bosh administrator (Super Admin) uchun ruxsat etilgan' });
    }
    return next();
  });
}

function canAccessGrade(admin: StoredAdmin, grade: string): boolean {
  if (admin.role === 'Super Admin') return true;
  return Array.isArray(admin.assignedGrades) && admin.assignedGrades.includes(grade);
}

function getGradeOwnership(excludeAdminId?: string): {
  availableGrades: string[];
  gradeOwners: Record<string, { id: string; fullName: string; login: string }>;
} {
  const gradeOwners: Record<string, { id: string; fullName: string; login: string }> = {};
  store.admins.forEach((a) => {
    if (a.role === 'Super Admin' || a.id === excludeAdminId) return;
    (a.assignedGrades || []).forEach((g) => {
      if (!gradeOwners[g]) {
        gradeOwners[g] = { id: a.id, fullName: a.fullName, login: a.login };
      }
    });
  });
  const availableGrades = ALL_GRADES.filter((g) => !gradeOwners[g]);
  return { availableGrades, gradeOwners };
}

function validateExclusiveGrades(
  requested: unknown,
  role: AdminRole,
  excludeAdminId?: string
): { grades: string[]; error?: string } {
  if (role === 'Super Admin') {
    return { grades: [] };
  }
  const clean = Array.isArray(requested)
    ? Array.from(
        new Set(
          requested.filter((g): g is string => typeof g === 'string' && ALL_GRADES.includes(g))
        )
      )
    : [];
  const { gradeOwners } = getGradeOwnership(excludeAdminId);
  for (const g of clean) {
    const owner = gradeOwners[g];
    if (owner) {
      return {
        grades: [],
        error: `${g} allaqachon ${owner.fullName} (${owner.login}) adminiga biriktirilgan. Faqat bo'sh sinflarni tanlang.`,
      };
    }
  }
  return { grades: clean };
}

function requireStudentAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  return parseAuth(req, res, () => {
    if (req.accountType !== 'student' || !req.student) {
      return res.status(403).json({ error: "Faqat o'quvchi hisobi uchun ruxsat etilgan" });
    }
    return next();
  });
}

function buildStudentPortalPayload(student: Student): StudentPortalPayload {
  const subjects = getSubjectsForGrade(student.grade);
  const studentGrades = store.grades[student.id] || {};
  const scoreValues: number[] = Object.values(studentGrades);
  const averageGrade =
    scoreValues.length > 0
      ? Number((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2))
      : 0;

  const attendanceHistory = Object.entries(store.attendance)
    .filter(([, dayMap]) => dayMap[student.id] === 'present' || dayMap[student.id] === 'absent')
    .map(([date, dayMap]) => ({
      date,
      status: dayMap[student.id],
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const presentCount = attendanceHistory.filter((a) => a.status === 'present').length;
  const absentCount = attendanceHistory.filter((a) => a.status === 'absent').length;
  const attendanceRate =
    attendanceHistory.length > 0
      ? Math.round((presentCount / attendanceHistory.length) * 100)
      : 100;

  const computeLeaderboard = (list: Student[]): StudentLeaderboardEntry[] => {
    const scored = list.map((s) => {
      const map = store.grades[s.id] || {};
      const vals: number[] = Object.values(map);
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
        averageGrade: Number(avg.toFixed(2)),
        totalGradesCount: vals.length,
        isCurrentStudent: s.id === student.id,
      };
    });
    scored.sort((a, b) => {
      if (b.averageGrade !== a.averageGrade) return b.averageGrade - a.averageGrade;
      return b.totalGradesCount - a.totalGradesCount;
    });
    return scored.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  };

  const schoolLeaderboard = computeLeaderboard(store.students);
  const classLeaderboard = computeLeaderboard(
    store.students.filter((s) => s.grade === student.grade)
  );

  const classRank = classLeaderboard.find((e) => e.id === student.id)?.rank || 1;
  const schoolRank = schoolLeaderboard.find((e) => e.id === student.id)?.rank || 1;

  return {
    student: sanitizeStudent(student),
    subjects,
    grades: studentGrades,
    averageGrade,
    gradedCount: scoreValues.length,
    attendanceHistory,
    presentCount,
    absentCount,
    attendanceRate,
    classRank,
    classTotal: classLeaderboard.length,
    schoolRank,
    schoolTotal: schoolLeaderboard.length,
    classLeaderboard,
    schoolLeaderboard,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'maktab-uz-api', timestamp: new Date().toISOString() });
  });

  // ---------------- UNIFIED AUTH ROUTES ----------------
  app.post('/api/auth/login', (req, res) => {
    const { login, password, mode } = req.body || {};
    if (typeof login !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Login va parolni kiriting' });
    }
    const cleanLogin = login.trim().toLowerCase();
    const cleanPass = password.trim();

    if (mode !== 'student') {
      const admin = store.admins.find((a) => a.login.toLowerCase() === cleanLogin);
      if (admin) {
        if (!verifyPassword(cleanPass, admin.passwordHash)) {
          return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
        }
        if (admin.status !== 'active') {
          return res.status(403).json({ error: 'Ushbu admin hisobi vaqtincha bloklangan' });
        }
        admin.lastLogin = new Date().toISOString();
        saveStore(store);

        const token = signToken('admin', admin.id, admin.login);
        return res.json({
          token,
          accountType: 'admin',
          user: sanitizeAdmin(admin),
        });
      }
      if (mode === 'admin') {
        return res.status(401).json({ error: "Admin login yoki paroli noto'g'ri" });
      }
    }

    const student = store.students.find(
      (s) => s.login.toLowerCase() === cleanLogin || s.id.toLowerCase() === cleanLogin
    );
    if (!student || (student.password || 'pass1234') !== cleanPass) {
      return res.status(401).json({ error: "O'quvchi login yoki paroli noto'g'ri" });
    }

    const token = signToken('student', student.id, student.login);
    return res.json({
      token,
      accountType: 'student',
      student: sanitizeStudent(student),
    });
  });

  app.get('/api/auth/me', parseAuth, (req: AuthedRequest, res) => {
    if (req.accountType === 'admin' && req.admin) {
      return res.json({ accountType: 'admin', user: sanitizeAdmin(req.admin) });
    }
    if (req.accountType === 'student' && req.student) {
      return res.json({ accountType: 'student', student: sanitizeStudent(req.student) });
    }
    return res.status(401).json({ error: 'Sessiya topilmadi' });
  });

  app.patch('/api/profile', requireAdminAuth, (req: AuthedRequest, res) => {
    const admin = req.admin!;
    const { fullName, email, phone, password } = req.body || {};

    if (typeof fullName === 'string' && fullName.trim()) {
      admin.fullName = fullName.trim();
    }
    if (typeof email === 'string') {
      admin.email = email.trim();
    }
    if (typeof phone === 'string') {
      admin.phone = phone.trim();
    }
    if (typeof password === 'string' && password.trim()) {
      if (password.trim().length < 4) {
        return res.status(400).json({ error: "Parol kamida 4 belgidan iborat bo'lishi kerak" });
      }
      admin.passwordHash = hashPassword(password.trim());
    }

    appendLog(admin, 'admin_updated', admin.login, "Shaxsiy profil ma'lumotlari yangilandi");
    saveStore(store);
    return res.json({ admin: sanitizeAdmin(admin) });
  });

  // ---------------- SHARED CHATS & ANNOUNCEMENTS ----------------
  app.get('/api/chats', parseAuth, (req: AuthedRequest, res) => {
    if (req.accountType === 'student' && req.student) {
      const allowed = store.chats.filter(
        (m) => m.channel === 'Maktab e’lonlari' || m.channel === req.student!.grade
      );
      return res.json({ messages: allowed });
    }
    if (req.accountType === 'admin' && req.admin && req.admin.role !== 'Super Admin') {
      const allowed = store.chats.filter(
        (m) => m.channel === 'Maktab e’lonlari' || canAccessGrade(req.admin!, m.channel)
      );
      return res.json({ messages: allowed });
    }
    return res.json({ messages: store.chats });
  });

  app.post('/api/chats', parseAuth, (req: AuthedRequest, res) => {
    const { text, channel } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText || cleanText.length > 600) {
      return res.status(400).json({ error: 'Xabar matni 1–600 belgi oralig‘ida bo‘lishi kerak' });
    }

    let resolvedChannel = 'Maktab e’lonlari';
    if (req.accountType === 'admin' && req.admin) {
      const requested = typeof channel === 'string' ? channel.trim() : '';
      if (req.admin.role === 'Super Admin') {
        resolvedChannel = requested || 'Maktab e’lonlari';
      } else {
        if (!requested || !canAccessGrade(req.admin, requested)) {
          if (req.admin.assignedGrades.length === 0) {
            return res
              .status(403)
              .json({ error: 'Sizga hali biriktirilgan sinf mavjud emas' });
          }
          resolvedChannel = req.admin.assignedGrades[0];
        } else {
          resolvedChannel = requested;
        }
      }
    } else {
      resolvedChannel = req.student!.grade;
    }

    const msg: ChatMessage =
      req.accountType === 'admin' && req.admin
        ? {
            id: `MSG-${Date.now().toString().slice(-6)}`,
            senderName: req.admin.fullName,
            senderRole: 'Administrator',
            senderLogin: req.admin.login,
            channel: resolvedChannel,
            text: cleanText,
            createdAt: new Date().toISOString(),
          }
        : {
            id: `MSG-${Date.now().toString().slice(-6)}`,
            senderName: `${req.student!.firstName} ${req.student!.lastName}`,
            senderRole: "O'quvchi",
            senderLogin: req.student!.login,
            channel: resolvedChannel,
            text: cleanText,
            createdAt: new Date().toISOString(),
          };

    store.chats.push(msg);
    saveStore(store);
    return res.status(201).json({ message: msg });
  });

  // ---------------- STUDENT PORTAL ROUTES ----------------
  app.get('/api/student/dashboard', requireStudentAuth, (req: AuthedRequest, res) => {
    return res.json(buildStudentPortalPayload(req.student!));
  });

  app.get('/api/student/homework', requireStudentAuth, (req: AuthedRequest, res) => {
    const student = req.student!;
    const items = store.homework
      .filter((hw) => hw.grade === student.grade)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return res.json({ items });
  });

  // ---------------- ADMIN HOMEWORK CRUD ----------------
  app.get('/api/homework', requireAdminAuth, (req: AuthedRequest, res) => {
    const gradeQuery = typeof req.query.grade === 'string' ? req.query.grade.trim() : '';
    const scoped = store.homework.filter((hw) => canAccessGrade(req.admin!, hw.grade));
    const items = (gradeQuery ? scoped.filter((hw) => hw.grade === gradeQuery) : scoped)
      .slice()
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    return res.json({ items });
  });

  app.post('/api/homework', requireAdminAuth, (req: AuthedRequest, res) => {
    const { grade, subject, title, dueDate, teacher } = req.body || {};
    const cleanGrade = typeof grade === 'string' ? grade.trim() : '';
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDueDate = typeof dueDate === 'string' ? dueDate.trim() : '';
    const cleanTeacher =
      typeof teacher === 'string' && teacher.trim()
        ? teacher.trim()
        : req.admin!.fullName;

    if (!cleanGrade || !cleanSubject || !cleanTitle || !cleanDueDate) {
      return res.status(400).json({
        error: 'Sinf, fan, vazifa matni va topshirish muddati kiritilishi shart',
      });
    }
    if (!canAccessGrade(req.admin!, cleanGrade)) {
      return res
        .status(403)
        .json({ error: `Sizga ${cleanGrade} uchun uy vazifasi qo'shish ruxsati berilmagan` });
    }

    const item: HomeworkItem = {
      id: `HW-${Date.now().toString().slice(-6)}`,
      grade: cleanGrade,
      subject: cleanSubject,
      title: cleanTitle,
      dueDate: cleanDueDate,
      teacher: cleanTeacher,
      createdBy: req.admin!.login,
      createdAt: new Date().toISOString(),
    };

    store.homework.unshift(item);
    appendLog(
      req.admin!,
      'homework_created',
      `${cleanGrade} · ${cleanSubject}`,
      `Yangi uy vazifasi qo'shildi (muddat: ${cleanDueDate})`
    );
    saveStore(store);
    return res.status(201).json({ item });
  });

  app.patch('/api/homework/:id', requireAdminAuth, (req: AuthedRequest, res) => {
    const target = store.homework.find((hw) => hw.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Uy vazifasi topilmadi' });
    }
    if (!canAccessGrade(req.admin!, target.grade)) {
      return res.status(403).json({ error: 'Ushbu sinf uy vazifasini tahrirlashga ruxsat yo‘q' });
    }
    const { grade, subject, title, dueDate, teacher } = req.body || {};
    if (typeof grade === 'string' && grade.trim()) {
      if (!canAccessGrade(req.admin!, grade.trim())) {
        return res.status(403).json({ error: `Sizga ${grade.trim()} sinfi biriktirilmagan` });
      }
      target.grade = grade.trim();
    }
    if (typeof subject === 'string' && subject.trim()) target.subject = subject.trim();
    if (typeof title === 'string' && title.trim()) target.title = title.trim();
    if (typeof dueDate === 'string' && dueDate.trim()) target.dueDate = dueDate.trim();
    if (typeof teacher === 'string' && teacher.trim()) target.teacher = teacher.trim();

    appendLog(
      req.admin!,
      'homework_updated',
      `${target.grade} · ${target.subject}`,
      `Uy vazifasi tahrirlandi (muddat: ${target.dueDate})`
    );
    saveStore(store);
    return res.json({ item: target });
  });

  app.delete('/api/homework/:id', requireAdminAuth, (req: AuthedRequest, res) => {
    const idx = store.homework.findIndex((hw) => hw.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Uy vazifasi topilmadi' });
    }
    if (!canAccessGrade(req.admin!, store.homework[idx].grade)) {
      return res.status(403).json({ error: 'Ushbu sinf uy vazifasini o‘chirishga ruxsat yo‘q' });
    }
    const [removed] = store.homework.splice(idx, 1);
    appendLog(
      req.admin!,
      'homework_deleted',
      `${removed.grade} · ${removed.subject}`,
      `Uy vazifasi o'chirildi`
    );
    saveStore(store);
    return res.json({ ok: true });
  });

  app.patch('/api/student/profile', requireStudentAuth, (req: AuthedRequest, res) => {
    const student = req.student!;
    const { phone, currentPassword, newPassword } = req.body || {};

    if (typeof phone === 'string' && phone.trim().length >= 5) {
      student.phone = phone.trim();
    }

    if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 4) {
        return res.status(400).json({ error: "Yangi parol kamida 4 belgidan iborat bo'lishi kerak" });
      }
      if (
        typeof currentPassword !== 'string' ||
        currentPassword.trim() !== (student.password || 'pass1234')
      ) {
        return res.status(400).json({ error: "Joriy parol noto'g'ri" });
      }
      student.password = newPassword.trim();
    }

    saveStore(store);
    return res.json({ student: sanitizeStudent(student) });
  });

  // ---------------- MULTI-ADMIN MANAGEMENT ROUTES (SUPER ADMIN ONLY) ----------------
  app.get('/api/admins', requireSuperAdminAuth, (_req, res) => {
    const { availableGrades, gradeOwners } = getGradeOwnership();
    return res.json({
      admins: store.admins.map(sanitizeAdmin),
      availableGrades,
      gradeOwners,
    });
  });

  app.post('/api/admins', requireSuperAdminAuth, (req: AuthedRequest, res) => {
    const { fullName, login, password, email, phone, role, permissions, assignedGrades } =
      req.body || {};
    const cleanFullName = typeof fullName === 'string' ? fullName.trim() : '';
    const cleanLogin = typeof login === 'string' ? login.trim() : '';
    const cleanPassword = typeof password === 'string' ? password.trim() : '';

    if (cleanFullName.length < 2) {
      return res.status(400).json({ error: "To'liq ism kamida 2 belgidan iborat bo'lishi kerak" });
    }
    if (cleanLogin.length < 3 || /\s/.test(cleanLogin)) {
      return res
        .status(400)
        .json({ error: "Login kamida 3 belgi bo'lishi va bo'sh joylarsiz yozilishi kerak" });
    }
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Parol kamida 4 belgidan iborat bo'lishi kerak" });
    }
    if (
      store.admins.some((a) => a.login.toLowerCase() === cleanLogin.toLowerCase()) ||
      store.students.some((s) => s.login.toLowerCase() === cleanLogin.toLowerCase())
    ) {
      return res.status(409).json({ error: 'Bu login allaqachon band' });
    }

    const safeRole: AdminRole = VALID_ROLES.includes(role) ? role : 'Admin';
    const gradeCheck = validateExclusiveGrades(assignedGrades, safeRole);
    if (gradeCheck.error) {
      return res.status(409).json({ error: gradeCheck.error });
    }
    if (safeRole !== 'Super Admin' && gradeCheck.grades.length === 0) {
      return res
        .status(400)
        .json({ error: "Admin uchun kamida bitta bo'sh sinfni tanlang" });
    }

    const rawPerms: AdminPermission[] = Array.isArray(permissions)
      ? permissions.filter((p): p is AdminPermission => VALID_PERMISSIONS.includes(p))
      : ['students', 'grades', 'attendance'];

    const finalPerms: AdminPermission[] =
      safeRole === 'Super Admin'
        ? ['students', 'grades', 'attendance', 'admins', 'settings']
        : rawPerms.filter((p) => p !== 'admins');

    const maxNum = store.admins.reduce((acc, a) => {
      const m = a.id.match(/\d+/);
      return Math.max(acc, m ? parseInt(m[0], 10) : 1000);
    }, 1000);

    const newAdmin: StoredAdmin = {
      id: `ADM-${maxNum + 1}`,
      fullName: cleanFullName,
      login: cleanLogin,
      email: typeof email === 'string' ? email.trim() : '',
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: safeRole,
      permissions: finalPerms,
      assignedGrades: gradeCheck.grades,
      status: 'active',
      createdBy: req.admin!.login,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      passwordHash: hashPassword(cleanPassword),
    };

    store.admins.push(newAdmin);
    appendLog(
      req.admin!,
      'admin_created',
      newAdmin.login,
      `${newAdmin.fullName} (${newAdmin.role}${
        newAdmin.assignedGrades.length ? `: ${newAdmin.assignedGrades.join(', ')}` : ''
      }) yangi admin sifatida qo'shildi`
    );
    saveStore(store);

    return res.status(201).json({ admin: sanitizeAdmin(newAdmin) });
  });

  app.patch('/api/admins/:id', requireSuperAdminAuth, (req: AuthedRequest, res) => {
    const { id } = req.params;
    const target = store.admins.find((a) => a.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Admin topilmadi' });
    }

    const { fullName, login, password, email, phone, role, permissions, assignedGrades, status } =
      req.body || {};

    const nextRole: AdminRole = VALID_ROLES.includes(role) ? role : target.role;
    if (target.id === req.admin!.id && nextRole !== 'Super Admin') {
      return res.status(400).json({ error: "O'zingizning Super Admin rolingizni pasaytira olmaysiz" });
    }

    if (assignedGrades !== undefined || nextRole !== target.role) {
      const gradesInput =
        assignedGrades !== undefined ? assignedGrades : target.assignedGrades;
      const gradeCheck = validateExclusiveGrades(gradesInput, nextRole, target.id);
      if (gradeCheck.error) {
        return res.status(409).json({ error: gradeCheck.error });
      }
      target.assignedGrades = gradeCheck.grades;
    }

    if (typeof fullName === 'string' && fullName.trim().length >= 2) {
      target.fullName = fullName.trim();
    }
    if (typeof login === 'string' && login.trim().length >= 3) {
      const nextLogin = login.trim();
      if (
        nextLogin.toLowerCase() !== target.login.toLowerCase() &&
        (store.admins.some((a) => a.login.toLowerCase() === nextLogin.toLowerCase()) ||
          store.students.some((s) => s.login.toLowerCase() === nextLogin.toLowerCase()))
      ) {
        return res.status(409).json({ error: 'Bu login allaqachon mavjud' });
      }
      target.login = nextLogin;
    }
    if (typeof email === 'string') target.email = email.trim();
    if (typeof phone === 'string') target.phone = phone.trim();
    target.role = nextRole;

    if (Array.isArray(permissions)) {
      const valid = permissions.filter((p): p is AdminPermission => VALID_PERMISSIONS.includes(p));
      target.permissions =
        nextRole === 'Super Admin'
          ? ['students', 'grades', 'attendance', 'admins', 'settings']
          : valid.filter((p) => p !== 'admins');
    }
    if (VALID_STATUSES.includes(status)) {
      if (target.id === req.admin!.id && status === 'suspended') {
        return res.status(400).json({ error: "O'zingizning hisobingizni bloklay olmaysiz" });
      }
      const activeCount = store.admins.filter((a) => a.status === 'active').length;
      if (target.status === 'active' && status === 'suspended' && activeCount <= 1) {
        return res.status(400).json({ error: 'Kamida bitta faol admin qolishi shart' });
      }
      target.status = status;
    }
    if (typeof password === 'string' && password.trim().length >= 4) {
      target.passwordHash = hashPassword(password.trim());
    }

    appendLog(
      req.admin!,
      'admin_updated',
      target.login,
      `${target.fullName} ma'lumotlari yangilandi (${target.role}${
        target.assignedGrades.length ? `: ${target.assignedGrades.join(', ')}` : ''
      })`
    );
    saveStore(store);

    return res.json({ admin: sanitizeAdmin(target) });
  });

  app.delete('/api/admins/:id', requireSuperAdminAuth, (req: AuthedRequest, res) => {
    const { id } = req.params;
    const idx = store.admins.findIndex((a) => a.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Admin topilmadi' });
    }
    const target = store.admins[idx];
    if (target.id === req.admin!.id) {
      return res.status(400).json({ error: "Joriy faol hisobingizni o'chira olmaysiz" });
    }
    const remainingSuper = store.admins.filter(
      (a) => a.id !== id && a.status === 'active' && a.role === 'Super Admin'
    );
    if (target.role === 'Super Admin' && remainingSuper.length === 0) {
      return res.status(400).json({ error: 'Kamida bitta Super Admin qolishi shart' });
    }

    store.admins.splice(idx, 1);
    appendLog(
      req.admin!,
      'admin_deleted',
      target.login,
      `${target.fullName} adminlar ro'yxatidan o'chirildi`
    );
    saveStore(store);

    return res.json({ ok: true });
  });

  // ---------------- STUDENTS ROUTES (SCOPED BY ASSIGNED GRADES) ----------------
  app.get('/api/students', requireAdminAuth, (req: AuthedRequest, res) => {
    const visible = store.students.filter((s) => canAccessGrade(req.admin!, s.grade));
    return res.json({ students: visible });
  });

  app.post('/api/students', requireAdminAuth, (req: AuthedRequest, res) => {
    const { firstName, lastName, login, phone, password, grade, classLetter, region, district, school } =
      req.body || {};
    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !grade?.trim()) {
      return res.status(400).json({ error: "Barcha majburiy maydonlarni to'ldiring" });
    }
    const cleanGrade = grade.trim();
    if (!canAccessGrade(req.admin!, cleanGrade)) {
      return res
        .status(403)
        .json({ error: `Sizga ${cleanGrade} ga o'quvchi qo'shish ruxsati berilmagan` });
    }

    const usedLogins = new Set<string>([
      ...store.students.map((s) => s.login.toLowerCase()),
      ...store.admins.map((a) => a.login.toLowerCase()),
    ]);

    let cleanLogin = typeof login === 'string' ? login.trim() : '';
    if (!cleanLogin) {
      cleanLogin = generateStudentLogin(firstName.trim(), cleanGrade, usedLogins);
    } else {
      if (cleanLogin.length < 3 || /\s/.test(cleanLogin)) {
        return res
          .status(400)
          .json({ error: "O'quvchi logini kamida 3 belgi va bo'sh joylarsiz bo'lishi kerak" });
      }
      if (usedLogins.has(cleanLogin.toLowerCase())) {
        return res.status(409).json({ error: 'Bu login allaqachon band' });
      }
    }

    const maxNum = store.students.reduce((acc, s) => {
      const m = s.id.match(/\d+/);
      return Math.max(acc, m ? parseInt(m[0], 10) : 1000);
    }, 1000);

    const validLetter: ClassLetter =
      typeof classLetter === 'string' && CLASS_LETTERS.includes(classLetter as ClassLetter)
        ? (classLetter as ClassLetter)
        : 'A';

    const newStudent: Student = {
      id: `MKT-${maxNum + 1}`,
      login: cleanLogin,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      password: typeof password === 'string' && password.trim() ? password.trim() : 'pass1234',
      grade: cleanGrade,
      classLetter: validLetter,
      region: typeof region === 'string' && region.trim() ? region.trim() : DEFAULT_REGION,
      district: typeof district === 'string' && district.trim() ? district.trim() : DEFAULT_DISTRICT,
      school: typeof school === 'string' && school.trim() ? school.trim() : DEFAULT_SCHOOL,
      createdAt: new Date().toISOString().split('T')[0],
    };

    store.students.unshift(newStudent);
    appendLog(
      req.admin!,
      'student_created',
      `${newStudent.firstName} ${newStudent.lastName}`,
      `${newStudent.grade} ga yangi o'quvchi qo'shildi (login: ${newStudent.login})`
    );
    saveStore(store);
    return res.status(201).json({ student: newStudent });
  });

  app.patch('/api/students/:id', requireAdminAuth, (req: AuthedRequest, res) => {
    const { id } = req.params;
    const student = store.students.find((s) => s.id === id);
    if (!student) {
      return res.status(404).json({ error: "O'quvchi topilmadi" });
    }
    if (!canAccessGrade(req.admin!, student.grade)) {
      return res.status(403).json({ error: "Bu sinf o'quvchisini tahrirlashga ruxsat yo'q" });
    }
    const { firstName, lastName, login, phone, password, grade, classLetter, region, district, school } =
      req.body || {};

    if (typeof grade === 'string' && grade.trim() && !canAccessGrade(req.admin!, grade.trim())) {
      return res.status(403).json({ error: `Sizga ${grade.trim()} sinfi biriktirilmagan` });
    }

    if (typeof login === 'string' && login.trim()) {
      const nextLogin = login.trim();
      if (nextLogin.length < 3 || /\s/.test(nextLogin)) {
        return res
          .status(400)
          .json({ error: "Login kamida 3 belgi va bo'sh joylarsiz bo'lishi kerak" });
      }
      if (
        nextLogin.toLowerCase() !== student.login.toLowerCase() &&
        (store.students.some((s) => s.login.toLowerCase() === nextLogin.toLowerCase()) ||
          store.admins.some((a) => a.login.toLowerCase() === nextLogin.toLowerCase()))
      ) {
        return res.status(409).json({ error: 'Bu login allaqachon band' });
      }
      student.login = nextLogin;
    }

    if (typeof firstName === 'string' && firstName.trim()) student.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim()) student.lastName = lastName.trim();
    if (typeof phone === 'string' && phone.trim()) student.phone = phone.trim();
    if (typeof grade === 'string' && grade.trim()) student.grade = grade.trim();
    if (typeof password === 'string' && password.trim()) student.password = password.trim();
    if (typeof classLetter === 'string' && CLASS_LETTERS.includes(classLetter as ClassLetter)) {
      student.classLetter = classLetter as ClassLetter;
    }
    if (typeof region === 'string' && region.trim()) student.region = region.trim();
    if (typeof district === 'string' && district.trim()) student.district = district.trim();
    if (typeof school === 'string' && school.trim()) student.school = school.trim();

    appendLog(
      req.admin!,
      'student_updated',
      `${student.firstName} ${student.lastName}`,
      `${student.id} (login: ${student.login}) ma'lumotlari yangilandi`
    );
    saveStore(store);
    return res.json({ student });
  });

  app.delete('/api/students/:id', requireAdminAuth, (req: AuthedRequest, res) => {
    const { id } = req.params;
    const idx = store.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "O'quvchi topilmadi" });
    }
    if (!canAccessGrade(req.admin!, store.students[idx].grade)) {
      return res.status(403).json({ error: "Bu sinf o'quvchisini o'chirishga ruxsat yo'q" });
    }
    const [removed] = store.students.splice(idx, 1);
    delete store.grades[id];
    Object.keys(store.attendance).forEach((date) => {
      delete store.attendance[date][id];
    });
    appendLog(
      req.admin!,
      'student_deleted',
      `${removed.firstName} ${removed.lastName}`,
      `${removed.id} tizimdan o'chirildi`
    );
    saveStore(store);
    return res.json({ ok: true });
  });

  // ---------------- GRADES & ATTENDANCE ROUTES (SCOPED BY ASSIGNED GRADES) ----------------
  app.get('/api/grades', requireAdminAuth, (req: AuthedRequest, res) => {
    const allowedIds = new Set(
      store.students.filter((s) => canAccessGrade(req.admin!, s.grade)).map((s) => s.id)
    );
    const scopedGrades: StudentGrades = {};
    Object.entries(store.grades).forEach(([studentId, subjMap]) => {
      if (allowedIds.has(studentId)) {
        scopedGrades[studentId] = subjMap;
      }
    });
    return res.json({ grades: scopedGrades });
  });

  app.put('/api/grades', requireAdminAuth, (req: AuthedRequest, res) => {
    const { grades, gradeLabel } = req.body || {};
    if (!grades || typeof grades !== 'object') {
      return res.status(400).json({ error: "Baholar formati noto'g'ri" });
    }
    const allowedIds = new Set(
      store.students.filter((s) => canAccessGrade(req.admin!, s.grade)).map((s) => s.id)
    );
    for (const studentId of Object.keys(grades)) {
      if (!allowedIds.has(studentId)) {
        return res
          .status(403)
          .json({ error: "Sizga biriktirilmagan sinf o'quvchisiga baho qo'yish mumkin emas" });
      }
    }
    store.grades = { ...store.grades, ...grades };
    appendLog(
      req.admin!,
      'grades_updated',
      typeof gradeLabel === 'string' ? gradeLabel : 'Baholar jurnali',
      'Baholar jurnali saqlandi'
    );
    saveStore(store);
    return res.json({ grades });
  });

  app.get('/api/attendance', requireAdminAuth, (req: AuthedRequest, res) => {
    const allowedIds = new Set(
      store.students.filter((s) => canAccessGrade(req.admin!, s.grade)).map((s) => s.id)
    );
    const scopedAttendance: AttendanceData = {};
    Object.entries(store.attendance).forEach(([date, dayMap]) => {
      const filteredDay: Record<string, 'present' | 'absent'> = {};
      Object.entries(dayMap).forEach(([studentId, status]) => {
        if (allowedIds.has(studentId)) {
          filteredDay[studentId] = status;
        }
      });
      scopedAttendance[date] = filteredDay;
    });
    return res.json({ attendance: scopedAttendance });
  });

  app.put('/api/attendance/:date', requireAdminAuth, (req: AuthedRequest, res) => {
    const { date } = req.params;
    const { records } = req.body || {};
    if (!records || typeof records !== 'object') {
      return res.status(400).json({ error: "Davomat formati noto'g'ri" });
    }
    const allowedIds = new Set(
      store.students.filter((s) => canAccessGrade(req.admin!, s.grade)).map((s) => s.id)
    );
    for (const studentId of Object.keys(records)) {
      if (!allowedIds.has(studentId)) {
        return res
          .status(403)
          .json({ error: "Sizga biriktirilmagan sinf davomatini o'zgartirish mumkin emas" });
      }
    }

    const prevDay = store.attendance[date] || {};
    const newlyAbsentIds: string[] = [];
    Object.entries(records as Record<string, 'present' | 'absent'>).forEach(
      ([studentId, status]) => {
        if (status === 'absent' && prevDay[studentId] !== 'absent') {
          newlyAbsentIds.push(studentId);
        }
      }
    );

    store.attendance[date] = {
      ...prevDay,
      ...records,
    };
    appendLog(req.admin!, 'attendance_updated', date, `${date} sanasi uchun davomat saqlandi`);
    saveStore(store);

    // Notify linked parents & students on Telegram when marked absent
    for (const studentId of newlyAbsentIds) {
      const student = store.students.find((s) => s.id === studentId);
      if (student) {
        void telegramBot.notifyAbsence(student, date);
      }
    }

    return res.json({ attendance: store.attendance });
  });

  app.get('/api/audit-logs', requireAdminAuth, (req: AuthedRequest, res) => {
    const logs =
      req.admin!.role === 'Super Admin'
        ? store.auditLogs
        : store.auditLogs.filter((l) => l.actorLogin === req.admin!.login);
    return res.json({ logs });
  });

  app.get('/api/system/export', requireSuperAdminAuth, (_req, res) => {
    return res.json({
      exportedAt: new Date().toISOString(),
      admins: store.admins.map(sanitizeAdmin),
      students: store.students,
      grades: store.grades,
      attendance: store.attendance,
      homework: store.homework,
      auditLogs: store.auditLogs,
    });
  });

  app.post('/api/system/reset', requireSuperAdminAuth, (req: AuthedRequest, res) => {
    const fresh = createInitialStore();
    fresh.admins = store.admins;
    fresh.telegramLinks = store.telegramLinks || [];
    store = fresh;
    appendLog(
      req.admin!,
      'system_reset',
      'Tizim bazasi',
      "O'quvchilar, baholar va davomat boshlang'ich holatga qaytarildi"
    );
    saveStore(store);
    return res.json({ ok: true });
  });

  // ---------------- REAL TELEGRAM BOT & PARENT MINI APP ("OPEN") ----------------
  const runtimeAppBaseUrl = (
    process.env.PUBLIC_APP_URL ||
    process.env.SHARED_APP_URL ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  ).replace(/\/+$/, '');

  const telegramBot = new MaktabTelegramBot({
    getStudents: () => store.students,
    getGrades: () => store.grades,
    getAttendance: () => store.attendance,
    getHomework: () => store.homework,
    getLinks: () => store.telegramLinks || [],
    saveLink: (link) => {
      if (!Array.isArray(store.telegramLinks)) store.telegramLinks = [];
      const idx = store.telegramLinks.findIndex((l) => l.chatId === link.chatId);
      if (idx >= 0) {
        store.telegramLinks[idx] = link;
      } else {
        store.telegramLinks.push(link);
      }
      saveStore(store);
    },
    getAuthSecret: () => AUTH_SECRET,
    getAppBaseUrl: () => runtimeAppBaseUrl,
  });

  const envBotToken = (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKE ||
    ''
  ).trim();

  if (envBotToken) {
    void telegramBot.startWithToken(envBotToken).then((r) => {
      if (r.ok) {
        const status = telegramBot.getStatus();
        console.log(
          `Telegram Bot connected: @${status.botUsername || 'bot'} (Open Mini App base: ${runtimeAppBaseUrl})`
        );
      } else {
        console.warn('Telegram Bot startup warning:', r.error);
      }
    });
  } else {
    console.log(
      'Telegram Bot waiting for TELEGRAM_BOT_TOKEN environment variable (set in Secrets / .env).'
    );
  }

  app.get('/api/health/bot', (_req, res) => {
    const status = telegramBot.getStatus();
    return res.json({
      ok: true,
      hasTokenEnv: Boolean(envBotToken),
      botConnected: status.connected,
      botRunning: status.running,
      botUsername: status.botUsername,
      lastError: status.lastError,
    });
  });

  // Public Parent Mini App endpoint — authenticated strictly via signed parent HMAC token
  app.get('/api/tg-app/student', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      return res.status(401).json({ error: "Ota-ona havolasi noto'g'ri yoki muddati tugagan" });
    }
    const verified = telegramBot.verifyParentToken(token);
    if (!verified) {
      return res.status(401).json({ error: "Ota-ona havolasi haqiqiy emas yoki muddati tugagan" });
    }
    const payload = telegramBot.buildParentPayload(verified.studentId);
    if (!payload) {
      return res.status(404).json({ error: "O'quvchi topilmadi" });
    }
    return res.json(payload);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Maktab.Uz server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
