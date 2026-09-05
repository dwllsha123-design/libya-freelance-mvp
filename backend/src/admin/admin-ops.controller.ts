import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminPermission, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequireSuperAdmin } from '../common/decorators/super-admin.decorator.js';
import { RequireAdminPermission } from '../common/decorators/admin-permission.decorator.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { AdminOpsService } from './admin-ops.service.js';
import {
  AdminPortfolioQueryDto,
  AdminSearchQueryDto,
  AssignAdminPermissionsDto,
  BroadcastPreviewDto,
  BroadcastSendDto,
  CreateBannerDto,
  CreateInvestorPayoutDto,
  CreateInvestorStatementDto,
  CreateStaffAdminDto,
  FeatureItemDto,
  PatchCmsContentDto,
  PatchFeatureFlagsDto,
  PatchPlatformSettingsDto,
  PortfolioModerationDto,
  ReorderFeaturedDto,
  TransitionInvestorPayoutDto,
  UpdateBannerDto,
} from './dto/admin-ops.dto.js';

@Controller('admin')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard, AdminPermissionGuard)
export class AdminOpsController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get('settings')
  getSettings() {
    return this.ops.getSettings();
  }

  @Patch('settings')
  @RequireAdminPermission(AdminPermission.MANAGE_SETTINGS)
  patchSettings(@CurrentUser() user: AuthUser, @Body() dto: PatchPlatformSettingsDto) {
    return this.ops.patchSettings(user.id, user.role, dto.settings);
  }

  @Get('settings/features')
  getFeatures() {
    return this.ops.getSettings();
  }

  @Patch('settings/features')
  @RequireSuperAdmin()
  patchFeatures(@CurrentUser() user: AuthUser, @Body() dto: PatchFeatureFlagsDto) {
    return this.ops.patchFeatureFlags(user.id, dto.flags);
  }

  @Get('content')
  listCms() {
    return this.ops.listCms();
  }

  @Patch('content')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  upsertCms(@CurrentUser() user: AuthUser, @Body() dto: PatchCmsContentDto) {
    return this.ops.upsertCms(user.id, dto);
  }

  @Get('content/banners')
  listBanners() {
    return this.ops.listBanners();
  }

  @Post('content/banners')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  createBanner(@CurrentUser() user: AuthUser, @Body() dto: CreateBannerDto) {
    return this.ops.createBanner(user.id, dto);
  }

  @Patch('content/banners/:id')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  updateBanner(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.ops.updateBanner(user.id, id, dto);
  }

  @Delete('content/banners/:id')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  deleteBanner(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.deleteBanner(user.id, id);
  }

  @Post('content/banners/:id/publish')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  publishBanner(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.updateBanner(user.id, id, { isActive: true });
  }

  @Post('content/banners/:id/unpublish')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  unpublishBanner(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.updateBanner(user.id, id, { isActive: false });
  }

  @Get('featured')
  listFeatured() {
    return this.ops.listFeatured();
  }

  @Post('featured')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  feature(@CurrentUser() user: AuthUser, @Body() dto: FeatureItemDto) {
    return this.ops.featureItem(user.id, dto);
  }

  @Delete('featured/:id')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  unfeature(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.unfeatureItem(user.id, id);
  }

  @Post('featured/reorder')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  reorderFeatured(@CurrentUser() user: AuthUser, @Body() dto: ReorderFeaturedDto) {
    return this.ops.reorderFeatured(user.id, dto.orderedIds);
  }

  @Get('notifications/stats')
  @RequireAdminPermission(AdminPermission.SEND_NOTIFICATIONS, AdminPermission.SEND_BROADCASTS, AdminPermission.VIEW_SYSTEM)
  notificationStats(@Query('days') days?: string) {
    const parsed = days ? Number(days) : 30;
    return this.ops.getNotificationStats(Number.isFinite(parsed) ? parsed : 30);
  }

  @Get('notifications/broadcasts')
  @RequireAdminPermission(AdminPermission.SEND_NOTIFICATIONS, AdminPermission.SEND_BROADCASTS)
  listBroadcasts(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 20;
    return this.ops.listBroadcasts(Number.isFinite(parsed) ? parsed : 20);
  }

  @Get('notifications/broadcast/preview')
  @RequireAdminPermission(AdminPermission.SEND_NOTIFICATIONS, AdminPermission.SEND_BROADCASTS)
  previewBroadcastGet(@Query() dto: BroadcastPreviewDto) {
    return this.ops.previewBroadcast(dto);
  }

  @Post('notifications/broadcast/preview')
  @RequireAdminPermission(AdminPermission.SEND_NOTIFICATIONS, AdminPermission.SEND_BROADCASTS)
  previewBroadcast(@Body() dto: BroadcastPreviewDto) {
    return this.ops.previewBroadcast(dto);
  }

  @Post('notifications/broadcast')
  @RequireAdminPermission(AdminPermission.SEND_NOTIFICATIONS, AdminPermission.SEND_BROADCASTS)
  sendBroadcast(@CurrentUser() user: AuthUser, @Body() dto: BroadcastSendDto) {
    return this.ops.sendBroadcast(user.id, dto);
  }

  @Get('admins')
  listAdmins() {
    return this.ops.listStaffAdmins();
  }

  @Post('admins')
  @RequireSuperAdmin()
  createAdmin(@CurrentUser() user: AuthUser, @Body() dto: CreateStaffAdminDto) {
    return this.ops.createStaffAdmin(user.id, dto);
  }

  @Post('admins/:id/permissions')
  @RequireSuperAdmin()
  assignPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignAdminPermissionsDto,
  ) {
    return this.ops.assignPermissions(user.id, id, dto);
  }

  @Post('admins/:id/suspend')
  @RequireSuperAdmin()
  suspendAdmin(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.suspendAdmin(user.id, id);
  }

  @Post('admins/:id/reactivate')
  @RequireSuperAdmin()
  reactivateAdmin(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.reactivateAdmin(user.id, id);
  }

  @Post('admins/:id/revoke-sessions')
  @RequireSuperAdmin()
  revokeAdminSessions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.revokeAdminSessions(user.id, id);
  }

  @Get('portfolio')
  listPortfolio(@Query() query: AdminPortfolioQueryDto) {
    return this.ops.listPortfolio(query);
  }

  @Post('portfolio/:id/hide')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  hidePortfolio(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PortfolioModerationDto,
  ) {
    return this.ops.hidePortfolio(user.id, id, dto);
  }

  @Post('portfolio/:id/restore')
  @RequireAdminPermission(AdminPermission.MANAGE_CONTENT)
  restorePortfolio(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PortfolioModerationDto,
  ) {
    return this.ops.restorePortfolio(user.id, id, dto);
  }

  @Get('investors/payouts')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.VIEW_FINANCE, AdminPermission.FINANCE_VIEW)
  listPayouts() {
    return this.ops.listPayouts();
  }

  @Post('investors/payouts')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE)
  createPayout(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestorPayoutDto) {
    return this.ops.createPayout(user.id, dto);
  }

  @Post('investors/payouts/:id/approve')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE)
  approvePayout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.approvePayout(user.id, id);
  }

  @Post('investors/payouts/:id/paid')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE)
  markPaid(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransitionInvestorPayoutDto,
  ) {
    return this.ops.markPayoutPaid(user.id, id, dto);
  }

  @Post('investors/payouts/:id/cancel')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE)
  cancelPayout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.cancelPayout(user.id, id);
  }

  @Get('investors/statements')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.VIEW_FINANCE, AdminPermission.FINANCE_VIEW)
  listStatements(@Query('investorId') investorId?: string) {
    return this.ops.listStatements(investorId);
  }

  @Post('investors/statements')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE)
  createStatement(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestorStatementDto) {
    return this.ops.createStatement(user.id, dto);
  }

  @Post('investors/statements/:id/finalize')
  @RequireAdminPermission(AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE)
  finalizeStatement(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ops.finalizeStatement(user.id, id);
  }

  @Get('search')
  search(@Query() query: AdminSearchQueryDto) {
    return this.ops.search(query.q);
  }
}
