import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminAuditModule } from '../admin/admin-audit.module.js';
import { BadgeService } from './badge.service.js';
import { BadgesController } from './badges.controller.js';

@Module({
  imports: [NotificationsModule, AdminAuditModule],
  controllers: [BadgesController],
  providers: [BadgeService],
  exports: [BadgeService],
})
export class BadgesModule {}
