import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AdminAuditModule } from '../admin/admin-audit.module.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import { VerificationController, AdminVerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [NotificationsModule, StorageModule, AdminAuditModule],
  controllers: [VerificationController, AdminVerificationController],
  providers: [VerificationService, SuperAdminGuard, AdminPermissionGuard],
  exports: [VerificationService],
})
export class VerificationModule {}
