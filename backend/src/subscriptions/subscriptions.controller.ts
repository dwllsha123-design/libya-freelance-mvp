import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminPermission, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequireAdminPermission } from '../common/decorators/admin-permission.decorator.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { SubscriptionsService } from './subscriptions.service.js';
import {
  ExtendSubscriptionDto,
  SubscriptionAdminReasonDto,
} from './dto/subscriptions.dto.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Public()
  @Get('plans/pro')
  getProPlan() {
    return this.subscriptions.getProPlan();
  }

  @Get('me')
  @Roles(Role.FREELANCER)
  getMine(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getMine(user.id);
  }

  @Post('pro/checkout')
  @Roles(Role.FREELANCER)
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() body: { returnUrl?: string; cancelUrl?: string },
  ) {
    return this.subscriptions.checkout(user.id, {
      returnUrl: body?.returnUrl,
      cancelUrl: body?.cancelUrl,
    });
  }

  @Post('pro/page-view')
  @Roles(Role.FREELANCER)
  pageView(@CurrentUser() user: AuthUser) {
    return this.subscriptions.trackPageView(user.id);
  }

  @Get('pro/analytics')
  @Roles(Role.FREELANCER)
  analytics(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getProAnalytics(user.id);
  }
}

@Controller('admin/subscriptions')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard, AdminPermissionGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.subscriptions.adminList({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
    });
  }

  @Get(':id')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  getOne(@Param('id') id: string) {
    return this.subscriptions.adminGet(id);
  }

  @Post(':id/extend')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  extend(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExtendSubscriptionDto,
  ) {
    return this.subscriptions.adminExtend(admin.id, id, dto);
  }

  @Post(':id/suspend')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  suspend(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubscriptionAdminReasonDto,
  ) {
    return this.subscriptions.adminSuspend(admin.id, id, dto);
  }

  @Post(':id/cancel')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  cancel(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubscriptionAdminReasonDto,
  ) {
    return this.subscriptions.adminCancel(admin.id, id, dto);
  }
}
