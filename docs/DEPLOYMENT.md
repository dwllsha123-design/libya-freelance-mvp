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

```bash
npx prisma migrate deploy
```

**Never** use `prisma migrate dev` or `prisma db push` against production.

**Never** run `prisma:seed:demo` in production.

## Build & start

```bash
# Backend
cd backend && npm ci && npx prisma generate && npm run build
npm run start:prod

# Frontend
cd frontend && npm ci && npm run build
npm run start
```

## Health checks

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready` (includes DB connectivity)

## Storage

Development may serve `uploads/` locally. Production must use object storage adapter (configure when deploying).

## Rate limiting

Current limiter is **in-memory** (single instance). Multi-instance deployments need Redis-backed rate limiting.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml` — runs migrations, unit tests, E2E, and builds on PostgreSQL service container.
