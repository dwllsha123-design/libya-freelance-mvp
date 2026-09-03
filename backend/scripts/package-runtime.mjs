/**
 * Packages a production runtime bundle with generated Prisma Client artifacts.
 * Removes manual copy steps — always copies node_modules/.prisma from build tree.
 *
 * Prerequisites (build/migrate stage):
 *   npm ci --legacy-peer-deps
 *   node node_modules/prisma/build/index.js generate
 *   npm run build
 *
 * Output: backend/.runtime-bundle/ ready for `node dist/main.js`
 *
 * Usage: node scripts/package-runtime.mjs
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const bundleDir = join(backendRoot, '.runtime-bundle');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? backendRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${cmd} ${args.join(' ')} failed`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const distDir = join(backendRoot, 'dist', 'main.js');
const prismaGenerated = join(backendRoot, 'node_modules', '.prisma', 'client', 'index.js');

assert(existsSync(distDir), 'Missing dist/main.js — run npm run build first');
assert(
  existsSync(prismaGenerated),
  'Missing generated Prisma Client — run prisma generate in build stage first',
);

console.log('==> Creating runtime bundle at .runtime-bundle/');
rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

cpSync(join(backendRoot, 'package.json'), join(bundleDir, 'package.json'));
cpSync(join(backendRoot, 'package-lock.json'), join(bundleDir, 'package-lock.json'));
cpSync(join(backendRoot, 'dist'), join(bundleDir, 'dist'), { recursive: true });

console.log('==> npm ci --omit=dev (production dependencies only)');
run(npmCmd, ['ci', '--omit=dev', '--legacy-peer-deps'], { cwd: bundleDir });

// @prisma/client declares optional peers (prisma, typescript). Some npm versions
// materialize them under --omit=dev. API runtime only needs @prisma/client +
// generated .prisma; migrations use the dedicated migrate/build image.
const migrationOnlyOptionalPeers = [
  'prisma',
  'typescript',
  'deepmerge-ts',
  '@prisma/config',
];
for (const pkg of migrationOnlyOptionalPeers) {
  const target = join(bundleDir, 'node_modules', ...pkg.split('/'));
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`==> Pruned migration-only optional peer: ${pkg}`);
  }
}

console.log('==> Copy generated Prisma Client (deterministic, always)');
rmSync(join(bundleDir, 'node_modules', '.prisma'), { recursive: true, force: true });
cpSync(
  join(backendRoot, 'node_modules', '.prisma'),
  join(bundleDir, 'node_modules', '.prisma'),
  { recursive: true },
);

const forbidden = ['prisma', 'deepmerge-ts', '@prisma/config', 'vitest', 'typescript'];
const leaked = forbidden.filter((pkg) =>
  existsSync(join(bundleDir, 'node_modules', ...pkg.split('/'))),
);
assert(leaked.length === 0, `Dev packages leaked into bundle: ${leaked.join(', ')}`);
assert(
  existsSync(join(bundleDir, 'node_modules', '@prisma/client')),
  '@prisma/client missing from bundle',
);
assert(
  existsSync(join(bundleDir, 'node_modules', '.prisma', 'client', 'index.js')),
  'Generated .prisma client missing from bundle',
);

writeFileSync(
  join(bundleDir, 'RUNTIME_MANIFEST.json'),
  JSON.stringify(
    {
      packagedAt: new Date().toISOString(),
      nodeStartCommand: 'node dist/main.js',
      prismaClientCopiedFrom: 'build-stage node_modules/.prisma',
      migrationStrategy: 'dedicated migrate/build image — Prisma CLI not in API runtime',
      prunedOptionalPeers: migrationOnlyOptionalPeers,
      devPackagesExcluded: forbidden.filter(
        (pkg) => !existsSync(join(bundleDir, 'node_modules', ...pkg.split('/'))),
      ),
      prismaCliInBundle: existsSync(join(bundleDir, 'node_modules', 'prisma')),
    },
    null,
    2,
  ),
);

console.log('==> Runtime bundle ready:', bundleDir);
console.log('    Start: cd .runtime-bundle && node dist/main.js');
