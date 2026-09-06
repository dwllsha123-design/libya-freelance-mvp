import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { userNotificationRoom } from '../notifications/notifications.constants.js';
import { PresenceService } from '../presence/presence.service.js';

/**
 * Socket.IO session control. With Redis adapter, disconnects propagate across replicas.
 */
@Injectable()
export class RealtimeSessionService {
  private readonly logger = new Logger(RealtimeSessionService.name);
  private server: Server | null = null;

  constructor(private readonly presence: PresenceService) {}

  setServer(server: Server) {
    this.server = server;
  }

  async disconnectUser(userId: string): Promise<void> {
    try {
      await this.presence.forceOffline(userId);
    } catch (error) {
      this.logger.error(
        `Failed to clear presence for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

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
