/**
 * Pure helpers for SUPER_ADMIN bootstrap (unit-tested).
 * Keep behavior aligned with prisma/scripts/bootstrap-super-admin.mjs
 */

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'admin@libyanfreelance.ly';

export type BootstrapExistingUser = {
  role: string;
  status: string;
  emailVerified: boolean;
} | null;

export type BootstrapAction =
  | 'create'
  | 'upgrade-role'
  | 'noop-ready'
  | 'needs-password-env'
  | 'force-password';

export function decideBootstrapAction(
  existing: BootstrapExistingUser,
  options: { hasPasswordEnv: boolean; forcePassword: boolean },
): BootstrapAction {
  if (!existing) {
    return options.hasPasswordEnv ? 'create' : 'needs-password-env';
  }

  const isSuper =
    existing.role === 'SUPER_ADMIN' &&
    existing.status === 'ACTIVE' &&
    existing.emailVerified === true;

  if (options.forcePassword) {
    return options.hasPasswordEnv ? 'force-password' : 'needs-password-env';
  }

  if (isSuper) {
    return 'noop-ready';
  }

  return 'upgrade-role';
}
