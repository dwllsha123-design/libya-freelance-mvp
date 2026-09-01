import { NotificationType } from '@prisma/client';

export const NOTIFICATION_SOCKET_EVENT = 'notification:new';

export function userNotificationRoom(userId: string) {
  return `user:${userId}`;
}

export const NOTIFICATION_TYPES = [
  NotificationType.NEW_PROPOSAL,
  NotificationType.PROPOSAL_ACCEPTED,
  NotificationType.PROPOSAL_REJECTED,
  NotificationType.NEW_MESSAGE,
  NotificationType.PROJECT_COMPLETION_REQUESTED,
  NotificationType.PROJECT_COMPLETED,
  NotificationType.NEW_REVIEW,
] as const;
