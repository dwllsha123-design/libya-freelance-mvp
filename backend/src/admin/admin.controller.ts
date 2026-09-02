import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { AdminCategoriesService } from './admin-categories.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminProjectsService } from './admin-projects.service.js';
import { AdminProposalsService } from './admin-proposals.service.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminSkillsService } from './admin-skills.service.js';
import { AdminUsersService } from './admin-users.service.js';
import {
  AdminProjectsQueryDto,
  AdminProposalsQueryDto,
  AdminReviewsQueryDto,
  AdminUsersQueryDto,
  CreateCategoryDto,
  CreateSkillDto,
  UpdateCategoryDto,
  UpdateSkillDto,
  AdminPaginationQueryDto,
} from './dto/admin.dto.js';
import { EscrowService } from '../escrow/escrow.service.js';
import { ResolveDisputeDto } from '../escrow/dto/escrow.dto.js';

@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly users: AdminUsersService,
    private readonly projects: AdminProjectsService,
    private readonly proposals: AdminProposalsService,
    private readonly reviews: AdminReviewsService,
    private readonly categories: AdminCategoriesService,
    private readonly skills: AdminSkillsService,
    private readonly escrow: EscrowService,
  ) {}

  @Get('dashboard')
  getDashboard(@Query('range') range?: '7d' | '30d' | '3m' | '6m' | '12m') {
    return this.dashboard.getOverview(range);
  }

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.users.list(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Post('users/:id/suspend')
  suspendUser(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.suspend(admin.id, id);
  }

  @Post('users/:id/ban')
  banUser(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.ban(admin.id, id);
  }

  @Post('users/:id/reactivate')
  reactivateUser(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.reactivate(admin.id, id);
  }

  @Post('users/:id/revoke-sessions')
  revokeUserSessions(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.revokeSessions(admin.id, id);
  }

  @Get('projects')
  listProjects(@Query() query: AdminProjectsQueryDto) {
    return this.projects.list(query);
  }

  @Get('projects/:id')
  getProject(@Param('id') id: string) {
    return this.projects.getById(id);
  }

  @Post('projects/:id/close')
  closeProject(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.projects.closeProject(admin.id, id);
  }

  @Get('proposals')
  listProposals(@Query() query: AdminProposalsQueryDto) {
    return this.proposals.list(query);
  }

  @Get('proposals/:id')
  getProposal(@Param('id') id: string) {
    return this.proposals.getById(id);
  }

  @Get('reviews')
  listReviews(@Query() query: AdminReviewsQueryDto) {
    return this.reviews.list(query);
  }

  @Get('reviews/:id')
  getReview(@Param('id') id: string) {
    return this.reviews.getById(id);
  }

  @Post('reviews/:id/hide')
  hideReview(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.reviews.hide(admin.id, id);
  }

  @Post('reviews/:id/restore')
  restoreReview(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.reviews.restore(admin.id, id);
  }

  @Get('categories')
  listCategories(@Query() query: AdminPaginationQueryDto) {
    return this.categories.list(query);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(admin.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(admin.id, id, dto);
  }

  @Post('categories/:id/activate')
  activateCategory(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.categories.setActive(admin.id, id, true);
  }

  @Post('categories/:id/deactivate')
  deactivateCategory(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.categories.setActive(admin.id, id, false);
  }

  @Get('skills')
  listSkills(@Query() query: AdminPaginationQueryDto) {
    return this.skills.list(query);
  }

  @Post('skills')
  createSkill(@CurrentUser() admin: AuthUser, @Body() dto: CreateSkillDto) {
    return this.skills.create(admin.id, dto);
  }

  @Patch('skills/:id')
  updateSkill(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.skills.update(admin.id, id, dto);
  }

  @Post('skills/:id/activate')
  activateSkill(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.skills.setActive(admin.id, id, true);
  }

  @Post('skills/:id/deactivate')
  deactivateSkill(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.skills.setActive(admin.id, id, false);
  }

  @Get('escrow/disputes')
  listEscrowDisputes(@Query('status') status?: 'open' | 'resolved') {
    return this.escrow.listDisputesForAdmin(status ?? 'open');
  }

  @Post('escrow/disputes/:id/resolve')
  resolveEscrowDispute(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.escrow.resolveDispute(admin.id, id, dto.resolution, dto.outcome);
  }
}
