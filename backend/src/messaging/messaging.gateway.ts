import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';

import type { Server, Socket } from 'socket.io';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import { Public } from '../common/decorators/public.decorator.js';
import { NotificationsRealtimeService } from '../notifications/notifications-realtime.service.js';
import {
  PRESENCE_HEARTBEAT_EVENT,
  PRESENCE_SUBSCRIBE_EVENT,
  PRESENCE_SUBSCRIBE_MAX_IDS,
  PRESENCE_UNSUBSCRIBE_EVENT,
  presenceWatchRoom,
} from '../presence/presence.constants.js';
import { PresenceService } from '../presence/presence.service.js';
import { RealtimeSessionService } from '../realtime/realtime-session.service.js';
import { conversationRoom } from './messaging.constants.js';
import { MessagingService } from './messaging.service.js';

interface AuthenticatedSocket extends Socket {
  data: { user?: AuthUser };
}

@Public()
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly notificationsRealtime: NotificationsRealtimeService,
    private readonly realtimeSessions: RealtimeSessionService,
    private readonly presence: PresenceService,
  ) {}

  afterInit() {
    this.notificationsRealtime.setServer(this.server);
    this.realtimeSessions.setServer(this.server);
    this.presence.setServer(this.server);

    this.server.use(async (socket, next) => {
      try {
        const token =
          (socket.handshake.auth?.token as string | undefined) ??
          (socket.handshake.headers.authorization?.replace('Bearer ', '') as
            | string
            | undefined);

        if (!token) {
          return next(new Error('غير مصرح'));
        }

        const user = await this.messagingService.verifySocketToken(token);
        (socket as AuthenticatedSocket).data = { user };
        next();
      } catch {
        this.logger.warn(`Socket auth rejected: ${socket.id}`);
        next(new Error('غير مصرح'));
      }
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    const user = client.data.user;

    if (!user) {
      client.disconnect(true);
      return;
    }

    await client.join(this.notificationsRealtime.getUserRoom(user.id));

    try {
      await this.presence.registerConnection(
        user.id,
        client.id,
        user.role as Role,
      );
    } catch (error) {
      this.logger.error(
        `Presence register failed for ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    client.emit('socket:ready');
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    this.logger.debug(`Socket disconnected: ${client.id}`);

    if (!user) return;

    try {
      await this.presence.unregisterConnection(user.id, client.id);
    } catch (error) {
      this.logger.error(
        `Presence unregister failed for ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async requireActiveUser(
    client: AuthenticatedSocket,
  ): Promise<AuthUser | null> {
    const cached = client.data.user;

    if (!cached) {
      return null;
    }

    try {
      const user = await this.messagingService.assertActiveUser(cached.id);
      client.data.user = user;
      return user;
    } catch {
      client.disconnect(true);
      return null;
    }
  }

  @SubscribeMessage(PRESENCE_HEARTBEAT_EVENT)
  async handlePresenceHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    if (!this.presence.assertHeartbeatRateLimit(user.id)) {
      ack({ throttled: true });
      return;
    }

    await this.presence.heartbeat(user.id, client.id);
    ack({ ok: true });
  }

  @SubscribeMessage(PRESENCE_SUBSCRIBE_EVENT)
  async handlePresenceSubscribe(
    @MessageBody() body: { userIds?: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    if (!this.presence.assertSubscribeRateLimit(user.id)) {
      ack({ throttled: true });
      return;
    }

    const userIds = [...new Set((body.userIds ?? []).filter(Boolean))].slice(
      0,
      PRESENCE_SUBSCRIBE_MAX_IDS,
    );

    const snapshots = await this.presence.getPresenceBatch(userIds, {
      id: user.id,
      role: user.role as Role,
    });

    const users = await this.messagingService.findActiveUsersByIds(userIds);
    for (const subject of users) {
      if (
        this.presence.canViewPresence(
          { id: user.id, role: user.role as Role },
          subject,
        )
      ) {
        await client.join(presenceWatchRoom(subject.id));
      }
    }

    ack({ ok: true, items: snapshots });
  }

  @SubscribeMessage(PRESENCE_UNSUBSCRIBE_EVENT)
  async handlePresenceUnsubscribe(
    @MessageBody() body: { userIds?: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    for (const id of (body.userIds ?? []).slice(0, PRESENCE_SUBSCRIBE_MAX_IDS)) {
      await client.leave(presenceWatchRoom(id));
    }
    ack({ ok: true });
  }

  @SubscribeMessage('conversation:join')
  async handleJoin(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);

    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      ack({ error: 'غير مصرح' });
      return;
    }

    await client.join(conversationRoom(body.conversationId));

    const otherId = await this.messagingService.getOtherParticipantId(
      body.conversationId,
      user.id,
    );
    if (otherId) {
      await client.join(presenceWatchRoom(otherId));
    }

    // Mark undelivered messages from the other party as delivered
    void this.messagingService
      .markDelivered(user.id, body.conversationId)
      .then((result) => {
        if (result.markedCount > 0) {
          this.server
            .to(conversationRoom(body.conversationId))
            .emit('message:delivered', result);
        }
      })
      .catch(() => undefined);

    ack({ ok: true });
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @MessageBody() body: { conversationId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);

    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      ack({ error: 'غير مصرح' });
      return;
    }

    const message = await this.messagingService.sendMessage(
      user.id,
      body.conversationId,
      body.content,
    );

    this.server
      .to(conversationRoom(body.conversationId))
      .emit('message:new', message);

    this.server.emit('conversation:updated', {
      conversationId: body.conversationId,
      lastMessageAt: message.createdAt,
    });

    ack({ message });
  }

  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    @MessageBody() body: { conversationId: string; messageIds?: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );
    if (!allowed) {
      ack({ error: 'غير مصرح' });
      return;
    }

    const result = await this.messagingService.markDelivered(
      user.id,
      body.conversationId,
      body.messageIds,
    );

    if (result.markedCount > 0) {
      this.server
        .to(conversationRoom(body.conversationId))
        .emit('message:delivered', result);
    }

    ack({ ok: true, ...result });
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    if (!this.messagingService.assertTypingRateLimit(user.id)) {
      ack({ throttled: true });
      return;
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      ack({ error: 'غير مصرح' });
      return;
    }

    client.to(conversationRoom(body.conversationId)).emit('typing:start', {
      conversationId: body.conversationId,
      userId: user.id,
    });

    ack({ ok: true });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
    @Ack() ack: (response: unknown) => void,
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) {
      ack({ error: 'غير مصرح' });
      return;
    }

    if (!this.messagingService.assertTypingRateLimit(user.id)) {
      ack({ throttled: true });
      return;
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      ack({ error: 'غير مصرح' });
      return;
    }

    client.to(conversationRoom(body.conversationId)).emit('typing:stop', {
      conversationId: body.conversationId,
      userId: user.id,
    });

    ack({ ok: true });
  }
}
