'use client';

import type { PresenceSnapshot } from '@/lib/presence';

export function PresenceDot({
  presence,
  className = '',
}: {
  presence: PresenceSnapshot | null | undefined;
  className?: string;
}) {
  if (presence?.status !== 'ONLINE') return null;

  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white ${className}`}
      title="متصل الآن"
      aria-label="متصل الآن"
    />
  );
}
