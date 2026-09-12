import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  CheckoutPointsPackageDto,
  resolvePackageIdentifier,
} from './dto/checkout-points-package.dto.js';
import { NuqatiService } from './nuqati.service.js';

@Controller('nuqati')
@Roles(Role.FREELANCER)
export class NuqatiController {
  constructor(private readonly nuqatiService: NuqatiService) {}

  @Get('me')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.nuqatiService.getDashboard(user.id, user.role);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: AuthUser) {
    return this.nuqatiService.getBalance(user.id);
  }

  @Get('transactions')
  listTransactions(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.nuqatiService.listTransactions(user.id, user.role, {
      type,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('checkout')
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() body: CheckoutPointsPackageDto,
  ) {
    const packageKey = resolvePackageIdentifier(body);
    if (!packageKey) {
      throw new BadRequestException({
        code: 'PACKAGE_IDENTIFIER_REQUIRED',
        message: 'packageId or packageCode is required',
      });
    }
    return this.nuqatiService.initiatePurchaseCheckout(
      user.id,
      user.role,
      packageKey,
    );
  }

  /** @deprecated Prefer POST /nuqati/checkout */
  @Post('purchase')
  purchase(
    @CurrentUser() user: AuthUser,
    @Body() body: CheckoutPointsPackageDto,
  ) {
    const packageKey = resolvePackageIdentifier(body);
    if (!packageKey) {
      throw new BadRequestException({
        code: 'PACKAGE_IDENTIFIER_REQUIRED',
        message: 'packageId or packageCode is required',
      });
    }
    return this.nuqatiService.initiatePurchaseCheckout(
      user.id,
      user.role,
      packageKey,
    );
  }

  @Post('social-share')
  socialShare(
    @CurrentUser() user: AuthUser,
    @Body() body: { postUrl: string },
  ) {
    return this.nuqatiService.submitSocialShare(user.id, user.role, body.postUrl);
  }
}
