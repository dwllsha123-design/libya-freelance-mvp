import { SetMetadata } from '@nestjs/common';

export const SUPER_ADMIN_ONLY_KEY = 'superAdminOnly';

/** Critical commercial / permission mutations — SUPER_ADMIN (owner) only */
export const RequireSuperAdmin = () => SetMetadata(SUPER_ADMIN_ONLY_KEY, true);
