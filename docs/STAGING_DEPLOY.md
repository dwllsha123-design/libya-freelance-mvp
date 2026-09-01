# Staging Deployment Checklist — Libya Freelance WEB MVP

**Status:** Prepared — **not executed** (no hosting credentials in repository)

Target URLs:

| Service | URL |
|---------|-----|
| Frontend | `https://staging.libyafreelance.ly` |
| API | `https://api-staging.libyafreelance.ly` |

Use actual assigned URLs if different.

---

## Prerequisites

- [ ] Managed PostgreSQL 16 (separate from future production)
- [ ] S3-compatible bucket + CDN/public URL (separate from production)
- [ ] TLS certificates for both domains
- [ ] Secrets manager or secure env injection

---

## 1. Provision PostgreSQL

Create database and user. Example connection:

```
postgresql://libya_staging:***@db-host:5432/libya_freelance_staging?schema=public
```

---

## 2. Provision S3-compatible bucket

See `backend/docs/STORAGE.md`. Enable public read for `profile-images/*` and `portfolio/*` prefixes.

Record:

- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (backend only)
- `S3_PUBLIC_BASE_URL`

---

## 3. Configure backend environment

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<48+ random hex>
JWT_REFRESH_SECRET=<48+ random hex>
FRONTEND_URL=https://staging.libyafreelance.ly
CORS_ORIGINS=https://staging.libyafreelance.ly

STORAGE_DRIVER=s3
S3_ENDPOINT=...
S3_REGION=auto
S3_BUCKET=libya-freelance-staging
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://...
S3_FORCE_PATH_STYLE=false
```

**Never** use development defaults or production credentials.

---

## 4. Migration job (before runtime deploy)

```bash
cd backend
npm ci --legacy-peer-deps
node node_modules/prisma/build/index.js generate
DATABASE_URL="..." node node_modules/prisma/build/index.js migrate deploy
DATABASE_URL="..." node node_modules/prisma/build/index.js migrate status
DATABASE_URL="..." npm run prisma:seed
```

Expected: **9/9 migrations**, reference data seeded, no drift.

**Do not** use `migrate dev`, `db push`, or `db reset`.

---

## 5. Create staging admin

```bash
cd backend
DATABASE_URL="..." npm run admin:create
```

Use a strong staging-only password. Do not commit credentials.

---

## 6. Deploy backend runtime

```bash
cd backend
npm ci --legacy-peer-deps
node node_modules/prisma/build/index.js generate
npm run build
npm run package:runtime
# deploy .runtime-bundle/ to host or use:
docker build -f Dockerfile --target runtime -t libya-api-staging .
```

Start: `node dist/main.js` with env from step 3.

---

## 7. Verify backend health

```bash
curl https://api-staging.libyafreelance.ly/api/health
curl https://api-staging.libyafreelance.ly/api/health/ready
```

Both must return **200** with healthy database.

---

## 8. Configure frontend

```env
NEXT_PUBLIC_API_URL=https://api-staging.libyafreelance.ly/api
```

Build and deploy:

```bash
cd frontend
npm ci
npm run build
npm run start
```

Or `docker build -f Dockerfile --build-arg NEXT_PUBLIC_API_URL=... -t libya-web-staging .`

---

## 9. Verify web + Socket.IO

- [ ] Homepage loads over HTTPS
- [ ] Register/login; hard refresh preserves session (httpOnly refresh cookie)
- [ ] CORS: no browser errors on REST, refresh, logout, uploads
- [ ] Socket.IO connects to staging API (not localhost)
- [ ] Two users: realtime messages, typing, notifications

---

## 10. Persistent storage smoke

- [ ] Upload profile photo
- [ ] Upload portfolio image
- [ ] Restart/redeploy API
- [ ] Images still load
- [ ] Delete image; removed correctly

---

## Docker Compose (local/VPS reference)

```bash
cp backend/.env.staging.example .env.staging   # fill secrets
docker compose -f docker-compose.staging.yml --env-file .env.staging --profile tools run --rm migrate
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

---

## Demo data

Do **not** run `npm run prisma:seed:demo` on staging unless intentionally needed.

`NODE_ENV=production` blocks demo seed in code.

---

## After deployment

Execute manual QA per `docs/STAGING_SMOKE_REPORT.md` and responsive matrix in `docs/WEB_QA_REPORT.md`.
