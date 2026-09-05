import type { AppLocale } from '@/i18n/routing';
import type { AppNotificationType } from '@/lib/notification-ui';
import { NOTIFICATION_UI } from '@/lib/notification-ui';

const NOTIFICATION_LABELS: Record<
  AppLocale,
  Record<AppNotificationType, string>
> = {
  ar: Object.fromEntries(
    Object.entries(NOTIFICATION_UI).map(([type, meta]) => [type, meta.label]),
  ) as Record<AppNotificationType, string>,
  en: {
    NEW_PROPOSAL: 'New proposal',
    PROPOSAL_ACCEPTED: 'Proposal accepted',
    PROPOSAL_REJECTED: 'Proposal rejected',
    NEW_MESSAGE: 'Message',
    PROJECT_COMPLETION_REQUESTED: 'Completion requested',
    PROJECT_COMPLETED: 'Project completed',
    NEW_REVIEW: 'Review',
    ESCROW_FUNDED: 'Escrow funded',
    ESCROW_RELEASED: 'Escrow released',
    ESCROW_DISPUTED: 'Escrow dispute',
    ESCROW_DISPUTE_RESOLVED: 'Dispute resolved',
    ADMIN_BROADCAST: 'Platform notice',
    PROJECT_MATCHED: 'Matching project',
    PROJECT_MATCHED_DIGEST: 'Matching projects',
    PROPOSAL_WITHDRAWN: 'Proposal withdrawn',
    PROJECT_STARTED: 'Project started',
    PROJECT_DEADLINE_APPROACHING: 'Deadline soon',
    PROJECT_DEADLINE_6H: '6 hours left',
    PROJECT_OVERDUE: 'Overdue',
    PAYMENT_SUCCESS: 'Payment success',
    PAYMENT_FAILED: 'Payment failed',
    ESCROW_REFUNDED: 'Escrow refunded',
    POINTS_EARNED: 'Points earned',
    POINTS_SPENT: 'Points spent',
    LOW_POINTS: 'Low points',
    INSUFFICIENT_POINTS: 'Insufficient points',
    PROFILE_COMPLETED: 'Profile completed',
    ACCOUNT_SECURITY_ALERT: 'Security alert',
    SYSTEM_ANNOUNCEMENT: 'Announcement',
    MAINTENANCE: 'Maintenance',
    IMPORTANT_UPDATE: 'Important update',
  },
};

export function getNotificationLabel(type: AppNotificationType, locale: AppLocale) {
  return NOTIFICATION_LABELS[locale][type] ?? NOTIFICATION_UI[type]?.label ?? type;
}

export function formatRelativeTime(iso: string, locale: AppLocale) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const dateLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  if (minutes < 1) return locale === 'ar' ? 'الآن' : 'Now';
  if (minutes < 60) return locale === 'ar' ? `منذ ${minutes} د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === 'ar' ? `منذ ${days} ي` : `${days}d ago`;
  return date.toLocaleDateString(dateLocale);
}
