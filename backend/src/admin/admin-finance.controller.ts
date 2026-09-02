import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequireSuperAdmin } from '../common/decorators/super-admin.decorator.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { AdminFinanceService } from './admin-finance.service.js';
import {
  CommissionPreviewDto,
  CreateInvestmentAgreementDto,
  CreateInvestorDto,
  EndProjectOverrideDto,
  FinancePermissionDto,
  ResolveCommissionPreviewDto,
  SchedulePlatformCommissionDto,
  SetCategoryCommissionDto,
  SetProjectCommissionOverrideDto,
  TerminateAgreementDto,
  UpdateFutureFeeSettingDto,
} from './dto/admin-finance.dto.js';

/**
 * Finance / commercial control APIs.
 * View: any ADMIN or SUPER_ADMIN.
 * Mutations for commission, investors, permissions: SUPER_ADMIN only.
 */
@Controller('admin/finance')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard)
export class AdminFinanceController {
  constructor(private readonly finance: AdminFinanceService) {}

  @Get('settings')
  getSettings() {
    return this.finance.getSettingsDashboard();
  }

  @Get('commission-settings')
  getCommissionSettings() {
    return this.finance.listPlatformCommissionHistory();
  }

  @Post('commission-settings/preview')
  preview(@Body() dto: CommissionPreviewDto) {
    return this.finance.preview(dto);
  }

  @Post('commission-settings/resolve-preview')
  resolvePreview(@Body() dto: ResolveCommissionPreviewDto) {
    return this.finance.resolvePreview(dto);
  }

  @Post('commission-settings')
  @RequireSuperAdmin()
  scheduleCommission(
    @CurrentUser() admin: AuthUser,
    @Body() dto: SchedulePlatformCommissionDto,
  ) {
    return this.finance.schedulePlatformCommission(admin.id, dto);
  }

  @Post('categories/:categoryId/commission')
  @RequireSuperAdmin()
  setCategoryCommission(
    @CurrentUser() admin: AuthUser,
    @Param('categoryId') categoryId: string,
    @Body() dto: SetCategoryCommissionDto,
  ) {
    return this.finance.setCategoryCommission(admin.id, categoryId, dto);
  }

  @Post('projects/:projectId/commission-override')
  @RequireSuperAdmin()
  setProjectOverride(
    @CurrentUser() admin: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: SetProjectCommissionOverrideDto,
  ) {
    return this.finance.setProjectOverride(admin.id, projectId, dto);
  }

  @Post('project-overrides/:id/end')
  @RequireSuperAdmin()
  endProjectOverride(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: EndProjectOverrideDto,
  ) {
    return this.finance.endProjectOverride(admin.id, id, dto.reason);
  }

  @Get('investors')
  listInvestors() {
    return this.finance.listInvestors();
  }

  @Get('investors/:id')
  getInvestor(@Param('id') id: string) {
    return this.finance.getInvestor(id);
  }

  @Get('investor-accruals')
  listInvestorAccruals() {
    return this.finance.listInvestorAccruals();
  }

  @Get('staff')
  listStaff() {
    return this.finance.listStaffAdmins();
  }

  @Post('investors')
  @RequireSuperAdmin()
  createInvestor(@CurrentUser() admin: AuthUser, @Body() dto: CreateInvestorDto) {
    return this.finance.createInvestor(admin.id, dto);
  }

  @Post('investment-agreements')
  @RequireSuperAdmin()
  createAgreement(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateInvestmentAgreementDto,
  ) {
    return this.finance.createInvestmentAgreement(admin.id, dto);
  }

  @Post('investment-agreements/:id/terminate')
  @RequireSuperAdmin()
  terminateAgreement(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: TerminateAgreementDto,
  ) {
    return this.finance.terminateAgreement(admin.id, id, dto);
  }

  @Post('permissions/grant')
  @RequireSuperAdmin()
  grantPermission(@CurrentUser() admin: AuthUser, @Body() dto: FinancePermissionDto) {
    return this.finance.grantFinancePermission(admin.id, dto.userId, dto.permission);
  }

  @Post('permissions/revoke')
  @RequireSuperAdmin()
  revokePermission(@CurrentUser() admin: AuthUser, @Body() dto: FinancePermissionDto) {
    return this.finance.revokeFinancePermission(admin.id, dto.userId, dto.permission);
  }

  @Patch('future-fees/:key')
  @RequireSuperAdmin()
  updateFutureFee(
    @CurrentUser() admin: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateFutureFeeSettingDto,
  ) {
    return this.finance.updateFutureFeeSetting(admin.id, key, dto);
  }
}
