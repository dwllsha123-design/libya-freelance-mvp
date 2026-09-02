import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, Role } from '@prisma/client';
import type { Request } from 'express';
import { ADMIN_PERMISSION_KEY } from '../decorators/admin-permission.decorator.js';
import type { AuthUser } from '../../auth/types/auth-user.type.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminPermission[]>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('غير مصرح');

    if (user.role === Role.SUPER_ADMIN) return true;

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('غير مصرح');
    }

    const permission = await this.prisma.userAdminPermission.findFirst({
      where: {
        userId: user.id,
        permission: { in: required },
      },
    });

    if (!permission) {
      throw new ForbiddenException('ليس لديك الصلاحية المطلوبة لهذا الإجراء');
    }

    return true;
  }
}
