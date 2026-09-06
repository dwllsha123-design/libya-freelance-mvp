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
    return <div className="page-gutter py-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return <div className="page-gutter py-8 text-center">{t('loginRequired')}</div>;
  }

  return (
    <div className="page-gutter flex w-full min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)] lg:py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 overflow-hidden bg-cream lg:rounded-xl lg:border lg:border-line lg:bg-white lg:shadow-sm">
        <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))] min-h-0 w-full sm:h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] lg:h-[min(720px,calc(100dvh-6rem))]">
          <aside className="hidden min-h-0 w-full max-w-sm shrink-0 border-s border-line lg:flex lg:w-72 lg:max-w-none lg:flex-col xl:w-80">
            <div className="shrink-0 border-b border-line p-4">
              <h1 className="text-xl font-bold text-on-surface">{t('title')}</h1>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConversationList conversations={conversations} isLoading={isLoading} />
            </div>
          </aside>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
