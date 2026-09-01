import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.listForUser(user.id, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Get('latest')
  latest(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listLatest(user.id, 5);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user.id, id);
  }
}
