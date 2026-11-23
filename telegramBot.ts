import crypto from 'crypto';
import {
  CLASS_LETTERS,
  DEFAULT_DISTRICT,
  DEFAULT_REGION,
  DEFAULT_SCHOOL,
  GRADE_NUMBERS,
  REGIONS_CATALOG,
  formatClassCode,
  getDistrictById,
  getRegionById,
} from './src/data/regionsCatalog.ts';
import { getGradeNumber, getSubjectsForGrade } from './src/data/initialData.ts';
import { buildWeeklySchedule } from './src/data/schoolSchedule.ts';
import type {
  AttendanceData,
  ClassLetter,
  HomeworkItem,
  Student,
  StudentGrades,
  TelegramBotStatus,
  TelegramChatLink,
  TelegramInlineButton,
  TelegramParentPayload,
  TelegramSessionSummary,
  TelegramSimulatorStep,
} from './src/types/index.ts';

export interface TelegramBotStoreAccess {
  getStudents: () => Student[];
  getGrades: () => StudentGrades;
  getAttendance: () => AttendanceData;
  getHomework: () => HomeworkItem[];
  getLinks: () => TelegramChatLink[];
  saveLink: (link: TelegramChatLink) => void;
  getAuthSecret: () => string;
  getAppBaseUrl: () => string;
}

interface ChatSessionState {
  chatId: string;
  userName: string;
  regionId?: string;
  districtId?: string;
  schoolName?: string;
  gradeNumber?: number;
  classLetter?: ClassLetter;
  studentId?: string;
  role?: 'parent' | 'student';
  updatedAt: string;
}

interface TgInlineKeyboardButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
}

interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    message?: {
      message_id: number;
      chat: { id: number };
    };
  };
}

const SCHOOLS_PER_PAGE = 16;

const DAY_SHORT_UZ: Record<string, string> = {
  mon: 'Du',
  tue: 'Se',
  wed: 'Cho',
  thu: 'Pa',
  fri: 'Ju',
  sat: 'Sha',
};

function shortDistrictLabel(name: string, count: number): string {
  const cleaned = name
    .replace(/\s+tumanlari$/i, '')
    .replace(/\s+tumani$/i, '')
    .replace(/\s+shahri$/i, '')
    .replace(/^Sergeli va Yangihayot$/i, 'Sergeli/Yangihayot');
  return `${cleaned} (${count})`;
}

function compactSchoolLabel(schoolName: string): { label: string; fullWidth: boolean } {
  const match = schoolName.match(/^(\d+)-maktab$/i);
  if (match) {
    return { label: `№ ${match[1]}`, fullWidth: false };
  }
  if (schoolName.toLowerCase().includes('abu ali ibn sino')) {
    return { label: '🏛 Abu Ali ibn Sino maktabi', fullWidth: true };
  }
  return { label: `🏛 ${schoolName}`, fullWidth: true };
}

