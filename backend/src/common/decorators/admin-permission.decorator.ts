import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '@prisma/client';

export const ADMIN_PERMISSION_KEY = 'adminPermission';

/** ADMIN must hold the permission; SUPER_ADMIN always allowed */
export const RequireAdminPermission = (...permissions: AdminPermission[]) =>
  SetMetadata(ADMIN_PERMISSION_KEY, permissions);
