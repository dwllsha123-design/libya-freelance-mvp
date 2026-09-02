import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { SUPER_ADMIN_ONLY_KEY } from '../decorators/super-admin.decorator.js';
import type { AuthUser } from '../../auth/types/auth-user.type.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('غير مصرح');

    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'هذا الإجراء متاح لمالك المنصة (SUPER_ADMIN) فقط',
      );
    }

    return true;
  }
}