function getTodayDayKey(): string {
  const day = new Date().getDay();
  const map: Record<number, string> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  return map[day] || 'mon';
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getStudentRegion(s: Student): string {
  return s.region || DEFAULT_REGION;
}

function getStudentDistrict(s: Student): string {
  return s.district || DEFAULT_DISTRICT;
}

function getStudentSchool(s: Student): string {
  return s.school || DEFAULT_SCHOOL;
}

function getStudentLetter(s: Student): ClassLetter {
  return s.classLetter || 'A';
}

export class MaktabTelegramBot {
  private token: string | null = null;
  private botUsername: string | null = null;
  private botFirstName: string | null = null;
  private running = false;
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastUpdateId = 0;
  private lastError: string | null = null;
  private sessions = new Map<string, ChatSessionState>();
  private access: TelegramBotStoreAccess;

  constructor(access: TelegramBotStoreAccess) {
    this.access = access;
  }

  // ---------------- SIGNED PARENT TOKEN (FOR "OPEN" MINI APP) ----------------
  public signParentToken(studentId: string): string {
    const payload = {
      sid: studentId,
      role: 'parent',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.access.getAuthSecret())
      .update(`tg-parent:${encoded}`)
      .digest('base64url');
    return `${encoded}.${sig}`;
  }

  public verifyParentToken(token: string): { studentId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = crypto
      .createHmac('sha256', this.access.getAuthSecret())
      .update(`tg-parent:${encoded}`)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
        sid?: string;
        role?: string;
        exp?: number;
      };
      if (parsed.role !== 'parent' || !parsed.sid || !parsed.exp || parsed.exp < Date.now()) {
        return null;
      }
      return { studentId: parsed.sid };
    } catch {
      return null;
    }
  }

  public buildParentMiniAppUrl(studentId: string, baseUrlOverride?: string): string {
    const base = (baseUrlOverride || this.access.getAppBaseUrl()).replace(/\/+$/, '');
    const token = this.signParentToken(studentId);
    return `${base}/tg-app?token=${encodeURIComponent(token)}`;
  }

  public buildParentPayload(studentId: string): TelegramParentPayload | null {
    const student = this.access.getStudents().find((s) => s.id === studentId);
    if (!student) return null;

    const subjects = getSubjectsForGrade(student.grade);
    const gradesMap = this.access.getGrades()[student.id] || {};
    const values: number[] = Object.values(gradesMap);
    const averageGrade =
      values.length > 0
        ? Number((values.reduce((acc, v) => acc + v, 0) / values.length).toFixed(2))
        : 0;

    const attendanceHistory = Object.entries(this.access.getAttendance())
      .filter(([, dayMap]) => dayMap[student.id] === 'present' || dayMap[student.id] === 'absent')
      .map(([date, dayMap]) => ({
        date,
        status: dayMap[student.id],
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const presentCount = attendanceHistory.filter((item) => item.status === 'present').length;
    const absentCount = attendanceHistory.filter((item) => item.status === 'absent').length;
    const attendanceRate =
      attendanceHistory.length > 0
        ? Math.round((presentCount / attendanceHistory.length) * 100)
        : 100;

    const gradeHomework = this.access
      .getHomework()
      .filter((hw) => hw.grade === student.grade)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const { password: _pw, ...safeStudent } = student;
    return {
      student: {
        ...safeStudent,
        region: getStudentRegion(student),
        district: getStudentDistrict(student),
        school: getStudentSchool(student),
        classLetter: getStudentLetter(student),
      },
      classCode: formatClassCode(student.grade, student.classLetter),
      subjects,
      grades: gradesMap,
      averageGrade,
      gradedCount: values.length,
      attendanceRate,
      presentCount,
      absentCount,
      attendanceHistory,
      weeklySchedule: buildWeeklySchedule(student.grade),
      homework: gradeHomework,
    };
  }

  public async notifyAbsence(student: Student, date: string): Promise<void> {
    if (!this.token) return;
    const links = this.access.getLinks().filter((l) => l.studentId === student.id);
    if (links.length === 0) return;

    const classCode = formatClassCode(student.grade, student.classLetter);
    const school = getStudentSchool(student);
    const fullName = `${student.firstName} ${student.lastName}`;

    for (const link of links) {
      const chatIdNum = Number(link.chatId);
      if (!Number.isFinite(chatIdNum)) continue;

      if (link.role === 'parent') {
        const text =
          `⚠️ <b>Davomat xabarnomasi</b>\n\n` +
          `Assalomu alaykum! Farzandingiz <b>${escapeHtml(fullName)}</b> ` +
          `(${escapeHtml(school)} · ${escapeHtml(classCode)}) ` +
          `<b>${escapeHtml(date)}</b> kuni darsga <b>kelmadi</b> deb belgilandi.`;
        await this.callApi('sendMessage', {
          chat_id: chatIdNum,
          text,
          parse_mode: 'HTML',
        }).catch(() => {});
      } else if (link.role === 'student') {
        const text =
          `⚠️ <b>Davomat ogohlantirishi</b>\n\n` +
          `<b>${escapeHtml(student.firstName)}</b>, <b>${escapeHtml(date)}</b> kuni nega darsga kelmadingiz?\n` +
          `Ustozingiz sizni davomatda <b>"kelmadi"</b> deb belgiladi.`;
        await this.callApi('sendMessage', {
          chat_id: chatIdNum,
          text,
          parse_mode: 'HTML',
        }).catch(() => {});
      }
    }
  }

  // ---------------- LIFECYCLE & STATUS ----------------
  public async startWithToken(rawToken: string): Promise<{ ok: boolean; error?: string }> {
    const clean = rawToken.trim();
    if (!clean || !/^\d+:[A-Za-z0-9_-]{20,}$/.test(clean)) {
      return { ok: false, error: "Telegram Bot token formati noto'g'ri" };
    }

    this.stop();
    try {
      const me = await this.callApiWithToken<{
        id: number;
        username?: string;
        first_name?: string;
      }>(clean, 'getMe');
      this.token = clean;
      this.botUsername = me.username || null;
      this.botFirstName = me.first_name || 'Maktab.Uz Bot';
      this.lastError = null;

      // Clear any stale webhook so long polling works immediately
      await this.callApi('deleteWebhook', { drop_pending_updates: false }).catch(() => {});

      // Register /start command in Telegram command menu
      await this.callApi('setMyCommands', {
        commands: [
          { command: 'start', description: 'Hudud, maktab va o‘quvchini tanlash' },
        ],
      }).catch(() => {});

      // Reset global default menu button so "Open" ONLY shows for parents per chat
      await this.callApi('setChatMenuButton', {
        menu_button: { type: 'default' },
      }).catch(() => {});

      this.running = true;
      this.schedulePoll(300);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Telegram API bilan ulanib bo‘lmadi';
      this.lastError = msg;
      this.running = false;
      return { ok: false, error: msg };
    }
  }

  public stop(): void {
    this.running = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  public disconnect(): void {
    this.stop();
    this.token = null;
    this.botUsername = null;
    this.botFirstName = null;
    this.lastError = null;
  }

  public getStatus(): TelegramBotStatus {
    const allSessions = Array.from(this.sessions.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    const linkedParentsCount = allSessions.filter((s) => s.role === 'parent').length;
    const linkedStudentsCount = allSessions.filter((s) => s.role === 'student').length;

    const recentSessions: TelegramSessionSummary[] = allSessions.slice(0, 12).map((s) => {
      const region = s.regionId ? getRegionById(s.regionId) : undefined;
      const district =
        s.regionId && s.districtId ? getDistrictById(s.regionId, s.districtId) : undefined;
      const student = s.studentId
        ? this.access.getStudents().find((st) => st.id === s.studentId)
        : undefined;
      return {
        chatId: s.chatId,
        userName: s.userName,
        regionName: region?.name,
        districtName: district?.name,
        schoolName: s.schoolName,
        classCode:
          s.gradeNumber && s.classLetter ? `${s.gradeNumber}-${s.classLetter}` : undefined,
        studentName: student ? `${student.firstName} ${student.lastName}` : undefined,
        role: s.role,
        updatedAt: s.updatedAt,
      };
    });

    return {
      connected: Boolean(this.token && this.botUsername),
      running: this.running,
      botUsername: this.botUsername,
      botFirstName: this.botFirstName,
      appBaseUrl: this.access.getAppBaseUrl(),
      lastError: this.lastError,
      linkedParentsCount,
      linkedStudentsCount,
      recentSessions,
    };
  }

  // ---------------- TELEGRAM HTTP API ----------------
  private async callApiWithToken<T>(
    token: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.description || `Telegram API xatoligi (${res.status})`);
    }
    return data.result as T;
  }

  private async callApi<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    if (!this.token) {
      throw new Error('Telegram Bot token ulanmagan');
    }
    return this.callApiWithToken<T>(this.token, method, body);
  }

  private schedulePoll(delayMs: number): void {
    if (!this.running) return;
    this.pollingTimer = setTimeout(() => {
      void this.pollOnce();
    }, delayMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.running || !this.token) return;
    try {
      const updates = await this.callApi<TgUpdate[]>('getUpdates', {
        offset: this.lastUpdateId + 1,
        timeout: 20,
        allowed_updates: ['message', 'callback_query'],
      });
      this.lastError = null;
      for (const upd of updates) {
        this.lastUpdateId = Math.max(this.lastUpdateId, upd.update_id);
        await this.handleUpdate(upd);
      }
      this.schedulePoll(250);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Polling xatoligi';
      this.lastError = msg;
      // Back off longer on transient errors or 409 conflict
      this.schedulePoll(msg.includes('409') ? 5000 : 3000);
    }
  }

  // ---------------- REAL TELEGRAM UPDATE HANDLER ----------------
  private async handleUpdate(update: TgUpdate): Promise<void> {
    if (update.message?.text) {
      const chatId = String(update.message.chat.id);
      const userName = [update.message.from?.first_name, update.message.from?.last_name]
        .filter(Boolean)
        .join(' ') || update.message.from?.username || `Foydalanuvchi #${chatId.slice(-4)}`;

      const text = update.message.text.trim();
      const lower = text.toLowerCase();
      if (lower.startsWith('/start') || lower === 'start' || !this.sessions.has(chatId)) {
        // Show native Telegram "typing..." loading indicator before responding
        await this.callApi('sendChatAction', {
          chat_id: Number(chatId),
          action: 'typing',
        }).catch(() => {});

        const step = this.processAction(chatId, userName, 'start', false);
        await this.syncTelegramMenuButton(chatId, step);
        await this.callApi('sendMessage', {
          chat_id: Number(chatId),
          text: step.text,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: this.toTelegramKeyboard(step.buttons) },
        }).catch(() => {});
      }
      return;
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = String(cb.message?.chat.id ?? cb.from.id);
      const messageId = cb.message?.message_id;
      const userName = [cb.from.first_name, cb.from.last_name]
        .filter(Boolean)
        .join(' ') || cb.from.username || `Foydalanuvchi #${chatId.slice(-4)}`;

      const action = cb.data || 'start';
      const loadingToast =
        action.startsWith('pg:') ||
        action.startsWith('ps:') ||
        action.startsWith('ph:') ||
        action.startsWith('pa:') ||
        action.startsWith('ss:') ||
        action.startsWith('sh:') ||
        action.startsWith('scred:') ||
        action.startsWith('rl:')
          ? '⏳ Yuklanmoqda...'
          : undefined;

      await this.callApi('answerCallbackQuery', {
        callback_query_id: cb.id,
        ...(loadingToast ? { text: loadingToast } : {}),
      }).catch(() => {});

      const step = this.processAction(chatId, userName, action, false);
      await this.syncTelegramMenuButton(chatId, step);

      if (messageId) {
        await this.callApi('editMessageText', {
          chat_id: Number(chatId),
          message_id: messageId,
          text: step.text,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: this.toTelegramKeyboard(step.buttons) },
        }).catch(async () => {
          await this.callApi('sendMessage', {
            chat_id: Number(chatId),
            text: step.text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: this.toTelegramKeyboard(step.buttons) },
          }).catch(() => {});
        });
      }
    }
  }

  private async syncTelegramMenuButton(chatId: string, step: TelegramSimulatorStep): Promise<void> {
    if (!this.token) return;
    if (step.openButtonVisible && step.openAppUrl && step.openAppUrl.startsWith('https://')) {
      await this.callApi('setChatMenuButton', {
        chat_id: Number(chatId),
        menu_button: {
          type: 'web_app',
          text: 'Open',
          web_app: { url: step.openAppUrl },
        },
      }).catch((err) => {
        console.warn('Telegram setChatMenuButton (Open) error:', err instanceof Error ? err.message : err);
      });
    } else if (!step.openButtonVisible) {
      await this.callApi('setChatMenuButton', {
        chat_id: Number(chatId),
        menu_button: { type: 'default' },
      }).catch(() => {});
    }
  }

  private toTelegramKeyboard(buttons: TelegramInlineButton[][]): TgInlineKeyboardButton[][] {
    return buttons.map((row) =>
      row
        .map((btn): TgInlineKeyboardButton | null => {
          if (btn.webAppUrl) {
            if (!btn.webAppUrl.startsWith('https://')) {
              return null;
            }
            return { text: btn.text, web_app: { url: btn.webAppUrl } };
          }
          return { text: btn.text, callback_data: btn.callbackData || 'start' };
        })
        .filter((b): b is TgInlineKeyboardButton => b !== null)
    ).filter((row) => row.length > 0);
  }

  // ---------------- SHARED BOT FLOW ENGINE (LIVE + SIMULATOR) ----------------
  public simulate(
    sessionId: string,
    userName: string,
    action: string,
    baseUrlOverride?: string
  ): TelegramSimulatorStep {
    return this.processAction(`sim_${sessionId}`, userName, action, true, baseUrlOverride);
  }

  private getOrCreateSession(chatId: string, userName: string): ChatSessionState {
    const existing = this.sessions.get(chatId);
    if (existing) {
      existing.userName = userName;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const created: ChatSessionState = {
      chatId,
      userName,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(chatId, created);
    return created;
  }

  private buildBreadcrumb(session: ChatSessionState): string[] {
    const parts: string[] = [];
    const region = session.regionId ? getRegionById(session.regionId) : undefined;
    const district =
      session.regionId && session.districtId
        ? getDistrictById(session.regionId, session.districtId)
        : undefined;
    if (region) parts.push(region.shortName);
    if (district) parts.push(district.name);
    if (session.schoolName) parts.push(session.schoolName);
    if (session.gradeNumber) {
      parts.push(
        session.classLetter ? `${session.gradeNumber}-${session.classLetter}` : `${session.gradeNumber}-sinf`
      );
    }
    return parts;
  }

  private processAction(
    chatId: string,
    userName: string,
    action: string,
    isPlainTextMode: boolean,
    baseUrlOverride?: string
  ): TelegramSimulatorStep {
    const session = this.getOrCreateSession(chatId, userName);
    const fmt = (bold: string) => (isPlainTextMode ? bold : `<b>${escapeHtml(bold)}</b>`);
    const esc = (raw: string) => (isPlainTextMode ? raw : escapeHtml(raw));

    // STEP 1: /start — 14 regions in compact 7x2 balanced grid
    if (action === 'start') {
      session.regionId = undefined;
      session.districtId = undefined;
      session.schoolName = undefined;
      session.gradeNumber = undefined;
      session.classLetter = undefined;
      session.studentId = undefined;
      session.role = undefined;

      const rows: TelegramInlineButton[][] = [];
      for (let i = 0; i < REGIONS_CATALOG.length; i += 2) {
        const pair = REGIONS_CATALOG.slice(i, i + 2).map((r) => ({
          text: r.id === 'toshkent_sh' ? `🏙 ${r.shortName}` : r.shortName,
          callbackData: `rg:${r.id}`,
        }));
        rows.push(pair);
      }

      return {
        text: `🏫 ${fmt('Maktab.Uz')}\n━━━━━━━━━━━━━━\nHududingizni tanlang:`,
        buttons: rows,
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: [],
      };
    }

    // STEP 2: Region selected -> Compact 2-column Districts
    if (action.startsWith('rg:')) {
      const regionId = action.slice(3);
      const region = getRegionById(regionId);
      if (!region) return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);

      session.regionId = region.id;
      session.districtId = undefined;
      session.schoolName = undefined;
      session.gradeNumber = undefined;
      session.classLetter = undefined;
      session.studentId = undefined;
      session.role = undefined;

      const rows: TelegramInlineButton[][] = [];
      for (let i = 0; i < region.districts.length; i += 2) {
        rows.push(
          region.districts.slice(i, i + 2).map((d) => ({
            text: shortDistrictLabel(d.name, d.schools.length),
            callbackData: `dt:${region.id}:${d.id}:0`,
          }))
        );
      }
      rows.push([{ text: '⬅️ Hududlar', callbackData: 'start' }]);

      return {
        text: `📍 ${fmt(region.name)}\n━━━━━━━━━━━━━━\nTumanni tanlang:`,
        buttons: rows,
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 3: District selected -> Compact 4-column School Numbers (16 per page = 4 crisp rows)
    if (action.startsWith('dt:')) {
      const [, regionId, districtId, pageStr] = action.split(':');
      const region = getRegionById(regionId);
      const district = getDistrictById(regionId, districtId);
      if (!region || !district) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.regionId = region.id;
      session.districtId = district.id;
      session.schoolName = undefined;
      session.gradeNumber = undefined;
      session.classLetter = undefined;
      session.studentId = undefined;
      session.role = undefined;

      const page = Math.max(0, parseInt(pageStr || '0', 10) || 0);
      const totalPages = Math.max(1, Math.ceil(district.schools.length / SCHOOLS_PER_PAGE));
      const safePage = Math.min(page, totalPages - 1);
      const startIdx = safePage * SCHOOLS_PER_PAGE;
      const slice = district.schools.slice(startIdx, startIdx + SCHOOLS_PER_PAGE);

      const rows: TelegramInlineButton[][] = [];
      let numRow: TelegramInlineButton[] = [];
      slice.forEach((schoolName, offset) => {
        const globalIdx = startIdx + offset;
        const { label, fullWidth } = compactSchoolLabel(schoolName);
        const btn: TelegramInlineButton = {
          text: label,
          callbackData: `sc:${region.id}:${district.id}:${globalIdx}`,
        };
        if (fullWidth) {
          if (numRow.length > 0) {
            rows.push(numRow);
            numRow = [];
          }
          rows.push([btn]);
        } else {
          numRow.push(btn);
          if (numRow.length === 4) {
            rows.push(numRow);
            numRow = [];
          }
        }
      });
      if (numRow.length > 0) rows.push(numRow);

      if (totalPages > 1) {
        const navRow: TelegramInlineButton[] = [];
        if (safePage > 0) {
          navRow.push({
            text: '◀️ Oldingi',
            callbackData: `dt:${region.id}:${district.id}:${safePage - 1}`,
          });
        }
        navRow.push({
          text: `${safePage + 1} / ${totalPages}`,
          callbackData: `dt:${region.id}:${district.id}:${safePage}`,
        });
        if (safePage < totalPages - 1) {
          navRow.push({
            text: 'Keyingi ▶️',
            callbackData: `dt:${region.id}:${district.id}:${safePage + 1}`,
          });
        }
        rows.push(navRow);
      }

      rows.push([
        { text: '⬅️ Tumanlar', callbackData: `rg:${region.id}` },
        { text: '🏠 Boshiga', callbackData: 'start' },
      ]);

      return {
        text: `📍 ${esc(region.shortName)} · ${fmt(district.name)}\n━━━━━━━━━━━━━━\nMaktab raqamini tanlang (${district.schools.length} ta):`,
        buttons: rows,
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 4: School selected -> Compact 4-column Grades 1..11 (3 rows)
    if (action.startsWith('sc:')) {
      const [, regionId, districtId, schoolIdxStr] = action.split(':');
      const region = getRegionById(regionId);
      const district = getDistrictById(regionId, districtId);
      const schoolIdx = parseInt(schoolIdxStr || '0', 10);
      const schoolName = district?.schools[schoolIdx];
      if (!region || !district || !schoolName) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.regionId = region.id;
      session.districtId = district.id;
      session.schoolName = schoolName;
      session.gradeNumber = undefined;
      session.classLetter = undefined;
      session.studentId = undefined;
      session.role = undefined;

      const rows: TelegramInlineButton[][] = [];
      for (let i = 0; i < GRADE_NUMBERS.length; i += 4) {
        rows.push(
          GRADE_NUMBERS.slice(i, i + 4).map((num) => ({
            text: `${num}-sinf`,
            callbackData: `gr:${num}`,
          }))
        );
      }
      rows.push([
        { text: '⬅️ Maktablar', callbackData: `dt:${region.id}:${district.id}:0` },
        { text: '🏠 Boshiga', callbackData: 'start' },
      ]);

      return {
        text: `🏫 ${fmt(schoolName)} · ${esc(district.name)}\n━━━━━━━━━━━━━━\nSinfni tanlang:`,
        buttons: rows,
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 5: Grade Number selected -> Single crisp row A, B, V, G, D
    if (action.startsWith('gr:')) {
      const gradeNum = parseInt(action.slice(3), 10);
      if (!GRADE_NUMBERS.includes(gradeNum) || !session.schoolName) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.gradeNumber = gradeNum;
      session.classLetter = undefined;
      session.studentId = undefined;
      session.role = undefined;

      const letterRow: TelegramInlineButton[] = CLASS_LETTERS.map((letter) => ({
        text: `${gradeNum}-${letter}`,
        callbackData: `lt:${letter}`,
      }));

      const district =
        session.regionId && session.districtId
          ? getDistrictById(session.regionId, session.districtId)
          : undefined;
      const schoolIdx = district ? Math.max(0, district.schools.indexOf(session.schoolName)) : 0;

      return {
        text: `🏫 ${esc(session.schoolName)} · ${fmt(`${gradeNum}-sinf`)}\n━━━━━━━━━━━━━━\nSinf harfini tanlang:`,
        buttons: [
          letterRow,
          [
            {
              text: '⬅️ Sinflar',
              callbackData: `sc:${session.regionId}:${session.districtId}:${schoolIdx}`,
            },
            { text: '🏠 Boshiga', callbackData: 'start' },
          ],
        ],
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 6: Class Letter selected -> Neat 2-column Students grid
    if (action.startsWith('lt:')) {
      const letter = action.slice(3) as ClassLetter;
      if (!CLASS_LETTERS.includes(letter) || !session.gradeNumber || !session.schoolName) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.classLetter = letter;
      session.studentId = undefined;
      session.role = undefined;

      const activeDistrict =
        session.regionId && session.districtId
          ? getDistrictById(session.regionId, session.districtId)
          : undefined;
      const allStudents = this.access.getStudents();
      const exactStudents = allStudents.filter(
        (s) =>
          (!activeDistrict || getStudentDistrict(s) === activeDistrict.name) &&
          getStudentSchool(s) === session.schoolName &&
          getGradeNumber(s.grade) === session.gradeNumber &&
          getStudentLetter(s) === letter
      );

      const rows: TelegramInlineButton[][] = [];
      let pairRow: TelegramInlineButton[] = [];
      exactStudents.forEach((st) => {
        const fullName = `${st.firstName} ${st.lastName}`;
        const btn: TelegramInlineButton = {
          text: `👤 ${fullName}`,
          callbackData: `st:${st.id}`,
        };
        if (fullName.length > 17) {
          if (pairRow.length > 0) {
            rows.push(pairRow);
            pairRow = [];
          }
          rows.push([btn]);
        } else {
          pairRow.push(btn);
          if (pairRow.length === 2) {
            rows.push(pairRow);
            pairRow = [];
          }
        }
      });
      if (pairRow.length > 0) rows.push(pairRow);

      rows.push([
        { text: '⬅️ Harflar', callbackData: `gr:${session.gradeNumber}` },
        { text: '🏠 Boshiga', callbackData: 'start' },
      ]);

      const text =
        exactStudents.length > 0
          ? `🏫 ${esc(session.schoolName)} · ${fmt(`${session.gradeNumber}-${letter}`)}\n━━━━━━━━━━━━━━\nO'quvchini tanlang (${exactStudents.length} nafar):`
          : `🏫 ${esc(session.schoolName)} · ${fmt(`${session.gradeNumber}-${letter}`)}\n━━━━━━━━━━━━━━\nBu sinfda hozircha o'quvchilar yo'q.\nSaytga o'quvchi qo'shilsa, bu yerda avtomatik chiqadi.`;

      return {
        text,
        buttons: rows,
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 7: Student selected -> Clean role question
    if (action.startsWith('st:')) {
      const studentId = action.slice(3);
      const student = this.access.getStudents().find((s) => s.id === studentId);
      if (!student) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = student.id;
      session.schoolName = getStudentSchool(student);
      session.gradeNumber = getGradeNumber(student.grade);
      session.classLetter = getStudentLetter(student);
      session.role = undefined;

      const classCode = formatClassCode(student.grade, student.classLetter);

      return {
        text: `👤 ${fmt(`${student.firstName} ${student.lastName}`)}\n🏫 ${esc(getStudentSchool(student))} · ${esc(classCode)}\n━━━━━━━━━━━━━━\n${fmt("Siz kimsiz?")}\nShu o'quvchimisiz yoki ota-onasimisiz?`,
        buttons: [
          [
            { text: '👨‍👩‍👦 Ota-onaman', callbackData: `rl:parent:${student.id}` },
            { text: "🎓 O'quvchiman", callbackData: `rl:student:${student.id}` },
          ],
          [
            { text: "⬅️ O'quvchilar", callbackData: `lt:${getStudentLetter(student)}` },
            { text: '🏠 Boshiga', callbackData: 'start' },
          ],
        ],
        openButtonVisible: false,
        openAppUrl: null,
        role: null,
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 8A: Role = PARENT -> Save Link + Enable "Open" WebApp Button + Clean 2x2 Menu
    if (action.startsWith('rl:parent:')) {
      const studentId = action.slice('rl:parent:'.length);
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'parent';
      if (!isPlainTextMode) {
        this.access.saveLink({
          chatId,
          studentId,
          role: 'parent',
          userName,
          updatedAt: new Date().toISOString(),
        });
      }
      const openUrl = this.buildParentMiniAppUrl(studentId, baseUrlOverride);
      const latestAtt = payload.attendanceHistory[0];
      const attLine = latestAtt
        ? `\n📌 Davomat (${esc(latestAtt.date)}): ${
            latestAtt.status === 'present' ? '✅ Qatnashdi' : '❌ Kelmadi'
          }`
        : '';

      return {
        text: `👨‍👩‍👦 ${fmt('Ota-ona kabineti')}\n━━━━━━━━━━━━━━\n👤 ${fmt(`${payload.student.firstName} ${payload.student.lastName}`)}\n🏫 ${esc(payload.student.school || DEFAULT_SCHOOL)} · ${esc(payload.classCode)}${attLine}\n\n🔔 Darsga kelmasa darhol xabar keladi.\nPastdagi tugmalarni yoki chap pastdagi ${fmt('Open')} ni bosing:`,
        buttons: [
          [
            { text: '📊 Baholar', callbackData: `pg:${studentId}` },
            { text: '📅 Kundalik', callbackData: `ps:${studentId}:${getTodayDayKey()}` },
          ],
          [
            { text: '📝 Uy vazifalari', callbackData: `ph:${studentId}` },
            { text: '✅ Davomat', callbackData: `pa:${studentId}` },
          ],
          [{ text: "🔄 Boshqa o'quvchi", callbackData: 'start' }],
        ],
        openButtonVisible: true,
        openAppUrl: openUrl,
        role: 'parent',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 8B: Parent Grades (clean compact card)
    if (action.startsWith('pg:')) {
      const studentId = action.slice(3);
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'parent';
      const openUrl = this.buildParentMiniAppUrl(studentId, baseUrlOverride);
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      const gradeLines = payload.subjects
        .filter((subj) => payload.grades[subj] !== undefined)
        .map((subj) => `▫️ ${esc(subj)} — ${code(String(payload.grades[subj]))}`);

      const gradesBlock =
        gradeLines.length > 0
          ? `${gradeLines.join('\n')}\n━━━━━━━━━━━━━━\n⭐ O'rtacha: ${fmt(payload.averageGrade.toFixed(2))} / 5.00`
          : 'Ustoz hali baho qo‘ymagan.';

      return {
        text: `📊 ${fmt('Baholar')}\n👤 ${esc(`${payload.student.firstName} ${payload.student.lastName}`)} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${gradesBlock}`,
        buttons: [
          [
            { text: '📅 Kundalik', callbackData: `ps:${studentId}:${getTodayDayKey()}` },
            { text: '📝 Vazifa', callbackData: `ph:${studentId}` },
            { text: '✅ Davomat', callbackData: `pa:${studentId}` },
          ],
          [{ text: '⬅️ Asosiy menyu', callbackData: `rl:parent:${studentId}` }],
        ],
        openButtonVisible: true,
        openAppUrl: openUrl,
        role: 'parent',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 8C: Parent Weekly Diary — compact day-by-day view + day switcher row!
    if (action.startsWith('ps:')) {
      const [, studentId, reqDayKey] = action.split(':');
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'parent';
      const openUrl = this.buildParentMiniAppUrl(studentId, baseUrlOverride);
      const activeDayKey = reqDayKey || getTodayDayKey();
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      let scheduleBody = '';
      if (activeDayKey === 'all') {
        scheduleBody = payload.weeklySchedule
          .map((d) => {
            const list = d.lessons.map((l) => `${l.period}. ${esc(l.subject)}`).join(' · ');
            return `📌 ${fmt(d.dayUz)}\n${list}`;
          })
          .join('\n\n');
      } else {
        const dayObj =
          payload.weeklySchedule.find((d) => d.dayKey === activeDayKey) ||
          payload.weeklySchedule[0];
        const items = dayObj.lessons
          .map((l) => `${l.period}. ${fmt(l.subject)}\n    🕒 ${code(l.time)} · ${esc(l.room)}`)
          .join('\n');
        scheduleBody = `📌 ${fmt(dayObj.dayUz)}\n\n${items}`;
      }

      const dayRow: TelegramInlineButton[] = payload.weeklySchedule.map((d) => ({
        text: d.dayKey === activeDayKey ? `• ${DAY_SHORT_UZ[d.dayKey] || d.dayUz.slice(0, 2)} •` : DAY_SHORT_UZ[d.dayKey] || d.dayUz.slice(0, 2),
        callbackData: `ps:${studentId}:${d.dayKey}`,
      }));

      return {
        text: `📅 ${fmt('Haftalik kundalik')} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${scheduleBody}`,
        buttons: [
          dayRow,
          [
            {
              text: activeDayKey === 'all' ? '• To‘liq hafta •' : '📋 To‘liq hafta',
              callbackData: `ps:${studentId}:all`,
            },
            { text: '📊 Baholar', callbackData: `pg:${studentId}` },
          ],
          [{ text: '⬅️ Asosiy menyu', callbackData: `rl:parent:${studentId}` }],
        ],
        openButtonVisible: true,
        openAppUrl: openUrl,
        role: 'parent',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 8D: Parent Homework (compact scannable cards)
    if (action.startsWith('ph:')) {
      const studentId = action.slice(3);
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'parent';
      const openUrl = this.buildParentMiniAppUrl(studentId, baseUrlOverride);
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      const hwText =
        payload.homework.length > 0
          ? payload.homework
              .map((hw, idx) => `${idx + 1}. ${fmt(hw.subject)} (${code(hw.dueDate)})\n    ${esc(hw.title)}`)
              .join('\n\n')
          : 'Hozircha uy vazifalari berilmagan.';

      return {
        text: `📝 ${fmt('Uy vazifalari')} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${hwText}`,
        buttons: [
          [
            { text: '📊 Baholar', callbackData: `pg:${studentId}` },
            { text: '📅 Kundalik', callbackData: `ps:${studentId}:${getTodayDayKey()}` },
            { text: '✅ Davomat', callbackData: `pa:${studentId}` },
          ],
          [{ text: '⬅️ Asosiy menyu', callbackData: `rl:parent:${studentId}` }],
        ],
        openButtonVisible: true,
        openAppUrl: openUrl,
        role: 'parent',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 8E: Parent Attendance (compact teacher-marked list)
    if (action.startsWith('pa:')) {
      const studentId = action.slice(3);
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'parent';
      const openUrl = this.buildParentMiniAppUrl(studentId, baseUrlOverride);
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      const attText =
        payload.attendanceHistory.length > 0
          ? payload.attendanceHistory
              .slice(0, 12)
              .map(
                (item) =>
                  `${item.status === 'present' ? '✅' : '❌'} ${code(item.date)} — ${
                    item.status === 'present' ? 'Qatnashdi' : 'Kelmadi'
                  }`
              )
              .join('\n') +
            `\n━━━━━━━━━━━━━━\nKeldi: ${fmt(String(payload.presentCount))} · Kelmadi: ${fmt(String(payload.absentCount))} (${fmt(`${payload.attendanceRate}%`)})`
          : "Ustoz hali davomat belgilamagan.";

      return {
        text: `✅ ${fmt('Darsda qatnashishi')}\n👤 ${esc(`${payload.student.firstName} ${payload.student.lastName}`)} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${attText}`,
        buttons: [
          [
            { text: '📊 Baholar', callbackData: `pg:${studentId}` },
            { text: '📅 Kundalik', callbackData: `ps:${studentId}:${getTodayDayKey()}` },
            { text: '📝 Vazifa', callbackData: `ph:${studentId}` },
          ],
          [{ text: '⬅️ Asosiy menyu', callbackData: `rl:parent:${studentId}` }],
        ],
        openButtonVisible: true,
        openAppUrl: openUrl,
        role: 'parent',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 9: Role = STUDENT -> NO "Open" button! Compact menu + Login parolim
    if (action.startsWith('rl:student:')) {
      const studentId = action.slice('rl:student:'.length);
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'student';
      if (!isPlainTextMode) {
        this.access.saveLink({
          chatId,
          studentId,
          role: 'student',
          userName,
          updatedAt: new Date().toISOString(),
        });
      }

      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);
      const gradeLines = payload.subjects
        .filter((subj) => payload.grades[subj] !== undefined)
        .map((subj) => `▫️ ${esc(subj)} — ${code(String(payload.grades[subj]))}`);

      const gradesSummary =
        gradeLines.length > 0
          ? `${gradeLines.join('\n')}\n━━━━━━━━━━━━━━\n⭐ O'rtacha: ${fmt(payload.averageGrade.toFixed(2))} / 5.00`
          : 'Ustoz hali baho kiritmagan.';

      return {
        text: `🎓 ${fmt(`${payload.student.firstName} ${payload.student.lastName}`)}\n🏫 ${esc(payload.student.school || DEFAULT_SCHOOL)} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${gradesSummary}`,
        buttons: [
          [{ text: '🔐 Login va parolim', callbackData: `scred:${studentId}` }],
          [
            { text: '📅 Kundalik', callbackData: `ss:${studentId}:${getTodayDayKey()}` },
            { text: '📝 Uy vazifalarim', callbackData: `sh:${studentId}` },
          ],
          [{ text: '🏠 Boshiga', callbackData: 'start' }],
        ],
        openButtonVisible: false,
        openAppUrl: null,
        role: 'student',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 9A: Student clicked "Login va parolim"
    if (action.startsWith('scred:')) {
      const studentId = action.slice('scred:'.length);
      const student = this.access.getStudents().find((s) => s.id === studentId);
      if (!student) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'student';
      const classCode = formatClassCode(student.grade, student.classLetter);
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      return {
        text: `🔐 ${fmt('Login va parolim')}\n━━━━━━━━━━━━━━\n👤 ${fmt(`${student.firstName} ${student.lastName}`)}\n🏫 ${esc(getStudentSchool(student))} · ${esc(classCode)}\n\n🆔 Login: ${code(student.login)}\n🔑 Parol: ${code(student.password || 'pass1234')}\n\n(Nusxa olish uchun ustiga bosing)`,
        buttons: [
          [
            { text: '📊 Baholarim', callbackData: `rl:student:${studentId}` },
            { text: '📅 Kundalik', callbackData: `ss:${studentId}:${getTodayDayKey()}` },
          ],
          [{ text: '📝 Uy vazifalarim', callbackData: `sh:${studentId}` }],
        ],
        openButtonVisible: false,
        openAppUrl: null,
        role: 'student',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 9B: Student Weekly Diary — compact day-by-day view
    if (action.startsWith('ss:')) {
      const [, studentId, reqDayKey] = action.split(':');
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'student';
      const activeDayKey = reqDayKey || getTodayDayKey();
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      let scheduleBody = '';
      if (activeDayKey === 'all') {
        scheduleBody = payload.weeklySchedule
          .map((d) => {
            const list = d.lessons.map((l) => `${l.period}. ${esc(l.subject)}`).join(' · ');
            return `📌 ${fmt(d.dayUz)}\n${list}`;
          })
          .join('\n\n');
      } else {
        const dayObj =
          payload.weeklySchedule.find((d) => d.dayKey === activeDayKey) ||
          payload.weeklySchedule[0];
        const items = dayObj.lessons
          .map((l) => `${l.period}. ${fmt(l.subject)}\n    🕒 ${code(l.time)} · ${esc(l.room)}`)
          .join('\n');
        scheduleBody = `📌 ${fmt(dayObj.dayUz)}\n\n${items}`;
      }

      const dayRow: TelegramInlineButton[] = payload.weeklySchedule.map((d) => ({
        text: d.dayKey === activeDayKey ? `• ${DAY_SHORT_UZ[d.dayKey] || d.dayUz.slice(0, 2)} •` : DAY_SHORT_UZ[d.dayKey] || d.dayUz.slice(0, 2),
        callbackData: `ss:${studentId}:${d.dayKey}`,
      }));

      return {
        text: `📅 ${fmt('Haftalik kundalik')} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${scheduleBody}`,
        buttons: [
          dayRow,
          [
            {
              text: activeDayKey === 'all' ? '• To‘liq hafta •' : '📋 To‘liq hafta',
              callbackData: `ss:${studentId}:all`,
            },
            { text: '🔐 Login parolim', callbackData: `scred:${studentId}` },
          ],
          [{ text: '⬅️ Baholarim', callbackData: `rl:student:${studentId}` }],
        ],
        openButtonVisible: false,
        openAppUrl: null,
        role: 'student',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    // STEP 9C: Student Homework (compact)
    if (action.startsWith('sh:')) {
      const studentId = action.slice(3);
      const payload = this.buildParentPayload(studentId);
      if (!payload) {
        return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
      }

      session.studentId = studentId;
      session.role = 'student';
      const code = (val: string) => (isPlainTextMode ? val : `<code>${escapeHtml(val)}</code>`);

      const hwText =
        payload.homework.length > 0
          ? payload.homework
              .map((hw, idx) => `${idx + 1}. ${fmt(hw.subject)} (${code(hw.dueDate)})\n    ${esc(hw.title)}`)
              .join('\n\n')
          : 'Hozircha uy vazifalari berilmagan.';

      return {
        text: `📝 ${fmt('Uy vazifalarim')} · ${esc(payload.classCode)}\n━━━━━━━━━━━━━━\n${hwText}`,
        buttons: [
          [
            { text: '📊 Baholarim', callbackData: `rl:student:${studentId}` },
            { text: '🔐 Login parolim', callbackData: `scred:${studentId}` },
          ],
          [{ text: '🏠 Boshiga', callbackData: 'start' }],
        ],
        openButtonVisible: false,
        openAppUrl: null,
        role: 'student',
        breadcrumb: this.buildBreadcrumb(session),
      };
    }

    return this.processAction(chatId, userName, 'start', isPlainTextMode, baseUrlOverride);
  }
}
