/**
 * Disposable embedded PostgreSQL for local E2E when Docker is unavailable.
 * Matches docker-compose.test.yml credentials/port contract (5433 + *_test).
 * Forces UTF-8 so Arabic/emoji seed data works on Windows locales.
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Avoid Arabic/non-ASCII characters in the cluster path (breaks initdb --encoding=UTF8 on Windows).
const databaseDir = path.join(
  process.env.TEMP || process.env.TMP || 'C:\\Temp',
  'libya-freelance-e2e-pg',
);
const port = 5433;
const user = 'libya_freelance_test';
const password = 'libya_freelance_test';
const database = 'libya_freelance_test';

process.env.PGCLIENTENCODING = 'UTF8';

if (fs.existsSync(databaseDir)) {
  fs.rmSync(databaseDir, { recursive: true, force: true });
}

const pg = new EmbeddedPostgres({
  databaseDir,
  user,
  password,
  port,
  persistent: false,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (msg) => process.stdout.write(String(msg)),
  onError: (err) => console.error(err),
});

await pg.initialise();
await pg.start();

try {
  await pg.createDatabase(database);
  console.log(`\nDatabase ${database} ready`);
} catch (err) {
  const message = String(err?.message ?? err);
  if (!/already exists/i.test(message)) {
    throw err;
  }
  console.log(`\nDatabase ${database} already exists`);
}

const adminUrl = `postgresql://${user}:${password}@localhost:${port}/postgres?schema=public`;
const admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
try {
  await admin.$executeRawUnsafe(`ALTER DATABASE "${database}" SET client_encoding TO 'UTF8'`);
  await admin.$executeRawUnsafe(`ALTER DATABASE "${database}" SET lc_messages TO 'C'`);
} catch (err) {
  console.warn('Could not force DB encoding defaults:', err);
} finally {
  await admin.$disconnect();
}

const url = `postgresql://${user}:${password}@localhost:${port}/${database}?schema=public&options=-c%20client_encoding%3DUTF8`;
console.log(`Embedded E2E PostgreSQL ready: ${url}`);
console.log('Keep this process running while E2E executes.');

const stop = async () => {
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
