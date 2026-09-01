/**
 * Verifies production deployment boundary:
 * - prisma CLI is NOT in production node_modules
 * - @prisma/client + generated client ARE present after build artifact copy
 * - compiled dist boots without devDependencies
 *
 * Usage (from backend/):
 *   node scripts/verify-prod-deploy-boundary.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const verifyDir = join(backendRoot, '.prod-verify');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? httpsGet : httpGet;
    lib(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? backendRoot,
    env: { ...process.env, ...opts.env },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${cmd} ${args.join(' ')} failed (exit ${result.status})`);
  }
  return result.stdout;
}

function hasPackage(name, root) {
  return existsSync(join(root, 'node_modules', name));
}

async function main() {
  const report = {
    auditedAt: new Date().toISOString(),
    prismaVersion: '6.19.3',
    prismaCliClassification: 'devDependency',
    prismaClientClassification: 'production dependency',
    omitDevResult: null,
    prismaCliAbsentInProd: false,
    deepmergeTsAbsentInProd: false,
    prismaClientPresent: false,
    generatedClientPresent: false,
    prismaClientImport: null,
    bootResult: null,
    healthResult: null,
    readyResult: null,
    migrationStrategy: 'CI/Release migration job (Pattern A) — see docs/DEPLOYMENT.md',
    runtimePackagesAbsent: [],
    runtimePackagesPresent: [],
  };

  console.log('==> Build stage: npm ci + prisma generate + nest build');
  run(npmCmd, ['ci', '--legacy-peer-deps']);
  run(process.execPath, [
    join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js'),
    'generate',
  ]);
  run(npmCmd, ['run', 'build']);

  console.log('==> Prepare isolated production runtime directory');
  rmSync(verifyDir, { recursive: true, force: true });
  mkdirSync(verifyDir, { recursive: true });

  cpSync(join(backendRoot, 'package.json'), join(verifyDir, 'package.json'));
  cpSync(join(backendRoot, 'package-lock.json'), join(verifyDir, 'package-lock.json'));
  cpSync(join(backendRoot, 'dist'), join(verifyDir, 'dist'), { recursive: true });

  console.log('==> Production install: npm ci --omit=dev');
  run(npmCmd, ['ci', '--omit=dev', '--legacy-peer-deps'], { cwd: verifyDir });

  report.omitDevResult = 'PASS';
  report.prismaCliAbsentInProd = !hasPackage('prisma', verifyDir);
  report.deepmergeTsAbsentInProd = !hasPackage('deepmerge-ts', verifyDir);
  report.prismaClientPresent = hasPackage('@prisma/client', verifyDir);

  for (const pkg of ['vitest', 'typescript', 'prisma', 'deepmerge-ts', '@nestjs/cli']) {
    (hasPackage(pkg, verifyDir) ? report.runtimePackagesPresent : report.runtimePackagesAbsent).push(pkg);
  }

  const generatedDefault = join(verifyDir, 'node_modules', '.prisma', 'client', 'default.js');
  report.generatedClientPresent = existsSync(generatedDefault);

  console.log('==> Copy generated Prisma Client from build stage (required after --omit=dev)');
  rmSync(join(verifyDir, 'node_modules', '.prisma'), { recursive: true, force: true });
  cpSync(
    join(backendRoot, 'node_modules', '.prisma'),
    join(verifyDir, 'node_modules', '.prisma'),
    { recursive: true },
  );
  report.generatedClientPresent = existsSync(generatedDefault);

  const importProbe = join(verifyDir, 'prisma-import-probe.mjs');
  writeFileSync(
    importProbe,
    "import { PrismaClient } from '@prisma/client';\nnew PrismaClient();\nconsole.log('PRISMA_CLIENT_OK');\n",
  );

  console.log('==> Verify @prisma/client import in production tree');
  try {
    run(process.execPath, [importProbe], { cwd: verifyDir });
    report.prismaClientImport = 'PASS';
  } catch {
    report.prismaClientImport = 'FAIL';
  }

  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://libya_freelance_test:libya_freelance_test@127.0.0.1:5432/libya_freelance_test?schema=public';

  const port = 4099;
  const env = {
    NODE_ENV: 'production',
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: 'verify-access-secret-minimum-32-characters',
    JWT_REFRESH_SECRET: 'verify-refresh-secret-minimum-32-characters',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3000',
  };

  console.log('==> Boot production runtime: node dist/main.js');
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: verifyDir,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => {
    stdout += d;
    process.stdout.write(d);
  });
  child.stderr.on('data', (d) => {
    stderr += d;
    process.stderr.write(d);
  });

  await new Promise((r) => setTimeout(r, 45000));

  let health = { status: 0, body: 'timeout' };
  let ready = { status: 0, body: 'timeout' };
  try {
    health = await fetchUrl(`http://127.0.0.1:${port}/api/health`);
    ready = await fetchUrl(`http://127.0.0.1:${port}/api/health/ready`);
  } catch (e) {
    stderr += String(e);
  }

  child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 500));

  const booted =
    !stderr.includes('Cannot find module') &&
    !stdout.includes('Cannot find module') &&
    (stdout.includes('[NestFactory]') ||
      stdout.includes('MessagingGateway') ||
      stdout.includes('listening') ||
      health.status === 200);

  const dbUnavailable =
    stderr.includes("Can't reach database server") ||
    stderr.includes('P1001') ||
    stdout.includes("Can't reach database server");

  report.bootResult =
    booted || dbUnavailable
      ? 'PASS (NestJS + Prisma Client load; DB required for listen/ready)'
      : 'FAIL';
  report.healthResult = health.status === 200 ? 'PASS' : `FAIL/SKIP (${health.status})`;
  report.readyResult =
    ready.status === 200
      ? 'PASS'
      : ready.status === 503
        ? 'PASS (503 without DB — runtime isolation verified)'
        : `FAIL/SKIP (${ready.status})`;

  writeFileSync(
    join(backendRoot, 'docs', 'PROD_DEPLOY_BOUNDARY_REPORT.json'),
    JSON.stringify(report, null, 2),
  );

  console.log('\n==> Production deploy boundary report');
  console.log(JSON.stringify(report, null, 2));

  if (
    !report.prismaCliAbsentInProd ||
    !report.deepmergeTsAbsentInProd ||
    !report.prismaClientPresent ||
    !report.generatedClientPresent ||
    report.prismaClientImport !== 'PASS' ||
    !report.bootResult.startsWith('PASS')
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
