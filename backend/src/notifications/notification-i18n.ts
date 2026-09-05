import { NotificationType } from '@prisma/client';

export type NotificationLocale = 'ar' | 'en';

type Template = {
  title: string;
  message: string;
  cta?: string;
};

type TemplateCatalog = Record<NotificationType, Template>;

const AR: TemplateCatalog = {
  [NotificationType.NEW_PROPOSAL]: {
    title: 'عرض جديد على مشروعك',
    message: 'تلقيت عرضاً جديداً على مشروع "{projectTitle}"',
    cta: 'عرض المستقل',
  },
  [NotificationType.PROPOSAL_ACCEPTED]: {
    title: 'تم قبول عرضك',
    message: 'تم قبول عرضك على مشروع "{projectTitle}".',
    cta: 'فتح المشروع',
  },
  [NotificationType.PROPOSAL_REJECTED]: {
    title: 'لم يتم قبول عرضك',
    message: 'تم اختيار مستقل آخر لمشروع "{projectTitle}".',
  },
  [NotificationType.NEW_MESSAGE]: {
    title: 'رسالة جديدة من {senderName}',
    message: '{preview}',
    cta: 'فتح المحادثة',
  },
  [NotificationType.PROJECT_COMPLETION_REQUESTED]: {
    title: 'تم تسليم المشروع',
    message: 'أرسل المستقل طلب إتمام لمشروع "{projectTitle}".',
    cta: 'مراجعة التسليم',
  },
  [NotificationType.PROJECT_COMPLETED]: {
    title: 'تم إكمال المشروع بنجاح',
    message: 'تم تأكيد إتمام مشروع "{projectTitle}".',
  },
  [NotificationType.NEW_REVIEW]: {
    title: 'حصلت على تقييم جديد',
    message: 'تم تقييمك في مشروع "{projectTitle}".',
  },
  [NotificationType.ESCROW_FUNDED]: {
    title: 'تم تأمين مبلغ المشروع في الضمان',
    message: 'تم تمويل مبلغ الضمان لمشروع "{projectTitle}".',
  },
  [NotificationType.ESCROW_RELEASED]: {
    title: 'تم تحرير الدفعة',
    message: 'تم تحرير مبلغ الضمان لمشروع "{projectTitle}".',
  },
  [NotificationType.ESCROW_DISPUTED]: {
    title: 'نزاع على الضمان',
    message: 'تم فتح نزاع على مشروع "{projectTitle}".',
  },
  [NotificationType.ESCROW_DISPUTE_RESOLVED]: {
    title: 'تم حل النزاع',
    message: '{resolution}',
  },
  [NotificationType.ADMIN_BROADCAST]: {
    title: '{title}',
    message: '{message}',
  },
  [NotificationType.PROJECT_MATCHED]: {
    title: 'مشروع جديد يناسب مهاراتك',
    message:
      'عميل يبحث عن {categoryName} بميزانية {budgetLabel}.',
    cta: 'عرض المشروع',
  },
  [NotificationType.PROJECT_MATCHED_DIGEST]: {
    title: '{count} مشاريع جديدة تناسب مهاراتك',
    message: 'لديك عدة مشاريع جديدة مطابقة لمهاراتك.',
    cta: 'عرض المشاريع',
  },
  [NotificationType.PROPOSAL_WITHDRAWN]: {
    title: 'انسحاب عرض',
    message: 'انسحب مستقل من عرض على مشروع "{projectTitle}".',
  },
  [NotificationType.PROJECT_STARTED]: {
    title: 'بدأ العمل على المشروع',
    message: 'بدأ المستقل العمل على مشروع "{projectTitle}".',
  },
  [NotificationType.PROJECT_DEADLINE_APPROACHING]: {
    title: 'بقي يوم واحد على موعد التسليم',
    message: 'الموعد النهائي لمشروع "{projectTitle}" خلال 24 ساعة.',
  },
  [NotificationType.PROJECT_DEADLINE_6H]: {
    title: 'بقي 6 ساعات على موعد التسليم',
    message: 'الموعد النهائي لمشروع "{projectTitle}" خلال 6 ساعات.',
  },
  [NotificationType.PROJECT_OVERDUE]: {
    title: 'تجاوز المشروع موعد التسليم',
    message: 'تجاوز مشروع "{projectTitle}" الموعد النهائي.',
  },
  [NotificationType.PAYMENT_SUCCESS]: {
    title: 'تم استلام الدفع بنجاح',
    message: 'تمت عملية الدفع بمبلغ {amount} د.ل بنجاح.',
    cta: 'عرض المدفوعات',
  },
  [NotificationType.PAYMENT_FAILED]: {
    title: 'فشلت عملية الدفع',
    message: 'تعذّر إتمام عملية الدفع. حاول مرة أخرى.',
  },
  [NotificationType.ESCROW_REFUNDED]: {
    title: 'تم استرداد مبلغ الضمان',
    message: 'تم استرداد مبلغ الضمان لمشروع "{projectTitle}".',
  },
  [NotificationType.POINTS_EARNED]: {
    title: 'حصلت على نقاط',
    message: 'حصلت على {points} نقطة.',
  },
  [NotificationType.POINTS_SPENT]: {
    title: 'تم خصم نقاط',
    message: 'تم خصم {points} نقطة: {reason}.',
  },
  [NotificationType.LOW_POINTS]: {
    title: 'رصيد نقاط منخفض',
    message: 'لديك {points} نقطة فقط.',
  },
  [NotificationType.INSUFFICIENT_POINTS]: {
    title: 'نقاط غير كافية',
    message: 'لا تملك نقاطاً كافية لتقديم عرض.',
  },
  [NotificationType.PROFILE_COMPLETED]: {
    title: 'اكتمل ملفك الشخصي',
    message: 'أحسنت! ملفك الشخصي مكتمل الآن.',
  },
  [NotificationType.ACCOUNT_SECURITY_ALERT]: {
    title: 'تنبيه أمني',
    message: '{message}',
  },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    title: '{title}',
    message: '{message}',
  },
  [NotificationType.MAINTENANCE]: {
    title: '{title}',
    message: '{message}',
  },
  [NotificationType.IMPORTANT_UPDATE]: {
    title: '{title}',
    message: '{message}',
  },
};

