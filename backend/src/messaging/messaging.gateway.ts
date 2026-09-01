import {
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

import type { AuthUser } from '../auth/types/auth-user.type.js';
import { NotificationsRealtimeService } from '../notifications/notifications-realtime.service.js';
import { RealtimeSessionService } from '../realtime/realtime-session.service.js';
import { conversationRoom } from './messaging.constants.js';
import { MessagingService } from './messaging.service.js';

interface AuthenticatedSocket extends Socket {
  data: { user?: AuthUser };
}

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
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
  ) {}

  afterInit() {
    this.notificationsRealtime.setServer(this.server);
    this.realtimeSessions.setServer(this.server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace('Bearer ', '') as
          | string
          | undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const user = await this.messagingService.verifySocketToken(token);

      client.data.user = user;
      await client.join(this.notificationsRealtime.getUserRoom(user.id));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
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

  @SubscribeMessage('conversation:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = await this.requireActiveUser(client);

    if (!user) {
      return { error: 'غير مصرح' };
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      return { error: 'غير مصرح' };
    }

    await client.join(conversationRoom(body.conversationId));

    return { ok: true };
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId: string; content: string },
  ) {
    const user = await this.requireActiveUser(client);

    if (!user) {
      return { error: 'غير مصرح' };
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      return { error: 'غير مصرح' };
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

    return { message };
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) return { error: 'غير مصرح' };

    if (!this.messagingService.assertTypingRateLimit(user.id)) {
      return { throttled: true };
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      return { error: 'غير مصرح' };
    }

    client
      .to(conversationRoom(body.conversationId))
      .emit('typing:start', {
        conversationId: body.conversationId,
        userId: user.id,
      });

    return { ok: true };
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = await this.requireActiveUser(client);
    if (!user) return { error: 'غير مصرح' };

    if (!this.messagingService.assertTypingRateLimit(user.id)) {
      return { throttled: true };
    }

    const allowed = await this.messagingService.authorizeRoomJoin(
      user.id,
      body.conversationId,
    );

    if (!allowed) {
      return { error: 'غير مصرح' };
    }

    client
      .to(conversationRoom(body.conversationId))
      .emit('typing:stop', {
        conversationId: body.conversationId,
        userId: user.id,
      });

    return { ok: true };
  }
}
