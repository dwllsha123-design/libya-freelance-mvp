import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsRealtimeService } from './notifications-realtime.service.js';
import { NotificationsService } from './notifications.service.js';
import { PushNotificationService } from './push-notification.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRealtimeService,
    PushNotificationService,
  ],
  exports: [
    NotificationsService,
    NotificationsRealtimeService,
    PushNotificationService,
  ],
})
export class NotificationsModule {}
