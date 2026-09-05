'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  useMessagingApi,
  type ConversationSummary,
  type MessageItem,
} from '@/hooks/use-messaging';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import { ApiError } from '@/lib/api';
import {
  parseChatAttachment,
} from '@/lib/message-attachment';
import type { AppLocale } from '@/i18n/routing';

function PaperclipIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.44 11.05l-8.49 8.49a5.25 5.25 0 01-7.42-7.42l8.48-8.49a3.5 3.5 0 014.95 4.95l-8.48 8.49a1.75 1.75 0 01-2.48-2.47l7.78-7.78"
      />
    </svg>
  );
}

export function ChatPanel({ conversationId }: { conversationId: string }) {
  const t = useTranslations('messaging');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user, accessToken } = useAuth();
  const api = useMessagingApi();
  const [conversation, setConversation] = useState<ConversationSummary | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const numberLocale = timeLocale;

  const { joinConversation, sendMessage: sendSocket } = useMessagingSocket(
    accessToken,
    (message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        );
      }
    },
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [conv, msgs] = await Promise.all([
          api.getConversation(conversationId),
          api.listMessages(conversationId),
        ]);
        if (!cancelled) {
          setConversation(conv);
          setMessages(msgs.items);
          await api.markRead(conversationId);
        }
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, conversationId, t]);

  useEffect(() => {
    joinConversation(conversationId);
  }, [conversationId, joinConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function pushOutgoing(content: string) {
    try {
      const message = await sendSocket(conversationId, content);
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    } catch (err) {
      try {
        const message = await api.sendMessage(conversationId, content);
        setMessages((prev) => [...prev, message]);
      } catch (fallbackErr) {
        throw fallbackErr instanceof ApiError
          ? fallbackErr
          : err instanceof Error
            ? err
            : new Error(t('sendFailed'));
      }
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !conversation?.canSend) return;

    setIsSending(true);
    setError(null);

    try {
      await pushOutgoing(draft.trim());
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sendFailed'));
    } finally {
      setIsSending(false);
    }
  }

  async function handleFilePicked(list: FileList | null) {
    const file = list?.[0];
    if (!file || !conversation?.canSend) return;

    setIsSending(true);
    setError(null);

    try {
      const message = await api.sendAttachment(conversationId, file);
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('attachFailed'));
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        {tCommon('loadingPage')}
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line bg-white px-3 py-3 sm:px-4">
        <h2 className="break-words font-bold text-on-surface [overflow-wrap:anywhere]">
          {conversation?.otherParticipant?.name}
        </h2>
        <p className="mt-0.5 line-clamp-2 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
          {conversation?.project?.title}
        </p>
        {conversation?.proposal ? (
          <div className="mt-2 rounded-xl border border-line bg-cream-deep/50 px-3 py-2 text-xs text-ink">
            <p className="font-semibold text-ember">{t('agreementTitle')}</p>
            <p className="mt-1 text-ink-soft">
              {t('proposalLabel', {
                price: conversation.proposal.proposedPrice.toLocaleString(
                  numberLocale,
                ),
                status: conversation.proposal.status,
              })}
              {conversation.proposal.estimatedDurationDays
                ? ` · ${t('agreementDays', {
                    count: conversation.proposal.estimatedDurationDays,
                  })}`
                : null}
            </p>
            <p className="mt-1 text-ink-soft">{t('agreementEscrowHint')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/dashboard/escrow"
                className="rounded-full bg-ember px-3 py-1 text-[11px] font-semibold text-white"
              >
                {t('agreementEscrowCta')}
              </Link>
              <Link
                href="/escrow"
                className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold text-ink"
              >
                {t('agreementHowCta')}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-low p-3 sm:p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">{t('noMessages')}</p>
        ) : null}
        <div className="space-y-3">
          {messages.map((m) => {
            const isMine = m.senderId === user?.id;
            const attachment = parseChatAttachment(m.content);
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[min(92%,24rem)] rounded-2xl px-3 py-2 text-sm sm:max-w-[80%] sm:px-4 ${
                    isMine
                      ? 'bg-on-surface text-white'
                      : 'border border-line bg-white text-slate-800'
                  }`}
                >
                  {attachment ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex max-w-full items-center gap-2 break-all underline-offset-2 hover:underline ${
                        isMine ? 'text-white' : 'text-ember'
                      }`}
                    >
                      <span aria-hidden>📎</span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {attachment.name}
                      </span>
                    </a>
                  ) : (
                    <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {m.content}
                    </span>
                  )}
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString(timeLocale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {conversation?.canSend ? (
        <form
          onSubmit={(e) => void handleSend(e)}
          className="shrink-0 border-t border-line bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
        >
          {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip"
            onChange={(e) => void handleFilePicked(e.target.files)}
          />
          <div className="flex items-end gap-2">
            <button
              type="button"
              disabled={isSending}
              onClick={() => fileInputRef.current?.click()}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-cream text-ink transition hover:bg-cream-deep disabled:opacity-50"
              aria-label={t('attachFile')}
              title={t('attachFile')}
            >
              <PaperclipIcon className="h-5 w-5" />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('typeMessage')}
              className="min-w-0 flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-ember focus:ring-1 focus:ring-ember"
              maxLength={5000}
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className="shrink-0 rounded-full bg-ember px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t('send')}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-soft">{t('attachHint')}</p>
        </form>
      ) : (
        <p className="shrink-0 border-t border-line bg-amber-50 p-4 text-center text-sm text-amber-800">
          {t('readOnly')}
        </p>
      )}
    </div>
  );
}
