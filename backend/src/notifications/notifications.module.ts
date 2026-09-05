import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsRealtimeService } from './notifications-realtime.service.js';
import { NotificationsService } from './notifications.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { NotificationLogService } from './notification-log.service.js';
import { NotificationEmailService } from './notification-email.service.js';
import { NotificationDeadlineScheduler } from './notification-deadline.scheduler.js';
import { NotificationEventBus } from './notification-event-bus.js';
import { NotificationEventListener } from './notification-event.listener.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRealtimeService,
    PushNotificationService,
    NotificationPreferencesService,
    NotificationQueueService,
    NotificationLogService,
    NotificationEmailService,
    NotificationDeadlineScheduler,
    NotificationEventBus,
    NotificationEventListener,
  ],
  exports: [
    NotificationsService,
    NotificationsRealtimeService,
    PushNotificationService,
    NotificationPreferencesService,
    NotificationLogService,
    NotificationEventBus,
    NotificationQueueService,
  ],
})
export class NotificationsModule {}
