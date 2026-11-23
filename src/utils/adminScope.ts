import { ALL_GRADES } from '../data/initialData';
import type { AdminAccount } from '../types';

export function isSuperAdmin(user: AdminAccount | null): boolean {
  return user?.role === 'Super Admin';
}

export function getAllowedGrades(user: AdminAccount | null): string[] {
  if (!user) return [];
  if (user.role === 'Super Admin') return ALL_GRADES;
  return Array.isArray(user.assignedGrades) ? user.assignedGrades : [];
}
