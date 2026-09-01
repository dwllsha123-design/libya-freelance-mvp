'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ConversationList } from '@/components/messaging/conversation-list';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi, type ConversationSummary } from '@/hooks/use-messaging';

export default function MessagesIndexPage() {
  const { user } = useAuth();
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

  return (
    <>
      <div className="border-b p-4 lg:hidden">
        <h1 className="text-xl font-bold text-on-surface">الرسائل</h1>
      </div>
      <div className="lg:hidden">
        <ConversationList conversations={conversations} isLoading={isLoading} />
      </div>
      <div className="hidden flex-1 items-center justify-center text-slate-500 lg:flex">
        <p>اختر محادثة من القائمة</p>
      </div>
      {!isLoading && conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 lg:hidden">
          <p className="text-slate-500">لا توجد محادثات بعد</p>
          <Link href="/projects" className="text-primary">
            تصفح المشاريع
          </Link>
        </div>
      ) : null}
    </>
  );
}
