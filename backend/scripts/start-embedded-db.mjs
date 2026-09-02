import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, '..', 'data', 'embedded-pg');

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'libya_freelance',
  password: 'libya_freelance_dev',
  port: 5432,
  persistent: true,
  onLog: (msg) => process.stdout.write(String(msg)),
  onError: (err) => console.error(err),
});

await pg.initialise();
await pg.start();

try {
  await pg.createDatabase('libya_freelance');
  console.log('\nDatabase libya_freelance ready');
} catch (err) {
  const message = String(err?.message ?? err);
  if (/already exists/i.test(message)) {
    console.log('\nDatabase libya_freelance already exists');
  } else {
    throw err;
  }
}

console.log('Embedded PostgreSQL listening on localhost:5432');
console.log('Keep this process running while developing.');

process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pg.stop();
  process.exit(0);
});
