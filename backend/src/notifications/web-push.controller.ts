import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { PushNotificationService } from './push-notification.service.js';
import {
  SubscribeWebPushDto,
  UnsubscribeWebPushDto,
} from './dto/web-push.dto.js';

@Controller('notifications/push')
export class WebPushController {
  constructor(private readonly push: PushNotificationService) {}

  /** Public VAPID key only — never returns the private key */
  @Public()
  @Get('vapid-public-key')
  vapidPublicKey() {
    const publicKey = this.push.getVapidPublicKey();
    if (!publicKey) {
      throw new ServiceUnavailableException({
        configured: false,
        message: 'Web Push is not configured on this server',
      });
    }
    return { publicKey, configured: true };
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeWebPushDto) {
    if (!this.push.isWebPushConfigured()) {
      throw new ServiceUnavailableException('Web Push is not configured');
    }
    return this.push.subscribeWebPush(user.id, {
      endpoint: dto.endpoint,
      keys: dto.keys,
    });
  }

  @Delete('subscribe')
  unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UnsubscribeWebPushDto,
  ) {
    return this.push.unsubscribeWebPush(user.id, dto.endpoint);
  }
}
