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

import type { AuthUser } from '../auth/types/auth-user.type.js';
import { Public } from '../common/decorators/public.decorator.js';
import { NotificationsRealtimeService } from '../notifications/notifications-realtime.service.js';
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
    client.emit('socket:ready');
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

    client
      .to(conversationRoom(body.conversationId))
      .emit('typing:start', {
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

    client
      .to(conversationRoom(body.conversationId))
      .emit('typing:stop', {
        conversationId: body.conversationId,
        userId: user.id,
      });

    ack({ ok: true });
  }
}

