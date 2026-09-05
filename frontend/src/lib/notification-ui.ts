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
  | 'ADMIN_BROADCAST'
  | 'PROJECT_MATCHED'
  | 'PROJECT_MATCHED_DIGEST'
  | 'PROPOSAL_WITHDRAWN'
  | 'PROJECT_STARTED'
  | 'PROJECT_DEADLINE_APPROACHING'
  | 'PROJECT_DEADLINE_6H'
  | 'PROJECT_OVERDUE'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ESCROW_REFUNDED'
  | 'POINTS_EARNED'
  | 'POINTS_SPENT'
  | 'LOW_POINTS'
  | 'INSUFFICIENT_POINTS'
  | 'PROFILE_COMPLETED'
  | 'ACCOUNT_SECURITY_ALERT'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'MAINTENANCE'
  | 'IMPORTANT_UPDATE';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NotificationCategory =
  | 'all'
  | 'PROJECTS'
  | 'MESSAGES'
  | 'PAYMENTS'
  | 'POINTS'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
  priority?: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
}

export const NOTIFICATION_UI: Record<
  AppNotificationType,
  { icon: string; label: string; accent: string; category: NotificationCategory }
> = {
  NEW_PROPOSAL: {
    icon: '💼',
    label: 'عرض جديد',
    accent: 'bg-blue-50 text-blue-700',
    category: 'PROJECTS',
  },
  PROPOSAL_ACCEPTED: {
    icon: '✅',
    label: 'عرض مقبول',
    accent: 'bg-emerald-50 text-emerald-700',
    category: 'PROJECTS',
  },
  PROPOSAL_REJECTED: {
    icon: '✖️',
    label: 'عرض مرفوض',
    accent: 'bg-slate-100 text-slate-600',
    category: 'PROJECTS',
  },
  NEW_MESSAGE: {
    icon: '💬',
    label: 'رسالة',
    accent: 'bg-indigo-50 text-indigo-700',
    category: 'MESSAGES',
  },
  PROJECT_COMPLETION_REQUESTED: {
    icon: '📋',
    label: 'طلب إتمام',
    accent: 'bg-amber-50 text-amber-800',
    category: 'PROJECTS',
  },
  PROJECT_COMPLETED: {
    icon: '☑️',
    label: 'مشروع مكتمل',
    accent: 'bg-emerald-50 text-emerald-700',
    category: 'PROJECTS',
  },
  NEW_REVIEW: {
    icon: '⭐',
    label: 'تقييم',
    accent: 'bg-yellow-50 text-yellow-800',
    category: 'PROJECTS',
  },
  ESCROW_FUNDED: {
    icon: '🔒',
    label: 'ضمان مموّل',
    accent: 'bg-blue-50 text-blue-700',
    category: 'PAYMENTS',
  },
  ESCROW_RELEASED: {
    icon: '💰',
    label: 'تحرير ضمان',
    accent: 'bg-emerald-50 text-emerald-700',
    category: 'PAYMENTS',
  },
  ESCROW_DISPUTED: {
    icon: '⚠️',
    label: 'نزاع ضمان',
    accent: 'bg-red-50 text-red-700',
    category: 'PAYMENTS',
  },
  ESCROW_DISPUTE_RESOLVED: {
    icon: '✔️',
    label: 'حل نزاع',
    accent: 'bg-slate-100 text-slate-700',
    category: 'PAYMENTS',
  },
  ADMIN_BROADCAST: {
    icon: '📢',
    label: 'إشعار المنصة',
    accent: 'bg-teal-50 text-teal-800',
    category: 'SYSTEM',
  },
  PROJECT_MATCHED: {
    icon: '🎯',
    label: 'مشروع مناسب',
    accent: 'bg-emerald-50 text-emerald-700',
    category: 'PROJECTS',
  },
  PROJECT_MATCHED_DIGEST: {
    icon: '🎯',
    label: 'مشاريع مناسبة',
    accent: 'bg-emerald-50 text-emerald-700',
    category: 'PROJECTS',
  },
  PROPOSAL_WITHDRAWN: {
    icon: '↩️',
    label: 'انسحاب عرض',
    accent: 'bg-slate-100 text-slate-600',
    category: 'PROJECTS',
  },
  PROJECT_STARTED: {
    icon: '🚀',
    label: 'بدء المشروع',
    accent: 'bg-blue-50 text-blue-700',
    category: 'PROJECTS',
  },
  PROJECT_DEADLINE_APPROACHING: {
    icon: '⏰',
    label: 'قرب الموعد',
    accent: 'bg-amber-50 text-amber-800',
    category: 'PROJECTS',
  },
  PROJECT_DEADLINE_6H: {
    icon: '⏰',
    label: '6 ساعات متبقية',
    accent: 'bg-amber-50 text-amber-800',
    category: 'PROJECTS',
  },
  PROJECT_OVERDUE: {
    icon: '⚠️',
    label: 'تجاوز الموعد',
    accent: 'bg-red-50 text-red-700',
    category: 'PROJECTS',
  },
  PAYMENT_SUCCESS: {
    icon: '💰',
    label: 'دفع ناجح',
    accent: 'bg-emerald-50 text-emerald-700',
    category: 'PAYMENTS',
  },
  PAYMENT_FAILED: {
    icon: '⚠️',
    label: 'فشل الدفع',
    accent: 'bg-red-50 text-red-700',
    category: 'PAYMENTS',
  },
  ESCROW_REFUNDED: {
    icon: '↩️',
    label: 'استرداد ضمان',
    accent: 'bg-slate-100 text-slate-700',
    category: 'PAYMENTS',
  },
  POINTS_EARNED: {
    icon: '🏆',
    label: 'نقاط مكتسبة',
    accent: 'bg-yellow-50 text-yellow-800',
    category: 'POINTS',
  },
  POINTS_SPENT: {
    icon: '💳',
    label: 'نقاط مخصومة',
    accent: 'bg-slate-100 text-slate-700',
    category: 'POINTS',
  },
  LOW_POINTS: {
    icon: '⚠️',
    label: 'نقاط منخفضة',
    accent: 'bg-amber-50 text-amber-800',
    category: 'POINTS',
  },
  INSUFFICIENT_POINTS: {
    icon: '🚫',
    label: 'نقاط غير كافية',
    accent: 'bg-red-50 text-red-700',
    category: 'POINTS',
  },
  PROFILE_COMPLETED: {
    icon: '✨',
    label: 'ملف مكتمل',
    accent: 'bg-teal-50 text-teal-800',
    category: 'SYSTEM',
  },
  ACCOUNT_SECURITY_ALERT: {
    icon: '🛡️',
    label: 'تنبيه أمني',
    accent: 'bg-red-50 text-red-700',
    category: 'SYSTEM',
  },
  SYSTEM_ANNOUNCEMENT: {
    icon: '📢',
    label: 'إعلان',
    accent: 'bg-teal-50 text-teal-800',
    category: 'SYSTEM',
  },
  MAINTENANCE: {
    icon: '🛠️',
    label: 'صيانة',
    accent: 'bg-amber-50 text-amber-800',
    category: 'SYSTEM',
  },
  IMPORTANT_UPDATE: {
    icon: '📣',
    label: 'تحديث مهم',
    accent: 'bg-blue-50 text-blue-700',
    category: 'SYSTEM',
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

export const NOTIFICATION_TYPE_VALUES = Object.keys(
  NOTIFICATION_UI,
) as AppNotificationType[];
