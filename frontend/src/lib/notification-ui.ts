export type AppNotificationType =
  | 'NEW_PROPOSAL'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'NEW_MESSAGE'
  | 'PROJECT_COMPLETION_REQUESTED'
  | 'PROJECT_COMPLETED'
  | 'NEW_REVIEW'
  | 'ESCROW_FUNDED'
  | 'ESCROW_RELEASED'
  | 'ESCROW_DISPUTED'
  | 'ESCROW_DISPUTE_RESOLVED'
  | 'ADMIN_BROADCAST';

export interface NotificationItem {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_UI: Record<
  AppNotificationType,
  { icon: string; label: string; accent: string }
> = {
  NEW_PROPOSAL: {
    icon: '💼',
    label: 'عرض جديد',
    accent: 'bg-blue-50 text-blue-700',
  },
  PROPOSAL_ACCEPTED: {
    icon: '✅',
    label: 'عرض مقبول',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  PROPOSAL_REJECTED: {
    icon: '✖️',
    label: 'عرض مرفوض',
    accent: 'bg-slate-100 text-slate-600',
  },
  NEW_MESSAGE: {
    icon: '💬',
    label: 'رسالة',
    accent: 'bg-indigo-50 text-indigo-700',
  },
  PROJECT_COMPLETION_REQUESTED: {
    icon: '📋',
    label: 'طلب إتمام',
    accent: 'bg-amber-50 text-amber-800',
  },
  PROJECT_COMPLETED: {
    icon: '☑️',
    label: 'مشروع مكتمل',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  NEW_REVIEW: {
    icon: '⭐',
    label: 'تقييم',
    accent: 'bg-yellow-50 text-yellow-800',
  },
  ESCROW_FUNDED: {
    icon: '🔒',
    label: 'ضمان مموّل',
    accent: 'bg-blue-50 text-blue-700',
  },
  ESCROW_RELEASED: {
    icon: '💰',
    label: 'تحرير ضمان',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  ESCROW_DISPUTED: {
    icon: '⚠️',
    label: 'نزاع ضمان',
    accent: 'bg-red-50 text-red-700',
  },
  ESCROW_DISPUTE_RESOLVED: {
    icon: '✔️',
    label: 'حل نزاع',
    accent: 'bg-slate-100 text-slate-700',
  },
  ADMIN_BROADCAST: {
    icon: '📢',
    label: 'إشعار المنصة',
    accent: 'bg-teal-50 text-teal-800',
  },
};

export function formatUnreadBadge(count: number) {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

export function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} ي`;
  return date.toLocaleDateString('ar-LY');
}

// Re-export for type guard usage in components
export const NOTIFICATION_TYPE_VALUES = Object.keys(
  NOTIFICATION_UI,
) as AppNotificationType[];
