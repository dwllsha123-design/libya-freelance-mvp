import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { PRO_PLAN_CODE } from './subscriptions.constants.js';
import {
  CheckoutSubscriptionDto,
  CreateSubscriptionPlanDto,
  ExtendSubscriptionDto,
  GrantSubscriptionDto,
  LegacyProCheckoutDto,
  SubscriptionAdminReasonDto,
  UpdateSubscriptionPlanDto,
} from './dto/subscriptions.dto.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Public()
  @Get('plans')
  listActivePlans() {
    return this.subscriptions.listActivePlans();
  }

  /** @deprecated Prefer GET /subscriptions/plans — kept for Pro-only clients */
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

  @Post('checkout')
  @Roles(Role.FREELANCER)
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() body: CheckoutSubscriptionDto,
  ) {
    return this.subscriptions.checkout(user.id, {
      planCode: body.planCode,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  /** @deprecated Prefer POST /subscriptions/checkout with planCode PRO */
  @Post('pro/checkout')
  @Roles(Role.FREELANCER)
  checkoutPro(
    @CurrentUser() user: AuthUser,
    @Body() body: LegacyProCheckoutDto,
  ) {
    return this.subscriptions.checkout(user.id, {
      planCode: PRO_PLAN_CODE,
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

@Controller('admin/subscription-plans')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard, AdminPermissionGuard)
export class AdminSubscriptionPlansController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  list(@Query('includeInactive') includeInactive?: string) {
    return this.subscriptions.listPlansAdmin(
      includeInactive === undefined ? true : includeInactive !== 'false',
    );
  }

  @Post()
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  create(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptions.createPlan(admin.id, dto);
  }

  @Patch(':id')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptions.updatePlan(admin.id, id, dto);
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

  @Post('grant')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  grant(
    @CurrentUser() admin: AuthUser,
    @Body() dto: GrantSubscriptionDto,
  ) {
    return this.subscriptions.grantSubscription(admin.id, dto);
  }

  /**
   * Manually run expiry sweep. Enable scheduling only after go-live backfill
   * validation — do not cron this until trial dates are confirmed.
   */
  @Post('expire-due')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  expireDue() {
    return this.subscriptions.expireDueSubscriptions();
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
