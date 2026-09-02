import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, Role } from '@prisma/client';
import type { Request } from 'express';
import { FINANCE_WRITE_KEY } from '../decorators/finance-write.decorator.js';
import type { AuthUser } from '../../auth/types/auth-user.type.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Non-critical finance mutations for authorized ADMIN staff.
 * Accepts MANAGE_FINANCE or legacy FINANCE_WRITE.
 * Critical commission / investor agreement changes use SuperAdminGuard instead.
 */
@Injectable()
export class FinanceWriteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(FINANCE_WRITE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

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
        permission: {
          in: [AdminPermission.MANAGE_FINANCE, AdminPermission.FINANCE_WRITE],
        },
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        'ليس لديك صلاحية مالية — يتطلب SUPER_ADMIN أو MANAGE_FINANCE',
      );
    }

    return true;
  }
}
