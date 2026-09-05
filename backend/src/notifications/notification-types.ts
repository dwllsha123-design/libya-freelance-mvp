import {
  NotificationPriority,
  NotificationType,
} from '@prisma/client';

/** Category tabs used by the notification center + preferences UI */
export type NotificationCategory =
  | 'PROJECTS'
  | 'MESSAGES'
  | 'PAYMENTS'
  | 'POINTS'
  | 'SYSTEM';

export const NOTIFICATION_CATEGORY_TYPES: Record<
  NotificationCategory,
  NotificationType[]
> = {
  PROJECTS: [
    NotificationType.NEW_PROPOSAL,
    NotificationType.PROPOSAL_ACCEPTED,
    NotificationType.PROPOSAL_REJECTED,
    NotificationType.PROPOSAL_WITHDRAWN,
    NotificationType.PROJECT_MATCHED,
    NotificationType.PROJECT_MATCHED_DIGEST,
    NotificationType.PROJECT_STARTED,
    NotificationType.PROJECT_COMPLETION_REQUESTED,
    NotificationType.PROJECT_COMPLETED,
    NotificationType.PROJECT_DEADLINE_APPROACHING,
    NotificationType.PROJECT_DEADLINE_6H,
    NotificationType.PROJECT_OVERDUE,
    NotificationType.NEW_REVIEW,
  ],
  MESSAGES: [NotificationType.NEW_MESSAGE],
  PAYMENTS: [
    NotificationType.ESCROW_FUNDED,
    NotificationType.ESCROW_RELEASED,
    NotificationType.ESCROW_DISPUTED,
    NotificationType.ESCROW_DISPUTE_RESOLVED,
    NotificationType.ESCROW_REFUNDED,
    NotificationType.PAYMENT_SUCCESS,
    NotificationType.PAYMENT_FAILED,
  ],
  POINTS: [
    NotificationType.POINTS_EARNED,
    NotificationType.POINTS_SPENT,
    NotificationType.LOW_POINTS,
    NotificationType.INSUFFICIENT_POINTS,
  ],
  SYSTEM: [
    NotificationType.ADMIN_BROADCAST,
    NotificationType.SYSTEM_ANNOUNCEMENT,
    NotificationType.MAINTENANCE,
    NotificationType.IMPORTANT_UPDATE,
    NotificationType.PROFILE_COMPLETED,
    NotificationType.ACCOUNT_SECURITY_ALERT,
  ],
};

export const DEFAULT_NOTIFICATION_PRIORITY: Record<
  NotificationType,
  NotificationPriority
> = {
  [NotificationType.NEW_PROPOSAL]: NotificationPriority.NORMAL,
  [NotificationType.PROPOSAL_ACCEPTED]: NotificationPriority.HIGH,
  [NotificationType.PROPOSAL_REJECTED]: NotificationPriority.NORMAL,
  [NotificationType.NEW_MESSAGE]: NotificationPriority.NORMAL,
  [NotificationType.PROJECT_COMPLETION_REQUESTED]: NotificationPriority.HIGH,
  [NotificationType.PROJECT_COMPLETED]: NotificationPriority.HIGH,
  [NotificationType.NEW_REVIEW]: NotificationPriority.NORMAL,
  [NotificationType.ESCROW_FUNDED]: NotificationPriority.HIGH,
  [NotificationType.ESCROW_RELEASED]: NotificationPriority.HIGH,
  [NotificationType.ESCROW_DISPUTED]: NotificationPriority.HIGH,
  [NotificationType.ESCROW_DISPUTE_RESOLVED]: NotificationPriority.HIGH,
  [NotificationType.ADMIN_BROADCAST]: NotificationPriority.NORMAL,
  [NotificationType.PROJECT_MATCHED]: NotificationPriority.NORMAL,
  [NotificationType.PROJECT_MATCHED_DIGEST]: NotificationPriority.NORMAL,
  [NotificationType.PROPOSAL_WITHDRAWN]: NotificationPriority.LOW,
  [NotificationType.PROJECT_STARTED]: NotificationPriority.NORMAL,
  [NotificationType.PROJECT_DEADLINE_APPROACHING]: NotificationPriority.HIGH,
  [NotificationType.PROJECT_DEADLINE_6H]: NotificationPriority.HIGH,
  [NotificationType.PROJECT_OVERDUE]: NotificationPriority.CRITICAL,
  [NotificationType.PAYMENT_SUCCESS]: NotificationPriority.HIGH,
  [NotificationType.PAYMENT_FAILED]: NotificationPriority.HIGH,
  [NotificationType.ESCROW_REFUNDED]: NotificationPriority.HIGH,
  [NotificationType.POINTS_EARNED]: NotificationPriority.LOW,
  [NotificationType.POINTS_SPENT]: NotificationPriority.LOW,
  [NotificationType.LOW_POINTS]: NotificationPriority.NORMAL,
  [NotificationType.INSUFFICIENT_POINTS]: NotificationPriority.NORMAL,
  [NotificationType.PROFILE_COMPLETED]: NotificationPriority.LOW,
  [NotificationType.ACCOUNT_SECURITY_ALERT]: NotificationPriority.CRITICAL,
  [NotificationType.SYSTEM_ANNOUNCEMENT]: NotificationPriority.NORMAL,
  [NotificationType.MAINTENANCE]: NotificationPriority.HIGH,
  [NotificationType.IMPORTANT_UPDATE]: NotificationPriority.HIGH,
};

/** Types that may send email when the user has email enabled (important events only). */
export const EMAIL_ELIGIBLE_TYPES = new Set<NotificationType>([
  NotificationType.PROPOSAL_ACCEPTED,
  NotificationType.PROJECT_COMPLETION_REQUESTED,
  NotificationType.PROJECT_COMPLETED,
  NotificationType.PAYMENT_SUCCESS,
  NotificationType.PAYMENT_FAILED,
  NotificationType.ESCROW_FUNDED,
  NotificationType.ESCROW_RELEASED,
  NotificationType.ESCROW_REFUNDED,
  NotificationType.ESCROW_DISPUTED,
  NotificationType.ESCROW_DISPUTE_RESOLVED,
  NotificationType.ACCOUNT_SECURITY_ALERT,
  NotificationType.ADMIN_BROADCAST,
  NotificationType.SYSTEM_ANNOUNCEMENT,
  NotificationType.MAINTENANCE,
  NotificationType.IMPORTANT_UPDATE,
  NotificationType.PROJECT_OVERDUE,
]);

export function categoryForType(type: NotificationType): NotificationCategory {
  for (const [category, types] of Object.entries(NOTIFICATION_CATEGORY_TYPES)) {
    if (types.includes(type)) {
      return category as NotificationCategory;
    }
  }
  return 'SYSTEM';
}

export function typesForCategory(
  category: NotificationCategory | 'all',
): NotificationType[] | undefined {
  if (category === 'all') return undefined;
  return NOTIFICATION_CATEGORY_TYPES[category];
}
