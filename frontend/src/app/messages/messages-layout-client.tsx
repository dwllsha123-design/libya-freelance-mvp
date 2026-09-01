'use client';

import { useEffect, useState } from 'react';
import { ConversationList } from '@/components/messaging/conversation-list';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi, type ConversationSummary } from '@/hooks/use-messaging';

export default function MessagesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
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
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">يجب تسجيل الدخول</div>;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-xl border bg-white shadow-sm">
      <aside className="hidden w-full max-w-sm shrink-0 border-l lg:block lg:w-80">
        <div className="border-b p-4">
          <h1 className="text-xl font-bold text-[#0B132B]">الرسائل</h1>
        </div>
        <ConversationList conversations={conversations} isLoading={isLoading} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
