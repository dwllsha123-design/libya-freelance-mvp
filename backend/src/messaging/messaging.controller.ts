import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  ConversationsQueryDto,
  MessagesQueryDto,
  SendMessageDto,
} from './dto/messaging.dto.js';
import { conversationRoom } from './messaging.constants.js';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingService } from './messaging.service.js';

@Controller()
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  @Post('proposals/:proposalId/conversation')
  openForProposal(
    @CurrentUser() user: AuthUser,
    @Param('proposalId') proposalId: string,
  ) {
    return this.messagingService.openConversationForProposal(
      user.id,
      user.role,
      proposalId,
    );
  }

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthUser,
    @Query() query: ConversationsQueryDto,
  ) {
    return this.messagingService.listConversations(user.id, query);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.messagingService.getConversation(user.id, id);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.messagingService.listMessages(user.id, id, query);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.id, id, dto.content);
  }

  @Post('conversations/:id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.messagingService.markRead(user.id, id);

    this.messagingGateway.server
      .to(conversationRoom(id))
      .emit('message:read', {
        conversationId: id,
        readBy: user.id,
        markedCount: result.markedCount,
        readAt: result.readAt,
      });

    return result;
  }

  @Get('messages/unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.messagingService.getUnreadCount(user.id);
  }
}
