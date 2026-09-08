/**
 * One-time / idempotent SUPER_ADMIN bootstrap.
 *
 *   INITIAL_SUPER_ADMIN_PASSWORD='...' npm run admin:bootstrap
 *
 * Optional password reset for existing account:
 *   INITIAL_SUPER_ADMIN_FORCE_PASSWORD=true INITIAL_SUPER_ADMIN_PASSWORD='...' npm run admin:bootstrap
 *
 * Never prints the raw password. Never hard-codes a production password.
 */
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const BOOTSTRAP_EMAIL = 'admin@libyanfreelance.ly';
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function assertPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('INITIAL_SUPER_ADMIN_PASSWORD must be at least 8 characters');
  }
  if (!PASSWORD_COMPLEXITY.test(password)) {
    throw new Error(
      'INITIAL_SUPER_ADMIN_PASSWORD must include uppercase, lowercase, and a number',
    );
  }
}

function decideBootstrapAction(existing, { hasPasswordEnv, forcePassword }) {
  if (!existing) {
    return hasPasswordEnv ? 'create' : 'needs-password-env';
  }
  const isSuper =
    existing.role === 'SUPER_ADMIN' &&
    existing.status === 'ACTIVE' &&
    existing.emailVerified === true;
  if (forcePassword) {
    return hasPasswordEnv ? 'force-password' : 'needs-password-env';
  }
  if (isSuper) {
    return 'noop-ready';
  }
  return 'upgrade-role';
}

const prisma = new PrismaClient();
const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD ?? '';
const forcePassword =
  process.env.INITIAL_SUPER_ADMIN_FORCE_PASSWORD === 'true' ||
  process.argv.includes('--force-password');
const hasPasswordEnv = Boolean(password);

try {
  const existing = await prisma.user.findUnique({
    where: { email: BOOTSTRAP_EMAIL },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  const action = decideBootstrapAction(existing, {
    hasPasswordEnv,
    forcePassword,
  });

  if (action === 'needs-password-env') {
    fail(
      'INITIAL_SUPER_ADMIN_PASSWORD is required to create or force-reset the bootstrap admin',
    );
  } else if (action === 'noop-ready') {
    ok(
      `SUPER_ADMIN already ready (${BOOTSTRAP_EMAIL}). Password unchanged. Set INITIAL_SUPER_ADMIN_FORCE_PASSWORD=true to reset.`,
    );
  } else {
    assertPassword(password);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    if (action === 'create') {
      const username = `admin-${Date.now().toString(36)}`;
      const user = await prisma.user.create({
        data: {
          email: BOOTSTRAP_EMAIL,
          passwordHash,
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          mustChangePassword: false,
          profile: {
            create: {
              firstName: 'Admin',
              lastName: 'Libyan Freelance',
              username,
            },
          },
        },
        select: { id: true, email: true, role: true },
      });
      ok(`Created SUPER_ADMIN ${user.email} (${user.id})`);
    } else if (action === 'upgrade-role') {
      const user = await prisma.user.update({
        where: { email: BOOTSTRAP_EMAIL },
        data: {
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
        select: { id: true, email: true, role: true },
      });
      ok(
        `Upgraded ${user.email} to SUPER_ADMIN (${user.id}). Password was NOT changed.`,
      );
    } else if (action === 'force-password') {
      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { email: BOOTSTRAP_EMAIL },
          data: {
            passwordHash,
            role: Role.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            mustChangePassword: false,
          },
          select: { id: true, email: true, role: true },
        });
        await tx.refreshToken.deleteMany({ where: { userId: updated.id } });
        return updated;
      });
      ok(
        `Updated SUPER_ADMIN ${user.email} (${user.id}); password reset and sessions revoked.`,
      );
    }
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
} finally {
  await prisma.$disconnect();
}
