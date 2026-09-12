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
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequireAdminPermission } from '../common/decorators/admin-permission.decorator.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { NuqatiService } from './nuqati.service.js';
import {
  CreatePointsPackageDto,
  UpdatePointsPackageDto,
} from './dto/points-package.dto.js';

@Controller('admin/points-packages')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard, AdminPermissionGuard)
export class AdminPointsPackagesController {
  constructor(private readonly nuqati: NuqatiService) {}

  @Get()
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  list(@Query('includeInactive') includeInactive?: string) {
    return this.nuqati.adminListPackages(
      includeInactive === undefined ? true : includeInactive !== 'false',
    );
  }

  @Post()
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  create(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreatePointsPackageDto,
  ) {
    return this.nuqati.adminCreatePackage(admin.id, dto);
  }

  @Patch(':id')
  @RequireAdminPermission(AdminPermission.MANAGE_SUBSCRIPTIONS)
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePointsPackageDto,
  ) {
    return this.nuqati.adminUpdatePackage(admin.id, id, dto);
  }
}
