'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ConversationSummary } from '@/hooks/use-messaging';

export function ConversationList({
  conversations,
  isLoading,
}: {
  conversations: ConversationSummary[];
  isLoading: boolean;
}) {
  const pathname = usePathname();

  if (isLoading) {
    return <p className="p-4 text-sm text-slate-500">جاري التحميل...</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">لا توجد محادثات بعد</p>
    );
  }

  return (
    <ul className="divide-y">
      {conversations.map((c) => {
        const href = `/messages/${c.conversationId}`;
        const active = pathname === href;

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
                  <p className="truncate font-semibold text-[#0B132B]">
                    {c.otherParticipant?.name ?? 'مستخدم'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {c.project?.title}
                  </p>
                  {c.lastMessage ? (
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {c.lastMessage.content}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-xs text-slate-400">
                    {new Date(c.lastMessageAt).toLocaleDateString('ar-LY')}
                  </p>
                  {c.unreadCount > 0 ? (
                    <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00A86B] px-1 text-xs text-white">
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