const EN: TemplateCatalog = {
  [NotificationType.NEW_PROPOSAL]: {
    title: 'New proposal on your project',
    message: 'You received a new proposal on "{projectTitle}"',
    cta: 'View freelancer',
  },
  [NotificationType.PROPOSAL_ACCEPTED]: {
    title: 'Your proposal was accepted',
    message: 'Your proposal on "{projectTitle}" was accepted.',
    cta: 'Open project',
  },
  [NotificationType.PROPOSAL_REJECTED]: {
    title: 'Your proposal was not accepted',
    message: 'Another freelancer was selected for "{projectTitle}".',
  },
  [NotificationType.NEW_MESSAGE]: {
    title: 'New message from {senderName}',
    message: '{preview}',
    cta: 'Open conversation',
  },
  [NotificationType.PROJECT_COMPLETION_REQUESTED]: {
    title: 'Project delivered',
    message: 'The freelancer requested completion for "{projectTitle}".',
    cta: 'Review delivery',
  },
  [NotificationType.PROJECT_COMPLETED]: {
    title: 'Project completed successfully',
    message: '"{projectTitle}" was marked as completed.',
  },
  [NotificationType.NEW_REVIEW]: {
    title: 'You received a new review',
    message: 'You were reviewed on "{projectTitle}".',
  },
  [NotificationType.ESCROW_FUNDED]: {
    title: 'Escrow funded',
    message: 'Escrow was funded for "{projectTitle}".',
  },
  [NotificationType.ESCROW_RELEASED]: {
    title: 'Escrow released',
    message: 'Escrow funds were released for "{projectTitle}".',
  },
  [NotificationType.ESCROW_DISPUTED]: {
    title: 'Escrow dispute opened',
    message: 'A dispute was opened on "{projectTitle}".',
  },
  [NotificationType.ESCROW_DISPUTE_RESOLVED]: {
    title: 'Dispute resolved',
    message: '{resolution}',
  },
  [NotificationType.ADMIN_BROADCAST]: {
    title: '{title}',
    message: '{message}',
  },
  [NotificationType.PROJECT_MATCHED]: {
    title: 'New project matches your skills',
    message: 'A client is looking for {categoryName} with budget {budgetLabel}.',
    cta: 'View project',
  },
  [NotificationType.PROJECT_MATCHED_DIGEST]: {
    title: '{count} new projects match your skills',
    message: 'Several new projects match your skills.',
    cta: 'Browse projects',
  },
  [NotificationType.PROPOSAL_WITHDRAWN]: {
    title: 'Proposal withdrawn',
    message: 'A freelancer withdrew a proposal on "{projectTitle}".',
  },
  [NotificationType.PROJECT_STARTED]: {
    title: 'Work started on your project',
    message: 'The freelancer started work on "{projectTitle}".',
  },
  [NotificationType.PROJECT_DEADLINE_APPROACHING]: {
    title: '1 day left until the deadline',
    message: 'Deadline for "{projectTitle}" is in 24 hours.',
  },
  [NotificationType.PROJECT_DEADLINE_6H]: {
    title: '6 hours left until the deadline',
    message: 'Deadline for "{projectTitle}" is in 6 hours.',
  },
  [NotificationType.PROJECT_OVERDUE]: {
    title: 'Project is overdue',
    message: '"{projectTitle}" has passed its deadline.',
  },
  [NotificationType.PAYMENT_SUCCESS]: {
    title: 'Payment received successfully',
    message: 'Payment of {amount} LYD succeeded.',
    cta: 'View payments',
  },
  [NotificationType.PAYMENT_FAILED]: {
    title: 'Payment failed',
    message: 'The payment could not be completed. Please try again.',
  },
  [NotificationType.ESCROW_REFUNDED]: {
    title: 'Escrow refunded',
    message: 'Escrow funds were refunded for "{projectTitle}".',
  },
  [NotificationType.POINTS_EARNED]: {
    title: 'Points earned',
    message: 'You earned {points} points.',
  },
  [NotificationType.POINTS_SPENT]: {
    title: 'Points spent',
    message: '{points} points were deducted: {reason}.',
  },
  [NotificationType.LOW_POINTS]: {
    title: 'Low points balance',
    message: 'You have only {points} points left.',
  },
  [NotificationType.INSUFFICIENT_POINTS]: {
    title: 'Insufficient points',
    message: 'You do not have enough points to submit a proposal.',
  },
  [NotificationType.PROFILE_COMPLETED]: {
    title: 'Profile completed',
    message: 'Great! Your profile is now complete.',
  },
  [NotificationType.ACCOUNT_SECURITY_ALERT]: {
    title: 'Security alert',
    message: '{message}',
  },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    title: '{title}',
    message: '{message}',
  },
  [NotificationType.MAINTENANCE]: {
    title: '{title}',
    message: '{message}',
  },
  [NotificationType.IMPORTANT_UPDATE]: {
    title: '{title}',
    message: '{message}',
  },
};

const CATALOGS: Record<NotificationLocale, TemplateCatalog> = { ar: AR, en: EN };

function interpolate(
  template: string,
  params: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value == null ? '' : String(value);
  });
}

export function normalizeLocale(raw?: string | null): NotificationLocale {
  if (!raw) return 'ar';
  const lower = raw.toLowerCase();
  if (lower.startsWith('en')) return 'en';
  return 'ar';
}

export function resolveNotificationCopy(
  type: NotificationType,
  locale: NotificationLocale,
  params: Record<string, string | number | undefined> = {},
): { title: string; message: string; cta?: string } {
  const catalog = CATALOGS[locale] ?? AR;
  const tpl = catalog[type] ?? AR[type];
  return {
    title: interpolate(tpl.title, params).trim() || String(params.title ?? ''),
    message:
      interpolate(tpl.message, params).trim() || String(params.message ?? ''),
    cta: tpl.cta ? interpolate(tpl.cta, params) : undefined,
  };
}
