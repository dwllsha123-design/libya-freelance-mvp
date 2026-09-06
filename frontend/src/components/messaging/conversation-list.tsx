'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import type { ConversationSummary } from '@/hooks/use-messaging';
import { previewMessageContent } from '@/lib/message-attachment';
import type { AppLocale } from '@/i18n/routing';
import { PresenceDot } from '@/components/presence/presence-indicator';
import { PresenceText } from '@/components/presence/presence-text';
import { usePresenceSubscription } from '@/hooks/use-presence';

export function ConversationList({
  conversations,
  isLoading,
}: {
  conversations: ConversationSummary[];
  isLoading: boolean;
}) {
  const t = useTranslations('messaging');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const dateLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const otherIds = conversations
    .map((c) => c.otherParticipant?.id)
    .filter((id): id is string => !!id);
  const presenceMap = usePresenceSubscription(otherIds);

  if (isLoading) {
    return <p className="p-4 text-sm text-slate-500">{tCommon('loadingPage')}</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">{t('noConversations')}</p>
    );
  }

  return (
    <ul className="divide-y">
      {conversations.map((c) => {
        const href = `/messages/${c.conversationId}`;
        const active = pathname === href;
        const otherId = c.otherParticipant?.id;
        const presence = otherId ? presenceMap[otherId] : null;

        return (
          <li key={c.conversationId}>
            <Link
              href={href}
              className={`block p-4 transition hover:bg-slate-50 ${
                active ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold text-on-surface">
                    <PresenceDot presence={presence} />
                    <span className="truncate">
                      {c.otherParticipant?.name ?? t('unknownUser')}
                    </span>
                  </p>
                  <PresenceText
                    presence={presence}
                    showDot={false}
                    className="mt-0.5"
                  />
                  <p className="truncate text-xs text-slate-500">
                    {c.project?.title}
                  </p>
                  {c.lastMessage ? (
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {previewMessageContent(c.lastMessage.content, t('attachFile'))}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-xs text-slate-400">
                    {new Date(c.lastMessageAt).toLocaleDateString(dateLocale)}
                  </p>
                  {c.unreadCount > 0 ? (
                    <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-white">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
