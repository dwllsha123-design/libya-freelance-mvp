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
import { assertCommercialProjectFinanceWritable } from '../commercial/commercial-project-finance-freeze.js';
import { AdminFinanceService } from './admin-finance.service.js';
import {
  CommissionPreviewDto,
  FinancePermissionDto,
  ResolveCommissionPreviewDto,
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
  scheduleCommission() {
    assertCommercialProjectFinanceWritable();
  }

  @Post('categories/:categoryId/commission')
  @RequireSuperAdmin()
  setCategoryCommission() {
    assertCommercialProjectFinanceWritable();
  }

  @Post('projects/:projectId/commission-override')
  @RequireSuperAdmin()
  setProjectOverride() {
    assertCommercialProjectFinanceWritable();
  }

  @Post('project-overrides/:id/end')
  @RequireSuperAdmin()
  endProjectOverride() {
    assertCommercialProjectFinanceWritable();
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
  createInvestor() {
    assertCommercialProjectFinanceWritable();
  }

  @Post('investment-agreements')
  @RequireSuperAdmin()
  createAgreement() {
    assertCommercialProjectFinanceWritable();
  }

  @Post('investment-agreements/:id/terminate')
  @RequireSuperAdmin()
  terminateAgreement() {
    assertCommercialProjectFinanceWritable();
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
  updateFutureFee() {
    assertCommercialProjectFinanceWritable();
  }
}
