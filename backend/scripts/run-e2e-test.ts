import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://libya_freelance_test:libya_freelance_test@localhost:5433/libya_freelance_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;

execSync('npx vitest run --config ./vitest.config.e2e.ts', {
  stdio: 'inherit',
  env: process.env,
});
