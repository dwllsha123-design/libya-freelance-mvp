import { Module, forwardRef } from '@nestjs/common';
import { NuqatiController } from './nuqati.controller.js';
import { AdminPointsPackagesController } from './admin-points-packages.controller.js';
import { NuqatiService } from './nuqati.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { LaunchModule } from '../launch/launch.module.js';
import { AdminAuditModule } from '../admin/admin-audit.module.js';
import { PaymentsModule } from '../payments/payment.module.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => LaunchModule),
    AdminAuditModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [NuqatiController, AdminPointsPackagesController],
  providers: [NuqatiService, SuperAdminGuard, AdminPermissionGuard],
  exports: [NuqatiService],
})
export class NuqatiModule {}
