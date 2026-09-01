import { assertSafeE2eDatabase } from './e2e-database-safety.js';

/**
 * When true, E2E must connect to PostgreSQL — skipped tests are not allowed.
 */
export function isE2eRequired(): boolean {
  return (
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.CI === 'true' ||
    process.env.REQUIRE_E2E === '1'
  );
}

export function assertE2eEnvironmentReady(): void {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    if (isE2eRequired()) {
      throw new Error('E2E aborted: DATABASE_URL is required in CI.');
    }
    return;
  }

  if (isE2eRequired()) {
    assertSafeE2eDatabase();
  }
}

/**
 * Use at the start of each E2E test when dbReady is false.
 */
export function requireDatabase(
  ctx: { skip: () => void },
  dbReady: boolean,
): void {
  if (dbReady) {
    return;
  }

  if (isE2eRequired()) {
    throw new Error(
      'PostgreSQL is required but unavailable. E2E cannot be skipped in CI.',
    );
  }

  ctx.skip();
}
