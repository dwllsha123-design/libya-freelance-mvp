# Libyi Freelance — ليبي فريلانس

**المنصة الأولى للعمل الحر في ليبيا**

Arabic-first freelance marketplace MVP.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- Docker (optional, for local DB and E2E)

## Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Backend:** NestJS 12, Prisma 6, PostgreSQL
- **Auth:** JWT access + httpOnly refresh cookie
- **Realtime:** Socket.IO (messaging + notifications)

## Quick start

### 1. Database (development)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

API: `http://localhost:4000/api`

Generate JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: `http://localhost:3000`

### Production domains

| Role | URL |
|------|-----|
| Marketplace | `https://libyanfreelance.ly` |
| Admin | `https://admin.libyanfreelance.ly` |
| API | `https://api.libyanfreelance.ly` |

Local: `http://localhost:3000` · admin `http://localhost:3000/admin` · API `http://localhost:4000/api`

See `docs/DEPLOYMENT.md` and `.env.production.example`. **Do not deploy until DNS/hosting is ready.**

### 4. Admin user (production-safe)

```bash
cd backend
npm run admin:create -- --email admin@yourdomain.ly --password "..." --firstName مدير --lastName النظام
```

Demo accounts (`demo-admin@seed.ly`, etc.) are only created via `npm run prisma:seed:demo` in **non-production**.

## Testing

### Unit tests

```bash
cd backend && npm test
```

### E2E (PostgreSQL test database required)

```bash
cd backend
npm run test:db:start      # docker-compose.test.yml on port 5433
npm run test:db:migrate
npm run test:e2e:full
npm run test:db:stop
```

E2E aborts if `DATABASE_URL` points to a non-test database (safety). Use `libya_freelance_test` or set `ALLOW_E2E_ON_DB=true` explicitly.

### Quality gate

```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run build
cd frontend && npm run lint && npm run typecheck && npm run build
```

## Production migrations

```bash
npx prisma migrate deploy
```

Never `migrate dev` or `db push` on production.

## Documentation

- [Deployment](docs/DEPLOYMENT.md)
- [Beta readiness](docs/BETA_READINESS.md)
- [Auth session invalidation](backend/docs/AUTH_SESSION_INVALIDATION.md)
- [Admin security](backend/docs/ADMIN_SECURITY.md)
- [Backup & recovery](backend/docs/BACKUP_RECOVERY.md)
- [MVP test report](backend/docs/MVP_TEST_REPORT.md)

## MVP scope

Users, projects, proposals, messaging, portfolio, completion, reviews, notifications, admin panel. **No payments, escrow, disputes, or AI.**
