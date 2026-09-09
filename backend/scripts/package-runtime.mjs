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

console.log('==> Copy generated Prisma Client (deterministic, always)');
rmSync(join(bundleDir, 'node_modules', '.prisma'), { recursive: true, force: true });
cpSync(
  join(backendRoot, 'node_modules', '.prisma'),
  join(bundleDir, 'node_modules', '.prisma'),
  { recursive: true },
);

// Prisma 6 installs `prisma` / `@prisma/config` / `deepmerge-ts` / `typescript`
// as transitive peers of `@prisma/client` even with --omit=dev. Only fail on
// tools that must never ship in the runtime image.
const forbidden = ['vitest', '@nestjs/cli', '@nestjs/schematics', 'oxlint', 'prettier'];
const leaked = forbidden.filter((pkg) =>
  existsSync(join(bundleDir, 'node_modules', pkg)),
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

const prismaTransitive = ['prisma', 'deepmerge-ts', '@prisma/config', 'typescript'].filter(
  (pkg) => existsSync(join(bundleDir, 'node_modules', pkg)),
);

writeFileSync(
  join(bundleDir, 'RUNTIME_MANIFEST.json'),
  JSON.stringify(
    {
      packagedAt: new Date().toISOString(),
      nodeStartCommand: 'node dist/main.js',
      prismaClientCopiedFrom: 'build-stage node_modules/.prisma',
      forbiddenDevPackagesExcluded: forbidden.filter(
        (pkg) => !existsSync(join(bundleDir, 'node_modules', pkg)),
      ),
      prismaTransitivePresent: prismaTransitive,
      prismaCliInBundle: existsSync(join(bundleDir, 'node_modules', 'prisma')),
    },
    null,
    2,
  ),
);

console.log('==> Runtime bundle ready:', bundleDir);
console.log('    Start: cd .runtime-bundle && node dist/main.js');
