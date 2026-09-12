import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminPermission, PaymentPurpose, PaymentStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequireAdminPermission } from '../common/decorators/admin-permission.decorator.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import { PaymentService } from './payment.service.js';

@Controller('admin/payments')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard, AdminPermissionGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @Get()
  @RequireAdminPermission(
    AdminPermission.FINANCE_VIEW,
    AdminPermission.VIEW_FINANCE,
    AdminPermission.MANAGE_FINANCE,
  )
  list(
    @Query('purpose') purpose?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.payments.adminListCommercialPayments({
      purpose: purpose as PaymentPurpose | undefined,
      status: status as PaymentStatus | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
    });
  }
}
