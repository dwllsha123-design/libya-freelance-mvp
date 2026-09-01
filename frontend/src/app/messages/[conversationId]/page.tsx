'use client';

import Link from 'next/link';
import { use } from 'react';
import { ChatPanel } from '@/components/messaging/chat-panel';

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  return (
    <>
      <div className="flex items-center gap-3 border-b p-3 lg:hidden">
        <Link href="/messages" className="text-sm text-[#00A86B]">
          ← الرسائل
        </Link>
      </div>
      <ChatPanel conversationId={conversationId} />
    </>
  );
}
