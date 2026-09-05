'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ConversationList } from '@/components/messaging/conversation-list';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi, type ConversationSummary } from '@/hooks/use-messaging';

export default function MessagesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('messaging');
  const tCommon = useTranslations('common');
  const { user, isLoading: authLoading } = useAuth();
  const api = useMessagingApi();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.listConversations();
        if (!cancelled) setConversations(data.items);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, api]);

  if (authLoading) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">{t('loginRequired')}</div>;
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] min-h-0 w-full max-w-6xl flex-1 overflow-hidden bg-cream sm:h-[calc(100dvh-4rem)] lg:rounded-xl lg:border lg:border-line lg:bg-white lg:shadow-sm">
      <aside className="hidden w-full max-w-sm shrink-0 border-s border-line lg:block lg:w-80">
        <div className="border-b border-line p-4">
          <h1 className="text-xl font-bold text-on-surface">{t('title')}</h1>
        </div>
        <ConversationList conversations={conversations} isLoading={isLoading} />
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {children}
      </main>
    </div>
  );
}
