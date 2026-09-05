import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import {
  CreatePushSubscriptionDto,
  UpdatePreferencesDto,
} from './dto/preferences.dto.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { PushNotificationService } from './push-notification.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly pushService: PushNotificationService,
  ) {}

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
    return this.notificationsService.listLatest(user.id, 8);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.preferencesService.getForUser(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updateForUser(user.id, body.preferences);
  }

  @Get('push/public-key')
  @Public()
  pushPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('push-subscriptions')
  createPushSubscription(
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePushSubscriptionDto,
  ) {
    return this.pushService.upsertSubscription(user.id, body);
  }

  @Delete('push-subscriptions/:id')
  deletePushSubscription(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.pushService.removeSubscription(user.id, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete()
  clearAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.clearAll(user.id);
  }

  @Post(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch(':id/read')
  markReadPatch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch(':id/unread')
  markUnread(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markUnread(user.id, id);
  }

  @Delete(':id')
  deleteOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteOne(user.id, id);
  }
}
