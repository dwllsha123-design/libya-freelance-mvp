import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminAuditModule } from '../admin/admin-audit.module.js';
import { PlatformModule } from '../platform/platform.module.js';
import { PaymentsModule } from '../payments/payment.module.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import {
  SubscriptionsController,
  AdminSubscriptionsController,
  AdminSubscriptionPlansController,
} from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionEntitlementService } from './subscription-entitlement.service.js';

@Module({
  imports: [
    NotificationsModule,
    AdminAuditModule,
    forwardRef(() => PlatformModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    SubscriptionsController,
    AdminSubscriptionsController,
    AdminSubscriptionPlansController,
  ],
  providers: [
    SubscriptionsService,
    SubscriptionEntitlementService,
    SuperAdminGuard,
    AdminPermissionGuard,
  ],
  exports: [SubscriptionsService, SubscriptionEntitlementService],
})
export class SubscriptionsModule {}
