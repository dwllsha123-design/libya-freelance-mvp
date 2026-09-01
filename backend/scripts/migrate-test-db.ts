import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  'postgresql://libya_freelance_test:libya_freelance_test@localhost:5433/libya_freelance_test?schema=public';

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
});
