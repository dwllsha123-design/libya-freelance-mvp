import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { userNotificationRoom } from '../notifications/notifications.constants.js';

/**
 * Best-effort Socket.IO session control for a single Nest instance.
 * Multi-instance deployments require a shared adapter (e.g. Redis) for global disconnect.
 */
@Injectable()
export class RealtimeSessionService {
  private readonly logger = new Logger(RealtimeSessionService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  async disconnectUser(userId: string): Promise<void> {
    if (!this.server) {
      return;
    }

    const room = userNotificationRoom(userId);
    const sockets = await this.server.in(room).fetchSockets();

    if (sockets.length === 0) {
      return;
    }

    this.server.in(room).disconnectSockets(true);
    this.logger.log(`Disconnected ${sockets.length} socket(s) for user ${userId}`);
  }
}
