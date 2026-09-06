'use client';

import {
  formatLastSeenAr,
  presenceLabelAr,
  type PresenceSnapshot,
} from '@/lib/presence';
import { PresenceDot } from './presence-indicator';

export function PresenceText({
  presence,
  typing = false,
  showDot = true,
  className = '',
}: {
  presence: PresenceSnapshot | null | undefined;
  typing?: boolean;
  showDot?: boolean;
  className?: string;
}) {
  const label = presenceLabelAr(presence, { typing });
  if (!label) return null;

  const online = !typing && presence?.status === 'ONLINE';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        online || typing ? 'text-emerald-700' : 'text-on-surface-variant'
      } ${className}`}
    >
      {showDot && online ? <PresenceDot presence={presence} /> : null}
      <span>{label}</span>
    </span>
  );
}

export function PresenceLastSeen({
  lastSeenAt,
  className = '',
}: {
  lastSeenAt?: string | null;
  className?: string;
}) {
  return (
    <span className={`text-xs text-on-surface-variant ${className}`}>
      {formatLastSeenAr(lastSeenAt)}
    </span>
  );
}
