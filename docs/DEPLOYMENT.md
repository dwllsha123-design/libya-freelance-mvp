# Deployment Guide — Libya Freelance MVP

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (static/SSR) |
| Backend | NestJS API + Socket.IO |
| Database | Managed PostgreSQL |
| Storage | S3-compatible (R2, Spaces, S3) — **not local disk in production** |
| HTTPS | Mandatory |

## Environment variables

### Backend (required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ≥ 32 random characters |
| `JWT_REFRESH_SECRET` | ≥ 32 random characters (different from access) |
| `FRONTEND_URL` | Public frontend origin |
| `CORS_ORIGINS` | Comma-separated allowed origins (no `*`) |
| `NODE_ENV` | `production` |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base (e.g. `https://api.example.com/api`) |

### Cookie / CORS topology

If frontend and API share a parent domain:

- `app.libyafreelance.ly` + `api.libyafreelance.ly`
- Set `CORS_ORIGINS=https://app.libyafreelance.ly`
- Refresh cookie: `secure=true`, `sameSite=strict`, `path=/api/auth`

Cross-subdomain cookie issues may require `sameSite=lax` — test login/refresh in staging.

## Database migrations (production)

Migrations run in a **separate CI/release job** (Pattern A), not inside the production API runtime.

### Pattern A — CI / release migration job (selected for this project)

GitHub Actions CI implements this pattern. For non-Docker hosts, use the **runtime packager** (deterministic `.prisma` copy):

1. **Migration job** (full dev + build dependencies):
   ```bash
   cd backend
   npm ci --legacy-peer-deps          # lockfile-pinned; never npm install
   node node_modules/prisma/build/index.js validate
   node node_modules/prisma/build/index.js generate
   node node_modules/prisma/build/index.js migrate deploy   # staging/production DATABASE_URL
   node node_modules/prisma/build/index.js migrate status
   npm run prisma:seed                # reference data only; never prisma:seed:demo in production
   npm run build
   ```
2. **Runtime bundle** (automated — no manual copy):
   ```bash
   cd backend
   npm run package:runtime            # creates .runtime-bundle/ with dist + .prisma + prod deps
   cd .runtime-bundle && node dist/main.js
   ```

CI reference: `.github/workflows/ci.yml` — migrations, E2E, `verify:prod-boundary`, `package:runtime`.

### Pattern B — multi-stage Docker

Dockerfiles are checked in:

| Image | File |
|-------|------|
| Backend runtime | `backend/Dockerfile` (target `runtime`) |
| Backend build/migrate | `backend/Dockerfile` (target `build`) |
| Frontend | `frontend/Dockerfile` |

Local staging reference: `docker-compose.staging.yml` (PostgreSQL + API + web; run `migrate` profile for deploy/seed).

```bash
# Build backend runtime image (Prisma client copied in Dockerfile — deterministic)
docker build -f backend/Dockerfile --target runtime -t libya-freelance-api ./backend

# Migrations (separate job / compose profile — NOT in runtime container)
docker compose -f docker-compose.staging.yml --profile tools run --rm migrate
```

## Build & start

```bash
# Build stage (CI or release)
cd backend && npm ci --legacy-peer-deps
node node_modules/prisma/build/index.js generate
npm run build

# Runtime (automated bundle — recommended)
npm run package:runtime
cd .runtime-bundle && node dist/main.js

# Frontend
cd frontend && npm ci && npm run build && npm run start
```

**Never** use `prisma migrate dev` or `prisma db push` against production/staging databases.

**Never** run `prisma:seed:demo` when `NODE_ENV=production`.

Verify: `npm run verify:prod-boundary` and `npm run package:runtime`

Use **`npm ci`** (not `npm install`) in all deploy pipelines to preserve the lockfile.

Do **not** run `npm audit fix --force` during deployment.

## Health checks

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready` (includes DB connectivity)

## Staging URLs (target)

| Service | URL | Status |
|---------|-----|--------|
| Frontend | `https://staging.libyafreelance.ly` | **NOT DEPLOYED** — no hosting/DNS/credentials in repo |
| API | `https://api-staging.libyafreelance.ly` | **NOT DEPLOYED** |

Reference stack: `docker-compose.staging.yml`

## Storage

**Implementation:** `StorageService` abstraction with `local` (development) and `s3` (staging/production) drivers.

| Driver | When |
|--------|------|
| `STORAGE_DRIVER=local` | Development / E2E with test storage |
| `STORAGE_DRIVER=s3` | **Required** when `NODE_ENV=production` |

Full documentation: `backend/docs/STORAGE.md`

Staging checklist: `docs/STAGING_DEPLOY.md`

**Beta requirement:** persistent S3-compatible storage configured and verified on staging (upload → redeploy → image still loads).

## Rate limiting

Current limiter is **in-memory** (single instance). Multi-instance deployments need Redis-backed rate limiting.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml` — runs migrations, unit tests, E2E, and builds on PostgreSQL service container.
