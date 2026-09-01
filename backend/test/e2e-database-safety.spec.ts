import { describe, expect, it } from 'vitest';
import { assertSafeE2eDatabase } from './helpers/e2e-database-safety.js';

describe('E2E database safety', () => {
  it('allows test database names', () => {
    process.env.ALLOW_E2E_ON_DB = undefined;
    process.env.DATABASE_URL =
      'postgresql://libya_freelance_test:libya_freelance_test@localhost:5433/libya_freelance_test?schema=public';

    expect(() => assertSafeE2eDatabase()).not.toThrow();
  });

  it('blocks production-like database without override', () => {
    process.env.ALLOW_E2E_ON_DB = undefined;
    process.env.DATABASE_URL =
      'postgresql://user:pass@prod-db.railway.app:5432/libya_freelance?schema=public';

    expect(() => assertSafeE2eDatabase()).toThrow(/production-like|test database/i);
  });

  it('allows override when ALLOW_E2E_ON_DB=true', () => {
    process.env.ALLOW_E2E_ON_DB = 'true';
    process.env.DATABASE_URL =
      'postgresql://user:pass@localhost:5432/libya_freelance?schema=public';

    expect(() => assertSafeE2eDatabase()).not.toThrow();
    delete process.env.ALLOW_E2E_ON_DB;
  });
});
