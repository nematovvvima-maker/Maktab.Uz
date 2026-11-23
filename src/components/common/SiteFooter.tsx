import React from 'react';
import { Send, ArrowUpRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { MaktabLogo } from './MaktabLogo';

const TELEGRAM_BOT_URL = 'https://t.me/MaktabUz1_bot';
const TELEGRAM_BOT_HANDLE = '@MaktabUz1_bot';

const FOOTER_COPY = {
  uz: {
    tagline: "Umumta'lim maktablari uchun elektron kundalik, baholar va davomat tizimi.",
    botCta: 'Telegram botni ochish',
    botSub: 'Ota-onalar va o‘quvchilar uchun rasmiy bot',
    rights: '© 2026 Maktab.Uz · Barcha huquqlar himoyalangan',
  },
  ru: {
    tagline: 'Электронный дневник, журнал оценок и учёт посещаемости для школ.',
    botCta: 'Открыть Telegram-бот',
    botSub: 'Официальный бот для родителей и учеников',
    rights: '© 2026 Maktab.Uz · Все права защищены',
  },
  en: {
    tagline: 'Digital school diary, gradebook, and attendance platform.',
    botCta: 'Open Telegram Bot',
    botSub: 'Official bot for parents and students',
    rights: '© 2026 Maktab.Uz · All rights reserved',
  },
};

interface SiteFooterProps {
  /** Adds bottom clearance on small screens when a fixed mobile bottom nav bar is present */
  withMobileNavOffset?: boolean;
  /** Optional quiet contextual metadata (e.g., student ID/login) */
  metaText?: string;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  withMobileNavOffset = false,
  metaText,
}) => {
  const { language } = useSettings();
  const T = FOOTER_COPY[language] || FOOTER_COPY.uz;

  return (
    <footer
      className={`w-full bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 ${
        withMobileNavOffset ? 'pb-16 lg:pb-0' : ''
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-md">
            <MaktabLogo compact />
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {T.tagline}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>
                {T.botCta} ({TELEGRAM_BOT_HANDLE})
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            </a>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 sm:text-right">
              {T.botSub}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{T.rights}</span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {metaText && <span className="font-mono tabular-nums">{metaText}</span>}
            {metaText && <span aria-hidden="true">·</span>}
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#1D4ED8] dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              t.me/MaktabUz1_bot
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
