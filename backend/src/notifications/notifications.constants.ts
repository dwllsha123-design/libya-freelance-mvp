import { NotificationType } from '@prisma/client';

export const NOTIFICATION_SOCKET_EVENT = 'notification:new';

export function userNotificationRoom(userId: string) {
  return `user:${userId}`;
}

export const NOTIFICATION_TYPES = Object.values(NotificationType);
