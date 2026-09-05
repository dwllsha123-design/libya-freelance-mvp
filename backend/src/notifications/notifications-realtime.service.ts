import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  NOTIFICATION_SOCKET_EVENT,
  userNotificationRoom,
} from './notifications.constants.js';

export interface NotificationRealtimePayload {
  id: string;
  type: string;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
  priority?: string;
}

@Injectable()
export class NotificationsRealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, notification: NotificationRealtimePayload) {
    this.server
      ?.to(userNotificationRoom(userId))
      .emit(NOTIFICATION_SOCKET_EVENT, notification);
  }

  getUserRoom(userId: string) {
    return userNotificationRoom(userId);
  }
}
