import React, { useEffect, useMemo, useState } from 'react';
import { Send, ShieldCheck, User, Hash } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { ALL_GRADES } from '../data/initialData';
import { getAllowedGrades, isSuperAdmin } from '../utils/adminScope';
import { TableSkeleton } from '../components/common/Skeleton';
import type { ChatMessage } from '../types';

const COPY = {
  uz: {
    title: 'Chatlar va E’lonlar',
    subtitle: 'O‘qituvchilar, administratorlar va sinfdoshlar bilan muloqot',
    allChannels: 'Barcha kanallar',
    schoolChannel: 'Maktab e’lonlari',
    placeholder: 'Xabar matnini kiriting...',
    send: 'Yuborish',
    channelLabel: 'Kanal:',
    empty: 'Ushbu kanalda hozircha xabarlar mavjud emas.',
    sentToast: 'Xabar yuborildi',
  },
  ru: {
    title: 'Чаты и объявления',
    subtitle: 'Общение с учителями, администрацией и одноклассниками',
    allChannels: 'Все каналы',
    schoolChannel: 'Maktab e’lonlari',
    placeholder: 'Введите сообщение...',
    send: 'Отправить',
    channelLabel: 'Канал:',
    empty: 'В этом канале пока нет сообщений.',
    sentToast: 'Сообщение отправлено',
  },
  en: {
    title: 'Chats & Announcements',
    subtitle: 'Direct communication between school staff and students',
    allChannels: 'All channels',
    schoolChannel: 'Maktab e’lonlari',
    placeholder: 'Type your message...',
    send: 'Send',
    channelLabel: 'Channel:',
    empty: 'No messages in this channel yet.',
    sentToast: 'Message sent',
  },
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('uz-UZ', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ChatsPage: React.FC = () => {
  const { accountType, student, user } = useAuth();
  const { language } = useSettings();
  const { showToast } = useToast();

  const adminChannels = useMemo(() => {
    if (accountType !== 'admin') return [];
    return isSuperAdmin(user) ? ['Maktab e’lonlari', ...ALL_GRADES] : getAllowedGrades(user);
  }, [accountType, user]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>('all');
  const [targetChannel, setTargetChannel] = useState<string>(
    accountType === 'student'
      ? student?.grade || '9-sinf'
      : adminChannels[0] || 'Maktab e’lonlari'
  );
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (accountType === 'admin' && adminChannels.length > 0 && !adminChannels.includes(targetChannel)) {
      setTargetChannel(adminChannels[0]);
    }
  }, [accountType, adminChannels, targetChannel]);

  const T = COPY[language] || COPY.uz;

  useEffect(() => {
    let active = true;
    api
      .getChats()
      .then((res) => {
        if (active) setMessages(res.messages);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const channels = useMemo(() => {
    const set = new Set<string>();
    if (accountType === 'student' || isSuperAdmin(user)) {
      set.add('Maktab e’lonlari');
    }
    if (student?.grade) set.add(student.grade);
    adminChannels.forEach((ch) => set.add(ch));
    messages.forEach((m) => set.add(m.channel));
    return Array.from(set);
  }, [messages, student?.grade, accountType, user, adminChannels]);

  const visibleMessages = useMemo(() => {
    if (activeChannel === 'all') return messages;
    return messages.filter((m) => m.channel === activeChannel);
  }, [messages, activeChannel]);

  const currentLogin = accountType === 'student' ? student?.login : user?.login;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const sendTo =
        accountType === 'student'
          ? student?.grade || '9-sinf'
          : targetChannel;
      const res = await api.sendChatMessage(trimmed, sendTo);
      setMessages((prev) => [...prev, res.message]);
      setText('');
      showToast(T.sentToast, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-[#2563EB]" />
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {T.title}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{T.subtitle}</p>
      </div>

      {/* 2-Column Split: Channels Sidebar + Message Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Channels Sidebar */}
        <aside className="lg:col-span-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
          <button
            type="button"
            onClick={() => setActiveChannel('all')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
              activeChannel === 'all'
                ? 'bg-[#2563EB] text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
            }`}
          >
            <span>{T.allChannels}</span>
            <span className="font-mono tabular-nums opacity-80">{messages.length}</span>
          </button>

          {channels.map((ch) => {
            const count = messages.filter((m) => m.channel === ch).length;
            const isActive = activeChannel === ch;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => {
                  setActiveChannel(ch);
                  if (accountType === 'admin') setTargetChannel(ch);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{ch}</span>
                </span>
                <span className="font-mono tabular-nums opacity-80">{count}</span>
              </button>
            );
          })}
        </aside>

        {/* Messages Panel */}
        <section className="lg:col-span-9 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-[460px]">
          <div className="flex-1 p-5 space-y-3.5 max-h-[520px] overflow-y-auto">
            {visibleMessages.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-16">
                {T.empty}
              </p>
            ) : (
              visibleMessages.map((msg) => {
                const isMine = msg.senderLogin === currentLogin;
                const isAdmin = msg.senderRole === 'Administrator';
                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border ${
                      isMine
                        ? 'bg-[#EFF6FF] dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : 'bg-[#F8FAFC] dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${
                            isAdmin
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                          }`}
                        >
                          {isAdmin ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {msg.senderName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          ({msg.senderRole})
                        </span>
                        <span className="text-[11px] font-semibold text-[#1D4ED8] dark:text-blue-400">
                          #{msg.channel}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed pl-8">
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            {accountType === 'admin' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <label
                  htmlFor="chat-channel"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {T.channelLabel}
                </label>
                <select
                  id="chat-channel"
                  value={targetChannel}
                  onChange={(e) => setTargetChannel(e.target.value)}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                >
                  {adminChannels.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={T.placeholder}
              className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
            />

            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{T.send}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
