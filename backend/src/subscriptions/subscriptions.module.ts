import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminAuditModule } from '../admin/admin-audit.module.js';
import { PlatformModule } from '../platform/platform.module.js';
import { PaymentsModule } from '../payments/payment.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import {
  SubscriptionsController,
  AdminSubscriptionsController,
} from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Module({
  imports: [
    NotificationsModule,
    AdminAuditModule,
    PlatformModule,
    PaymentsModule,
    forwardRef(() => VerificationModule),
  ],
  controllers: [SubscriptionsController, AdminSubscriptionsController],
  providers: [SubscriptionsService, SuperAdminGuard, AdminPermissionGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
