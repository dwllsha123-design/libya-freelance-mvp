import type { NotificationItem } from '@/lib/notification-ui';

const LOCALE_PREFIX = /^\/(ar|en)(?=\/|$)/;

/** Normalize API targetUrl for next-intl router (locale-less app path). */
export function resolveNotificationHref(
  item: Pick<NotificationItem, 'targetUrl' | 'type'>,
): string {
  const raw = item.targetUrl?.trim();
  if (raw) {
    const path = raw.replace(LOCALE_PREFIX, '') || '/';
    if (path.startsWith('/') && !path.startsWith('//')) {
      return path;
    }
  }

  switch (item.type) {
    case 'NEW_MESSAGE':
      return '/messages';
    case 'NEW_PROPOSAL':
    case 'PROPOSAL_ACCEPTED':
    case 'PROPOSAL_REJECTED':
    case 'PROJECT_COMPLETION_REQUESTED':
    case 'PROJECT_COMPLETED':
      return '/dashboard';
    default:
      return '/notifications';
  }
}
