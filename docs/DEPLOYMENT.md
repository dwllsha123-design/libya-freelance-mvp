# Deployment Guide — Libya Freelance MVP

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (SSR) — shared codebase for marketplace + admin host |
| Backend | NestJS API + Socket.IO (single backend — no duplicate admin API) |
| Database | Managed PostgreSQL (or compose `postgres` service) |
| Storage | S3-compatible (R2, Spaces, S3) — **not local disk in production** |
| HTTPS | Mandatory (terminate TLS at reverse proxy / Cloudflare) |

## Final domain + access architecture

| Role | URL | Audience |
|------|-----|----------|
| Public marketplace | `https://libyanfreelance.ly` | CLIENT + FREELANCER |
| Admin control center | `https://admin.libyanfreelance.ly` | SUPER_ADMIN + authorized ADMIN |
| API + Socket.IO | `https://api.libyanfreelance.ly` | Shared backend |

**Do not deploy until DNS/hosting is configured.**

### Public marketplace (`libyanfreelance.ly`)

Registration, login, profiles, projects, proposals, messaging, portfolio, reviews, notifications.

The platform-owner control center is **not** linked from public navigation.

Production path `https://libyanfreelance.ly/admin` redirects to `https://admin.libyanfreelance.ly` (one control center only).

### Admin control center (`admin.libyanfreelance.ly`)

Dedicated entry with branding **Libya Freelance — إدارة المنصة** and staff login only.

No client/freelancer registration and no marketplace chrome.

Host routing: `frontend/src/middleware.ts` + `frontend/src/lib/site-urls.ts`.

### Local development (unchanged simplicity)

| Surface | URL |
|---------|-----|
| App | `http://localhost:3000` |
| Admin | `http://localhost:3000/admin` (login: `/admin/login`) |
| API | `http://localhost:4000/api` |

No local subdomain required.

### Authorization (backend authoritative)

| Actor | Admin endpoints |
|-------|-----------------|
| CLIENT / FREELANCER / INVESTOR | 403 |
| ADMIN | Operational admin APIs; **not** commission / investor agreement / permission grants |
| SUPER_ADMIN | Full owner control including Finance → Commission and Investors |

Staff permissions (granted only by SUPER_ADMIN): `MANAGE_USERS`, `MANAGE_PROJECTS`, `MANAGE_REVIEWS`, `MANAGE_CONTENT`, `MANAGE_FINANCE`, `MANAGE_INVESTORS`, `SEND_NOTIFICATIONS`, `MANAGE_SETTINGS`, `VIEW_AUDIT` (plus legacy `FINANCE_VIEW` / `FINANCE_WRITE`).

## Environment variables

### Backend (required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ≥ 32 random characters |
| `JWT_REFRESH_SECRET` | ≥ 32 random characters (different from access) |
| `FRONTEND_URL` | Public marketplace origin (`https://libyanfreelance.ly`) |
| `CORS_ORIGINS` | Must include marketplace **and** admin origins |
| `NODE_ENV` | `production` |
| `STORAGE_DRIVER` | Must be `s3` in production |

Templates:

- Root compose: `.env.production.example` → copy to `.env.production`
- Backend only: `backend/.env.production.example`

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (build-time `NEXT_PUBLIC_*`)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://libyanfreelance.ly` |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.libyanfreelance.ly` |
| `NEXT_PUBLIC_API_URL` | `https://api.libyanfreelance.ly/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.libyanfreelance.ly` |

Template: `frontend/.env.production.example`

### Cookie / CORS

```env
FRONTEND_URL=https://libyanfreelance.ly
CORS_ORIGINS=https://libyanfreelance.ly,https://admin.libyanfreelance.ly
```

Refresh cookie: `secure=true`, `sameSite=strict`, `path=/api/auth` on the API host.

Architecture remains ready for future MFA. No public admin registration.

## Production deploy checklist (when DNS/hosting ready)

1. DNS: apex/`libyanfreelance.ly`, `admin`, `api` (+ optional `www` → apex)
2. TLS for all hostnames
3. `cp .env.production.example .env.production` and fill secrets
4. Migrations + reference seed (**never** `prisma:seed:demo`):
   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.production --profile tools run --rm migrate
   ```
5. Start:
   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
   ```
6. Create owner:
   ```bash
   cd backend
   npm run admin:create -- --super true --email owner@libyanfreelance.ly --password "..." --firstName مالك --lastName المنصة
   ```
7. Smoke:
   - Marketplace loads on `https://libyanfreelance.ly`
   - Admin login on `https://admin.libyanfreelance.ly` (no public register)
   - `https://libyanfreelance.ly/admin` redirects to admin host
   - `GET https://api.libyanfreelance.ly/api/health`
   - `GET https://api.libyanfreelance.ly/api/platform/commission-config`

### Do not upload / commit

- Filled `.env.production` / `backend/.env`
- `node_modules/`, `.next/`, `backend/data/`
- Demo seed credentials

## Database migrations (production)

Migrations run in a **separate CI/release job** (Pattern A), not inside the production API runtime.

### Pattern A — CI / release migration job

1. Migration job:
   ```bash
   cd backend
   npm ci --legacy-peer-deps
   node node_modules/prisma/build/index.js validate
   node node_modules/prisma/build/index.js generate
   node node_modules/prisma/build/index.js migrate deploy
   node node_modules/prisma/build/index.js migrate status
   npm run prisma:seed
   npm run build
   ```
2. Runtime bundle:
   ```bash
   npm run package:runtime
   cd .runtime-bundle && node dist/main.js
   ```

### Pattern B — Docker

```bash
docker compose -f docker-compose.production.yml --env-file .env.production --profile tools run --rm migrate
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

## Build & start (without compose)

```bash
cd backend && npm ci --legacy-peer-deps
node node_modules/prisma/build/index.js generate
npm run build
npm run package:runtime
cd .runtime-bundle && node dist/main.js

# Frontend — set NEXT_PUBLIC_* for production domains before build
cd frontend && npm ci && npm run build && npm run start
```

**Never** use `prisma migrate dev` / `prisma db push` / `prisma:seed:demo` against production.

Verify: `npm run verify:prod-boundary`

## Health checks

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready`

## Storage

| Driver | When |
|--------|------|
| `STORAGE_DRIVER=local` | Development |
| `STORAGE_DRIVER=s3` | **Required** in production |

See `backend/docs/STORAGE.md`.

## Rate limiting

In-memory (single instance). Multi-instance needs Redis-backed limiting. Admin login remains rate-limited via auth limiters.

## CI

`.github/workflows/ci.yml` — migrations, unit tests, E2E, builds.
