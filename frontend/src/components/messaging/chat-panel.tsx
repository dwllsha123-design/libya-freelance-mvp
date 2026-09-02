'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  useMessagingApi,
  type ConversationSummary,
  type MessageItem,
} from '@/hooks/use-messaging';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import { ApiError } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

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
  const timeLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !conversation?.canSend) return;

    setIsSending(true);
    setError(null);

    try {
      const message = await sendSocket(conversationId, draft.trim());
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      setDraft('');
    } catch (err) {
      try {
        const message = await api.sendMessage(conversationId, draft.trim());
        setMessages((prev) => [...prev, message]);
        setDraft('');
      } catch (fallbackErr) {
        setError(
          fallbackErr instanceof ApiError
            ? fallbackErr.message
            : err instanceof Error
              ? err.message
              : t('sendFailed'),
        );
      }
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center p-8">{tCommon('loadingPage')}</div>;
  }

  if (error && !conversation) {
    return <div className="flex flex-1 items-center justify-center p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-white p-4">
        <h2 className="font-bold text-on-surface">
          {conversation?.otherParticipant?.name}
        </h2>
        <p className="text-sm text-slate-500">{conversation?.project?.title}</p>
        {conversation?.proposal ? (
          <p className="mt-1 text-xs text-primary">
            {t('proposalLabel', {
              price: conversation.proposal.proposedPrice,
              status: conversation.proposal.status,
            })}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-low p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">{t('noMessages')}</p>
        ) : null}
        <div className="space-y-3">
          {messages.map((m) => {
            const isMine = m.senderId === user?.id;
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                    isMine
                      ? 'bg-on-surface text-white'
                      : 'border bg-white text-slate-800'
                  }`}
                >
                  {m.content}
                  <p className={`mt-1 text-[10px] ${isMine ? 'text-slate-300' : 'text-slate-400'}`}>
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
        <form onSubmit={(e) => void handleSend(e)} className="shrink-0 border-t bg-white p-4">
          {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('typeMessage')}
              className="flex-1 rounded-lg border px-4 py-2 text-sm"
              maxLength={5000}
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t('send')}
            </button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-t bg-amber-50 p-4 text-center text-sm text-amber-800">
          {t('readOnly')}
        </p>
      )}
    </div>
  );
}
