'use client';

import { use } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { ChatPanel } from '@/components/messaging/chat-panel';

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b p-3 lg:hidden">
        <BackLink href="/messages">الرسائل</BackLink>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPanel conversationId={conversationId} />
      </div>
    </>
  );
}
