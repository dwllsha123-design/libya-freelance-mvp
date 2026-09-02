import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthUser } from '../../auth/types/auth-user.type.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('غير مصرح');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('تم تعليق حسابك');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('تم حظر حسابك');
    }

    if (!requiredRoles.includes(user.role)) {
      // SUPER_ADMIN inherits all ADMIN panel access
      const adminSatisfied =
        user.role === Role.SUPER_ADMIN &&
        requiredRoles.includes(Role.ADMIN);
      if (!adminSatisfied) {
        throw new ForbiddenException('ليس لديك صلاحية للوصول');
      }
    }

    return true;
  }
}
