/**
 * Verifies production deployment boundary:
 * - prisma CLI / migration tooling are NOT required in the API runtime image
 * - @prisma/client + generated client ARE present after build artifact copy
 * - compiled dist boots with NODE_ENV=production and STORAGE_DRIVER=s3
 *   using CI-safe non-secret S3 config (S3 client is constructed at boot; no live S3 required)
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

/** Optional peers of @prisma/client that are migration/tooling-only for our API. */
const MIGRATION_ONLY_OPTIONAL_PEERS = [
  'prisma',
  'typescript',
  'deepmerge-ts',
  '@prisma/config',
];

const PACKAGE_CLASSIFICATIONS = {
  '@prisma/client': 'runtime-required',
  prisma: 'build-only/dev-only (optional peer of @prisma/client; migrations use build/migrate image)',
  typescript: 'build-only/dev-only (optional peer of @prisma/client; not used by node dist/main.js)',
  'deepmerge-ts': 'transitive (prisma → @prisma/config); migration tooling only',
  '@prisma/config': 'transitive (prisma); migration tooling only',
  vitest: 'build-only/dev-only',
  '@nestjs/cli': 'build-only/dev-only',
};

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
  // On Windows, only use shell for npm.cmd/.bat — shell+unquoted paths break
  // "C:\Program Files\nodejs\node.exe".
  const useShell =
    process.platform === 'win32' &&
    (cmd.endsWith('.cmd') || cmd.endsWith('.bat') || cmd === 'npm' || cmd === npmCmd);
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? backendRoot,
    env: { ...process.env, ...opts.env },
    encoding: 'utf8',
    shell: useShell,
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${cmd} ${args.join(' ')} failed (exit ${result.status})`);
  }
  return result.stdout;
}

function hasPackage(name, root) {
  return existsSync(join(root, 'node_modules', ...name.split('/')));
}

/** Remove migration-only optional peers so the API runtime matches Dockerfile intent. */
function pruneMigrationOnlyOptionalPeers(root) {
  const pruned = [];
  for (const name of MIGRATION_ONLY_OPTIONAL_PEERS) {
    const target = join(root, 'node_modules', ...name.split('/'));
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
      pruned.push(name);
    }
  }
  return pruned;
}

function combinedOutput(stdout, stderr) {
  return `${stdout}\n${stderr}`;
}

function detectBootstrapFailure(stdout, stderr, exitCode) {
  const text = combinedOutput(stdout, stderr);
  const patterns = [
    /\[ExceptionHandler\]/,
    /Error: Production requires STORAGE_DRIVER=s3/,
    /S3 storage configuration incomplete/,
    /Cannot find module/,
    /ERR_MODULE_NOT_FOUND/,
  ];
  if (patterns.some((re) => re.test(text))) {
    return true;
  }
  // Process exited before listen without an explicit Nest success marker.
  if (exitCode !== null && exitCode !== 0) {
    return true;
  }
  return false;
}

function detectSuccessfulBootstrap(stdout, stderr, healthStatus) {
  const text = combinedOutput(stdout, stderr);
  return (
    /Nest application successfully started/.test(text) ||
    /successfully started/.test(text) ||
    healthStatus === 200
  );
}

async function main() {
  const report = {
    auditedAt: new Date().toISOString(),
    prismaVersion: '6.19.3',
    migrationStrategy:
      'Dedicated migrate image/stage (docker-compose migrate profile / Dockerfile build stage) — Prisma CLI must not be required in API runtime',
    packageClassifications: PACKAGE_CLASSIFICATIONS,
    omitDevResult: null,
    optionalPeersBeforePrune: [],
    optionalPeersPruned: [],
    prismaCliAbsentInProd: false,
    deepmergeTsAbsentInProd: false,
    typescriptAbsentInProd: false,
    prismaClientPresent: false,
    generatedClientPresent: false,
    prismaClientImport: null,
    bootResult: null,
    bootDetail: null,
    healthResult: null,
    readyResult: null,
    runtimePackagesAbsent: [],
    runtimePackagesPresent: [],
    passCriteria: {
      omitDevInstall: 'PASS',
      prismaCliAbsentAfterPrune: true,
      deepmergeTsAbsentAfterPrune: true,
      typescriptAbsentAfterPrune: true,
      prismaClientPresent: true,
      generatedClientPresent: true,
      prismaClientImport: 'PASS',
      bootResult: 'PASS',
    },
    overall: null,
  };

  console.log('==> Build stage: prisma generate + nest build');
  // CI already runs `npm ci` before this script. Re-running it here can lock
  // native Prisma engines on Windows and doubles install time unnecessarily.
  if (!existsSync(join(backendRoot, 'node_modules', '@nestjs', 'core'))) {
    console.log('==> node_modules missing — running npm ci for build stage');
    run(npmCmd, ['ci', '--legacy-peer-deps']);
  } else {
    console.log('==> Reusing existing backend node_modules for build stage');
  }

  const prismaCli = join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');
  if (!existsSync(prismaCli)) {
    throw new Error(
      'Prisma CLI missing from node_modules (devDependency). Run: npm ci --legacy-peer-deps',
    );
  }
  // shell:false — process.execPath may contain spaces on Windows ("Program Files")
  run(process.execPath, [prismaCli, 'generate']);
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

  report.optionalPeersBeforePrune = MIGRATION_ONLY_OPTIONAL_PEERS.filter((pkg) =>
    hasPackage(pkg, verifyDir),
  );
  console.log(
    '==> Optional migration peers present after omit=dev:',
    report.optionalPeersBeforePrune.length
      ? report.optionalPeersBeforePrune.join(', ')
      : '(none)',
  );

  report.optionalPeersPruned = pruneMigrationOnlyOptionalPeers(verifyDir);
  if (report.optionalPeersPruned.length) {
    console.log('==> Pruned migration-only optional peers:', report.optionalPeersPruned.join(', '));
  }

  report.prismaCliAbsentInProd = !hasPackage('prisma', verifyDir);
  report.deepmergeTsAbsentInProd = !hasPackage('deepmerge-ts', verifyDir);
  report.typescriptAbsentInProd = !hasPackage('typescript', verifyDir);
  report.prismaClientPresent = hasPackage('@prisma/client', verifyDir);

  for (const pkg of ['vitest', 'typescript', 'prisma', 'deepmerge-ts', '@nestjs/cli']) {
    (hasPackage(pkg, verifyDir) ? report.runtimePackagesPresent : report.runtimePackagesAbsent).push(
      pkg,
    );
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
  // CI-safe dummy S3 config: S3StorageService constructs the client at boot and does
  // not require a live S3 connection until upload/delete. Guard remains STORAGE_DRIVER=s3.
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
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
    S3_REGION: process.env.S3_REGION || 'us-east-1',
    S3_BUCKET: process.env.S3_BUCKET || 'ci-boundary-bucket',
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || 'ci-boundary-access-key',
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || 'ci-boundary-secret-key',
    S3_PUBLIC_BASE_URL:
      process.env.S3_PUBLIC_BASE_URL || 'http://127.0.0.1:9000/ci-boundary-bucket',
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE || 'true',
    PAYMENT_DRIVER: process.env.PAYMENT_DRIVER || 'simulated',
    PAYMENT_CURRENCY: process.env.PAYMENT_CURRENCY || 'LYD',
    SMTP_HOST: process.env.SMTP_HOST || '127.0.0.1',
    SMTP_PORT: process.env.SMTP_PORT || '1025',
    SMTP_USER: process.env.SMTP_USER || 'ci-boundary-smtp-user',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || 'ci-boundary-smtp-password',
    EMAIL_FROM: process.env.EMAIL_FROM || 'ci-boundary@libyafreelance.local',
  };

  console.log('==> Boot production runtime: node dist/main.js (STORAGE_DRIVER=s3, CI dummy S3)');
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: verifyDir,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let exitCode = null;
  child.stdout.on('data', (d) => {
    stdout += d;
    process.stdout.write(d);
  });
  child.stderr.on('data', (d) => {
    stderr += d;
    process.stderr.write(d);
  });
  child.on('exit', (code) => {
    exitCode = code;
  });

  // Poll for successful Nest listen or bootstrap failure (max ~45s).
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (detectBootstrapFailure(stdout, stderr, exitCode)) break;
    if (detectSuccessfulBootstrap(stdout, stderr, 0)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  let health = { status: 0, body: 'not-checked' };
  let ready = { status: 0, body: 'not-checked' };
  const bootstrapFailed = detectBootstrapFailure(stdout, stderr, exitCode);
  if (!bootstrapFailed) {
    try {
      health = await fetchUrl(`http://127.0.0.1:${port}/api/health`);
      ready = await fetchUrl(`http://127.0.0.1:${port}/api/health/ready`);
    } catch (e) {
      stderr += String(e);
    }
  }

  if (!child.killed) {
    child.kill('SIGTERM');
  }
  await new Promise((r) => setTimeout(r, 500));

  const nestBooted = detectSuccessfulBootstrap(stdout, stderr, health.status);
  if (bootstrapFailed) {
    report.bootResult = 'FAIL';
    report.bootDetail =
      'Nest bootstrap failed (configuration/ExceptionHandler). Not a successful production boot.';
  } else if (nestBooted) {
    report.bootResult = 'PASS';
    report.bootDetail = 'NestJS application initialized successfully with STORAGE_DRIVER=s3.';
  } else {
    report.bootResult = 'FAIL';
    report.bootDetail =
      'Nest did not reach a successful bootstrap marker and health did not return 200.';
  }

  report.healthResult =
    health.status === 200
      ? 'PASS'
      : bootstrapFailed
        ? 'SKIP (bootstrap failed)'
        : `FAIL/SKIP (${health.status})`;
  report.readyResult =
    ready.status === 200
      ? 'PASS'
      : ready.status === 503
        ? 'PASS (503 — readiness requires DB; isolation still valid)'
        : bootstrapFailed
          ? 'SKIP (bootstrap failed)'
          : `FAIL/SKIP (${ready.status})`;

  const criteriaOk =
    report.omitDevResult === 'PASS' &&
    report.prismaCliAbsentInProd === true &&
    report.deepmergeTsAbsentInProd === true &&
    report.typescriptAbsentInProd === true &&
    report.prismaClientPresent === true &&
    report.generatedClientPresent === true &&
    report.prismaClientImport === 'PASS' &&
    report.bootResult === 'PASS';

  report.overall = criteriaOk ? 'PASS' : 'FAIL';

  writeFileSync(
    join(backendRoot, 'docs', 'PROD_DEPLOY_BOUNDARY_REPORT.json'),
    JSON.stringify(report, null, 2),
  );

  console.log('\n==> Production deploy boundary report');
  console.log(JSON.stringify(report, null, 2));

  if (!criteriaOk) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
