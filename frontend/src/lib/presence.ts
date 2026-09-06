export type PresenceStatus = 'ONLINE' | 'RECENTLY_ACTIVE' | 'OFFLINE';

export interface PresenceSnapshot {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
}

export function formatLastSeenAr(
  lastSeenAt: string | null | undefined,
  now = Date.now(),
): string {
  if (!lastSeenAt) return 'غير متصل';
  const then = new Date(lastSeenAt).getTime();
  if (Number.isNaN(then)) return 'غير متصل';

  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'آخر ظهور الآن';
  if (minutes < 60) return `آخر ظهور منذ ${minutes} دقائق`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? 'آخر ظهور منذ ساعة' : `آخر ظهور منذ ${hours} ساعات`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return 'آخر ظهور أمس';
  if (days < 7) return `آخر ظهور منذ ${days} أيام`;
  return 'آخر ظهور منذ أكثر من أسبوع';
}

export function presenceLabelAr(
  presence: PresenceSnapshot | null | undefined,
  opts?: { typing?: boolean },
): string {
  if (opts?.typing) return 'يكتب الآن...';
  if (!presence) return '';
  if (presence.status === 'ONLINE') return 'متصل الآن';
  if (presence.status === 'RECENTLY_ACTIVE') return 'نشط مؤخرًا';
  return formatLastSeenAr(presence.lastSeenAt);
}
