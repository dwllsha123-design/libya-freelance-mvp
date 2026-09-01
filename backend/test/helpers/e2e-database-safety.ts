const PRODUCTION_HOST_PATTERNS = [
  'prod',
  'production',
  'railway.app',
  'amazonaws.com',
  'azure.com',
  'digitalocean.com',
  'supabase.co',
];

const SAFE_DATABASE_PATTERNS = ['test', '_test'];

export function assertSafeE2eDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('E2E aborted: DATABASE_URL is required.');
  }

  if (process.env.ALLOW_E2E_ON_DB === 'true') {
    console.warn('ALLOW_E2E_ON_DB=true — skipping database safety checks.');
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(databaseUrl.replace(/^postgresql:/, 'postgres:'));
  } catch {
    throw new Error('E2E aborted: DATABASE_URL is not a valid URL.');
  }

  const host = parsed.hostname.toLowerCase();
  const databaseName = parsed.pathname.replace(/^\//, '').split('?')[0].toLowerCase();

  if (PRODUCTION_HOST_PATTERNS.some((pattern) => host.includes(pattern))) {
    throw new Error(
      `E2E aborted: host "${host}" looks production-like. Use a local test database.`,
    );
  }

  const looksLikeTestDb = SAFE_DATABASE_PATTERNS.some((pattern) =>
    databaseName.includes(pattern),
  );

  if (!looksLikeTestDb) {
    throw new Error(
      `E2E aborted: database "${databaseName}" is not a recognized test database. ` +
        'Point DATABASE_URL to libya_freelance_test or set ALLOW_E2E_ON_DB=true explicitly.',
    );
  }
}
