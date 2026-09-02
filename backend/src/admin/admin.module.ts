import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { EscrowModule } from '../escrow/escrow.module.js';
import { CommercialModule } from '../commercial/commercial.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PlatformModule } from '../platform/platform.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminCategoriesService } from './admin-categories.service.js';
import { AdminController } from './admin.controller.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminFinanceController } from './admin-finance.controller.js';
import { AdminFinanceService } from './admin-finance.service.js';
import { AdminOpsController } from './admin-ops.controller.js';
import { AdminOpsService } from './admin-ops.service.js';
import { AdminProjectsService } from './admin-projects.service.js';
import { AdminProposalsService } from './admin-proposals.service.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminSkillsService } from './admin-skills.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { FinanceWriteGuard } from '../common/guards/finance-write.guard.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';

@Module({
  imports: [
    ReviewsModule,
    EscrowModule,
    CommercialModule,
    NotificationsModule,
    PlatformModule,
    RealtimeModule,
    UsersModule,
  ],
  controllers: [
    AdminController,
    AdminAuditController,
    AdminFinanceController,
    AdminOpsController,
  ],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminUsersService,
    AdminProjectsService,
    AdminProposalsService,
    AdminReviewsService,
    AdminCategoriesService,
    AdminSkillsService,
    AdminFinanceService,
    AdminOpsService,
    FinanceWriteGuard,
    SuperAdminGuard,
    AdminPermissionGuard,
  ],
  exports: [AdminOpsService, AdminAuditService],
})
export class AdminModule {}
