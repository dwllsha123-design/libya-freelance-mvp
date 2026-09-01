import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsRealtimeService } from './notifications-realtime.service.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRealtimeService],
  exports: [NotificationsService, NotificationsRealtimeService],
})
export class NotificationsModule {}
