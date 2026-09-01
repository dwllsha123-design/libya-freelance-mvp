import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminCategoriesService } from './admin-categories.service.js';
import { AdminController } from './admin.controller.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminProjectsService } from './admin-projects.service.js';
import { AdminProposalsService } from './admin-proposals.service.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminSkillsService } from './admin-skills.service.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [ReviewsModule],
  controllers: [AdminController, AdminAuditController],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminUsersService,
    AdminProjectsService,
    AdminProposalsService,
    AdminReviewsService,
    AdminCategoriesService,
    AdminSkillsService,
  ],
})
export class AdminModule {}
