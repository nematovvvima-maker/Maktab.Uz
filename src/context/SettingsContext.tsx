import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeMode, Language } from '../types';
import { getStoredSettings, setStoredSettings } from '../utils/localStorage';
import { TRANSLATIONS } from '../data/translations';

export type TranslationKey = keyof typeof TRANSLATIONS['uz'];

interface SettingsContextType {
  theme: ThemeMode;
  language: Language;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState(() => getStoredSettings());

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const setTheme = (theme: ThemeMode) => {
    const next = { ...settings, theme };
    setSettingsState(next);
    setStoredSettings(next);
  };

  const toggleTheme = () => {
    setTheme(settings.theme === 'light' ? 'dark' : 'light');
  };

  const setLanguage = (language: Language) => {
    const next = { ...settings, language };
    setSettingsState(next);
    setStoredSettings(next);
  };

  const t = (key: TranslationKey): string => {
    const dict = TRANSLATIONS[settings.language] || TRANSLATIONS.uz;
    return dict[key] || TRANSLATIONS.uz[key] || key;
  };

  return (
    <SettingsContext.Provider
      value={{
        theme: settings.theme,
        language: settings.language,
        setTheme,
        toggleTheme,
        setLanguage,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
