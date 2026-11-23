import type { AppSettings } from '../types';

const SETTINGS_KEY = 'maktab_settings_v2';

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      const defaults: AppSettings = { theme: 'light', language: 'uz' };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      language: parsed.language === 'en' || parsed.language === 'ru' ? parsed.language : 'uz',
    };
  } catch {
    return { theme: 'light', language: 'uz' };
  }
}

export function setStoredSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
