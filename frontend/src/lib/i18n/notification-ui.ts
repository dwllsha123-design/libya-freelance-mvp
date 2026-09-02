import type { AppLocale } from '@/i18n/routing';
import type { AppNotificationType } from '@/lib/notification-ui';

const NOTIFICATION_LABELS: Record<AppLocale, Record<AppNotificationType, string>> = {
  ar: {
    NEW_PROPOSAL: 'عرض جديد',
    PROPOSAL_ACCEPTED: 'عرض مقبول',
    PROPOSAL_REJECTED: 'عرض مرفوض',
    NEW_MESSAGE: 'رسالة',
    PROJECT_COMPLETION_REQUESTED: 'طلب إتمام',
    PROJECT_COMPLETED: 'مشروع مكتمل',
    NEW_REVIEW: 'تقييم',
    ESCROW_FUNDED: 'ضمان مموّل',
    ESCROW_RELEASED: 'تحرير ضمان',
    ESCROW_DISPUTED: 'نزاع ضمان',
    ESCROW_DISPUTE_RESOLVED: 'حل نزاع',
  },
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
  },
};

export function getNotificationLabel(type: AppNotificationType, locale: AppLocale) {
  return NOTIFICATION_LABELS[locale][type];
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
