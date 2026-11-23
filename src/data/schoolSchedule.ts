import { getSubjectsForGrade } from './initialData.ts';
import type { DaySchedule, HomeworkItem } from '../types';

const TEACHER_MAP: Record<string, string> = {
  Algebra: 'M. Qodirova',
  Geometriya: 'M. Qodirova',
  Matematika: 'M. Qodirova',
  Fizika: 'A. Tursunov',
  Kimyo: 'N. Saidova',
  Biologiya: 'G. Rahimova',
  'Ona tili': 'D. Abdullayeva',
  Adabiyot: 'D. Abdullayeva',
  "O'qish savodxonligi": 'Z. Xasanova',
  'Ingliz tili': 'S. Karimova',
  Informatika: 'B. Islomov',
  "O'zbekiston tarixi": 'O. Mamatov',
  'Jahon tarixi': 'O. Mamatov',
  Geografiya: 'R. Toshmatov',
  'Tabiiy fan': 'G. Rahimova',
  Tarbiya: 'D. Abdullayeva',
  Texnologiya: 'J. Nurmatov',
  'Jismoniy tarbiya': 'T. Alimov',
  "Tasviriy san'at": 'L. Umarova',
  Musiqa: 'F. Sobirova',
};

const PERIOD_TIMES = [
  '08:30 - 09:15',
  '09:25 - 10:10',
  '10:25 - 11:10',
  '11:20 - 12:05',
  '12:15 - 13:00',
];

const HOMEWORK_HINTS: Record<string, string> = {
  Algebra: '214–218-misollarni yechish',
  Geometriya: 'Uchburchaklar tengligi mavzusini takrorlash',
  Matematika: '38-bet, 4–6-masalalarni bajarish',
  Fizika: '14-paragrafni o‘qish va 3 ta masala yechish',
  Kimyo: 'Reaksiya tenglamalarini tenglashtirish',
  Biologiya: 'Hujayra tuzilishi jadvalini chizish',
  'Ona tili': '105-mashqni yozma bajarish',
  Adabiyot: 'She’rni yod olish va tahlil yozish',
  'Ingliz tili': 'Unit 5, Workbook pages 34–35',
  Informatika: 'Algoritm blok-sxemasini tuzish',
  "O'zbekiston tarixi": '12-mavzu savollariga javob tayyorlash',
  'Jahon tarixi': 'Xronologik jadvalni to‘ldirish',
  Geografiya: 'Kontur xaritada asosiy daryolarni belgilash',
  'Tabiiy fan': 'Kuzatish kundaligini to‘ldirish',
  "O'qish savodxonligi": 'Matnni ifodali o‘qish va savollarga javob',
};

const DAYS = [
  { dayKey: 'mon', dayUz: 'Dushanba', dayRu: 'Понедельник', dayEn: 'Monday' },
  { dayKey: 'tue', dayUz: 'Seshanba', dayRu: 'Вторник', dayEn: 'Tuesday' },
  { dayKey: 'wed', dayUz: 'Chorshanba', dayRu: 'Среда', dayEn: 'Wednesday' },
  { dayKey: 'thu', dayUz: 'Payshanba', dayRu: 'Четверг', dayEn: 'Thursday' },
  { dayKey: 'fri', dayUz: 'Juma', dayRu: 'Пятница', dayEn: 'Friday' },
  { dayKey: 'sat', dayUz: 'Shanba', dayRu: 'Суббота', dayEn: 'Saturday' },
];

export function buildWeeklySchedule(gradeStr: string): DaySchedule[] {
  const subjects = getSubjectsForGrade(gradeStr);
  return DAYS.map((day, dayIdx) => {
    const lessonCount = dayIdx === 5 ? 4 : 5;
    const lessons = Array.from({ length: lessonCount }).map((_, pIdx) => {
      const subject = subjects[(dayIdx * 3 + pIdx) % subjects.length];
      return {
        period: pIdx + 1,
        time: PERIOD_TIMES[pIdx],
        subject,
        room: `${201 + ((dayIdx * 4 + pIdx * 3) % 24)}-xona`,
        teacher: TEACHER_MAP[subject] || 'M. O‘qituvchi',
        homework: HOMEWORK_HINTS[subject] || `${subject}: darslikdagi mashqlarni takrorlash`,
      };
    });
    return {
      ...day,
      lessons,
    };
  });
}

export function buildHomeworkForGrade(gradeStr: string): HomeworkItem[] {
  const subjects = getSubjectsForGrade(gradeStr).slice(0, 6);
  const now = new Date();
  return subjects.map((subject, idx) => {
    const due = new Date(now);
    due.setDate(now.getDate() + (idx % 4) + 1);
    return {
      id: `HW-${gradeStr.replace(/\D/g, '') || '0'}-${idx + 1}`,
      subject,
      title: HOMEWORK_HINTS[subject] || `${subject} fanidan 2-bob savollarini bajarish`,
      dueDate: due.toISOString().split('T')[0],
      teacher: TEACHER_MAP[subject] || 'D. Abdullayeva',
      grade: gradeStr,
    };
  });
}
