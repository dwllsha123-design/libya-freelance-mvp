# Railway Deployment — Libya Freelance

Additive deployment path for [Railway](https://railway.app). **Does not replace** the existing VPS + Docker Compose + Caddy production stack documented in `docs/PRODUCTION_DEPLOYMENT.md`.

| Environment | Stack |
|-------------|-------|
| VPS production | `docker-compose.production.yml` + Caddy + MinIO + GitHub Actions SSH deploy |
| Railway staging/prod | Independent `frontend` + `backend` services + managed Postgres + S3-compatible storage |

**Do not move production DNS** until Railway staging is fully validated.

---

## Architecture on Railway

```
GitHub (railway/production-ready or main after merge)
  ├── Frontend service  (Root: /frontend)  → Next.js standalone
  ├── Backend service   (Root: /backend)   → NestJS API + Socket.IO
  ├── PostgreSQL        (Railway plugin)
  └── S3-compatible storage (Railway Bucket or external R2/Spaces/AWS)
```

The API enforces `STORAGE_DRIVER=s3` in production. Local disk storage is **not** permitted.

---

## STEP A — Create Railway project

1. Log in to [Railway](https://railway.app).
2. **New Project** → **Deploy from GitHub repo** → `libya-freelance-mvp`.
3. Select branch **`railway/production-ready`** for initial staging (not `main` until reviewed).
4. **Do not** enable auto-deploy to VPS — Railway is a separate target.

---

## STEP B — Add PostgreSQL

1. In the project: **+ New** → **Database** → **PostgreSQL**.
2. Note the Postgres **service name** (default `Postgres`) — it is needed for the reference variable below.

### Wiring `DATABASE_URL` into the backend (reference variable)

Do **not** copy the connection string by hand, and never commit it. In the **backend** service → **Variables**, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` |

Replace `Postgres` with the actual Postgres service name if you renamed it.

Railway resolves this at build and deploy time, so the credentials only ever live in the Postgres service:

| Railway variable | Host form | Use |
|------------------|-----------|-----|
| `DATABASE_URL` | `postgres.railway.internal` (private network) | **Use this** — services in the same project; no egress billing |
| `DATABASE_PUBLIC_URL` | TCP proxy host | Local `psql`/admin tools only; billed as network egress |

The private `*.railway.internal` hostname does not resolve outside Railway, so it cannot be used for local development.

The application reads `DATABASE_URL` from the environment only — `prisma/schema.prisma` uses `env("DATABASE_URL")` and nothing hardcodes a host, port, user, password, or database name. Railway's private Postgres does not require `sslmode=require`; use the connection string exactly as Railway provides it and add parameters only if Railway's value includes them.

---

## STEP C — Add Backend service

1. **+ New** → **GitHub Repo** → same repository.
2. **Settings → Root Directory**: `backend`
3. **Settings → Config file path** (if using config-as-code): `backend/railway.json`

   > Railway has deprecated Config as Code in favour of Infrastructure as Code. Existing `railway.json` files keep working for legacy services **until 2026-12-01**. The settings in `railway.json` are all settable from the dashboard, so this is not a blocker for staging, but plan the migration before that date.

4. **Build**: Railway detects `backend/Dockerfile` (multi-stage production image).
5. **Deploy → Pre-deploy command** (from `backend/railway.json`):

   ```bash
   npx prisma@6.19.3 migrate deploy
   ```

   Requires `prisma/` migrations folder in the image (included) and `DATABASE_URL` linked.

   **Why `npx` and not the local CLI.** Railway runs the pre-deploy command in a *separate container started from the application image*, on the private network, with the service's environment variables. The runtime stage of `backend/Dockerfile` deliberately deletes `node_modules/prisma` so the Prisma CLI (and its `deepmerge-ts` dependency — see `docs/DEPENDENCY_AUDIT.md`) is never present in the long-running API container. `node node_modules/prisma/build/index.js migrate deploy` would therefore fail on Railway. `npx prisma@6.19.3` downloads the pinned CLI into the throwaway pre-deploy container instead, which keeps the API runtime boundary intact.

   This requires outbound network access to the npm registry during pre-deploy. If a Railway environment blocks that egress, the fallback is to add a `migrate` stage/service that retains the CLI rather than reintroducing it into the API runtime image.

6. **Deploy → Start command**:

   ```bash
   node dist/main.js
   ```

7. **Healthcheck path**: `/api/health/ready` (from `backend/railway.json`)

   The API exposes two distinct probes:

   | Endpoint | Role | Checks DB? | Failure code |
   |----------|------|-----------|--------------|
   | `/api/health` | Liveness | **No** — returns static `{"status":"ok"}` | never fails while the process is up |
   | `/api/health/ready` | Readiness | **Yes** — runs `SELECT 1` via Prisma | `503` when the database is unreachable |

   Railway's deployment healthcheck uses the **readiness** path so a deploy that cannot reach Postgres is never promoted as healthy. `/api/health` does **not** verify the database and must not be used to gate a deploy. Readiness also reports storage, but degraded storage returns `200` with `"status":"degraded"` and so does not block a deploy — only the database gates it.

### Database startup behaviour (fail-fast, intentional)

`PrismaService.onModuleInit` calls `$connect()` and **rethrows** on failure, so Nest never reaches `listen()` when Postgres is unreachable. This is deliberate and correct for Railway:

- The API never starts in an unusable state serving errors on every route.
- The container exits non-zero, and `restartPolicyType: ON_FAILURE` retries it.
- The deploy healthcheck fails, so a broken deployment is not promoted while the previous one keeps serving.

Because `migrate deploy` already runs in pre-deploy and fails the deployment when the database is unreachable, a container that reaches the start command has normally proven database connectivity. Do not soften this into a warn-and-continue.

### Backend build (manual reference)

```bash
cd backend
npm ci --legacy-peer-deps
npx prisma generate
npm run build
```

### Backend start

```bash
node dist/main.js
```

Listens on `HOST` (default `0.0.0.0`) and `PORT` (Railway-injected).

---

## STEP D — Backend environment variables

Link Postgres `DATABASE_URL` from the Railway Postgres service.

Set remaining variables from `backend/.env.railway.example`:

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | Yes | `production` |
| `DATABASE_URL` | Yes | From Railway Postgres |
| `JWT_ACCESS_SECRET` | Yes | Min 32 random chars |
| `JWT_REFRESH_SECRET` | Yes | Different from access secret |
| `JWT_ACCESS_EXPIRES_IN` | No | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | No | Default `7d` |
| `AUTH_COOKIE_SAME_SITE` | Yes | `lax` on custom domains; `none` only on cross-site `*.up.railway.app` staging |
| `AUTH_COOKIE_DOMAIN` | No | Leave **empty** — keeps the refresh cookie host-only on the API domain |
| `FRONTEND_URL` | Yes | `https://libyanfreelance.ly` in production |
| `CORS_ORIGINS` | Yes | Comma-separated browser origins (see [CORS](#step-j--cors-for-railway-domains)) |
| `STORAGE_DRIVER` | Yes | Must be `s3` — **add manually**, Bucket auto-inject does not set it |
| `AWS_ACCESS_KEY_ID` | Yes | Auto-injected by Railway Bucket |
| `AWS_SECRET_ACCESS_KEY` | Yes | Auto-injected by Railway Bucket |
| `AWS_DEFAULT_REGION` | Yes | Auto-injected (`auto`) |
| `AWS_ENDPOINT_URL` | Yes | Auto-injected (`https://storage.railway.app`) |
| `AWS_S3_BUCKET_NAME` | Yes | Auto-injected — the S3 API bucket name |
| `S3_PUBLIC_BASE_URL` | Yes | **Add manually** — `https://<backend-domain>/api/media` (see STEP E) |
| `AWS_S3_URL_STYLE` | No | Only if the bucket's Credentials tab says path-style |
| `PAYMENT_DRIVER` | No | `simulated` for staging |
| `PAYMENT_CURRENCY` | No | `LYD` |
| `EMAIL_FROM` | Yes (prod) | `support@libyanfreelance.ly` |
| `SMTP_HOST` | Yes (prod) | `smtp.lsbox.email` |
| `SMTP_PORT` | Yes (prod) | `465` |
| `SMTP_SECURE` | Yes (prod) | `true` (TLS on connect; certificate validation stays enabled) |
| `SMTP_USER` | Yes (prod) | `support@libyanfreelance.ly` |
| `SMTP_PASSWORD` | Yes (prod) | Mailbox password — **Railway Variables only**, never commit |
| `PASSWORD_RESET_TOKEN_EXPIRES_IN` | No | Default `1h` |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | No | Default `24h` |
| `PUSH_VAPID_PUBLIC_KEY` | Yes (for Web Push) | Public VAPID key (`npx web-push generate-vapid-keys`) |
| `PUSH_VAPID_PRIVATE_KEY` | Yes (for Web Push) | Private VAPID key — **Railway backend only**, never frontend |
| `PUSH_VAPID_SUBJECT` | No | Default `mailto:support@libyanfreelance.ly` |

Web Push is optional: if VAPID is unset, inbox + Socket.IO still work. When VAPID is set, both public and private keys are required. The frontend fetches **only** the public key from `GET /api/notifications/push/vapid-public-key`.

Transactional mail (password reset + email verification) is sent over SMTP. In production the API **fails startup** if SMTP is missing or incomplete. Locally you may leave `SMTP_*` empty to disable outbound mail (tokens are never logged).

**Never** commit filled values. Set only in Railway UI.

---

## STEP E — Object storage (Railway Bucket)

### Option 1 — Railway Bucket

1. **+ New** → **Bucket**, choose a region (it cannot be changed later).
2. Open the **backend** service → **Variables** → use **auto-inject** to add the bucket credentials.

Auto-inject supplies the AWS-standard names, which the backend reads directly — no manual mapping is needed:

| Railway-injected variable | Example | Read by |
|---------------------------|---------|---------|
| `AWS_ACCESS_KEY_ID` | *(secret)* | `storage.s3.accessKeyId` |
| `AWS_SECRET_ACCESS_KEY` | *(secret)* | `storage.s3.secretAccessKey` |
| `AWS_DEFAULT_REGION` | `auto` | `storage.s3.region` |
| `AWS_ENDPOINT_URL` | `https://storage.railway.app` | `storage.s3.endpoint` |
| `AWS_S3_BUCKET_NAME` | `my-bucket-jdhhd8oe18xi` | `storage.s3.bucket` |

`AWS_REGION` is accepted as an alternative to `AWS_DEFAULT_REGION`. The legacy `S3_*` names still work for the VPS/MinIO deployment; when both are set, `AWS_*` wins.

Two variables are **not** auto-injected and must be added by hand:

- `STORAGE_DRIVER=s3`
- `S3_PUBLIC_BASE_URL=https://<backend-domain>/api/media`

### Addressing style — do not force path style

Railway Buckets are backed by Cloudflare R2 and require **virtual-hosted-style** URLs, where the bucket is a subdomain of the endpoint. The S3 client is therefore configured with `forcePathStyle: false`, which is the default. Forcing path style against Railway produces intermittent failures and timeouts.

Only override this if your bucket's **Credentials** tab explicitly says to use path-style URLs (buckets created before Railway's switch to virtual-hosted style), in which case set `AWS_S3_URL_STYLE=path`.

### Private bucket — reads go through the API

**Railway Buckets are private and have no public object URLs.** Railway's own guidance is to serve stored files through your backend.

The API therefore exposes a read-through media proxy:

```
GET /api/media/profile-images/:userId/:filename
GET /api/media/portfolio/:userId/:itemId/:filename
```

Setting `S3_PUBLIC_BASE_URL` to `https://<backend-domain>/api/media` makes `publicUrlForKey()` mint URLs that resolve through this proxy, so:

- stored image URLs stay **stable and permanent** (presigned links expire, and the URLs are persisted in Postgres on `Profile.profilePhoto` and `PortfolioImage.imageUrl`),
- upload, delete, and every read path are unchanged,
- objects are served with `Cache-Control: public, max-age=31536000, immutable` (keys contain a UUID, so they never change) plus `X-Content-Type-Options: nosniff`.

Only the `profile-images/` and `portfolio/` prefixes are reachable, at fixed path depth, so arbitrary bucket keys cannot be read through the proxy. These two prefixes are exactly the ones the VPS MinIO setup marks anonymously downloadable, so this preserves existing behaviour rather than changing the security model.

Presigned GET URLs were rejected as the primary mechanism: they would expire while persisted URLs would not, forcing every read path that returns an image URL to be rewritten. For high-traffic asset serving later, put a CDN in front of the proxy or move to presigned URLs at that point.

Set the frontend's `NEXT_PUBLIC_MEDIA_ORIGIN` to the backend origin (scheme + host, no path) so `next/image` will optimize proxied images.

### Option 2 — External S3 (Cloudflare R2, DigitalOcean Spaces, AWS)

Use either naming scheme. With a genuinely public bucket or CDN, point `S3_PUBLIC_BASE_URL` at that public base URL instead of the media proxy and the images are served directly. See `backend/docs/STORAGE.md` for provider examples.

---

## STEP F — Deploy backend

1. Deploy the backend service.
2. **Settings → Networking → Generate Domain** (e.g. `libya-freelance-api-production.up.railway.app`).
3. Verify:

   ```bash
   curl -fsS https://<backend-domain>/api/health
   curl -fsS https://<backend-domain>/api/health/ready
   ```

   `/api/health` → liveness (200).  
   `/api/health/ready` → readiness (200 when DB connected).

4. After the first profile-photo upload, confirm the media proxy serves it:

   ```bash
   curl -fsSI "https://<backend-domain>/api/media/profile-images/<userId>/<filename>"
   ```

   Expect `200` with an `image/*` content type. A `404` means the object key is absent; a `500` points at bucket credentials or addressing style.

   `/api/health/storage` reports the driver and whether the storage service is wired, but it does **not** perform a live bucket round-trip.

---

## STEP G — Add Frontend service

1. **+ New** → **GitHub Repo** → same repository.
2. **Settings → Root Directory**: `frontend`
3. **Config file path**: `frontend/railway.json`
4. **Build**: `frontend/Dockerfile` (Next.js standalone).
5. **Start command**: `node server.js` (standalone output).
6. **Healthcheck**: `/api/health`

### Frontend build (manual reference)

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=https://<backend-domain>/api \
NEXT_PUBLIC_SOCKET_URL=https://<backend-domain> \
NEXT_PUBLIC_SITE_URL=https://<frontend-domain> \
NEXT_PUBLIC_ADMIN_URL=https://<frontend-domain> \
npm run build
```

### Frontend start

```bash
node server.js
```

Next.js standalone respects `PORT` and `HOSTNAME=0.0.0.0`.

---

## STEP H — Frontend environment variables

Set at **build time** (Railway rebuilds when these change):

| Variable | Staging | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_API_URL` | `https://<backend-domain>/api` | `https://api.libyanfreelance.ly/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<backend-domain>` | `https://api.libyanfreelance.ly` |
| `NEXT_PUBLIC_SITE_URL` | `https://<frontend-domain>` | `https://libyanfreelance.ly` |
| `NEXT_PUBLIC_ADMIN_URL` | `https://<frontend-domain>` (same host on staging) | `https://admin.libyanfreelance.ly` |
| `NEXT_PUBLIC_MEDIA_ORIGIN` | `https://<backend-domain>` — same scheme+host as `S3_PUBLIC_BASE_URL`, no path | `https://api.libyanfreelance.ly` |
| `NEXT_PUBLIC_IMAGE_HOSTS` | Optional extra CDN hostnames, comma-separated | same |

`NEXT_PUBLIC_ADMIN_URL` is what `src/lib/site-urls.ts` uses to recognise the admin host, so on production it must be the real admin origin. On staging, set it equal to `NEXT_PUBLIC_SITE_URL` so `/admin` works on the same hostname without a separate subdomain.

If `NEXT_PUBLIC_API_URL` is missing at build time, `src/lib/api.ts` falls back to `https://api.libyanfreelance.ly/api` for production builds and to `http://localhost:4000/api` otherwise, so a production image can never ship pointing at localhost. Set the variable explicitly anyway — the fallback is a safety net, not configuration.

---

## STEP I — Deploy frontend

1. Generate Railway public domain for frontend.
2. Update backend `CORS_ORIGINS` and `FRONTEND_URL` to include the frontend Railway URL.
3. Redeploy backend if CORS changed.
4. Verify:

   ```bash
   curl -fsS https://<frontend-domain>/api/health
   ```

---

## STEP J — CORS for Railway domains

Backend `CORS_ORIGINS` must list every browser origin that calls the API — nothing more. Production:

```
CORS_ORIGINS=https://libyanfreelance.ly,https://www.libyanfreelance.ly,https://admin.libyanfreelance.ly
```

Comma-separated, no spaces, no trailing slash, no trailing comma. Each entry is a scheme + host origin; a hostname alone will never match.

`api.libyanfreelance.ly` is **not** listed: an origin is only needed for browsers calling the API, never for the API itself.

Rules enforced in code (`backend/src/bootstrap.ts`):

- `credentials: true`, with the allowlist passed as an explicit array. A non-matching `Origin` receives no `Access-Control-Allow-Origin` header, so the browser blocks the response.
- `Access-Control-Allow-Origin: *` is never emitted — it is invalid with credentials, and `test/auth-cors-cookie.spec.ts` asserts this.
- `allowedHeaders: Content-Type, Authorization, X-Client-Request`. The custom `X-Client-Request` header is required by `ClientRequestGuard` on the auth routes, which also forces a CORS preflight and therefore doubles as CSRF protection.
- Socket.IO (`messaging.gateway.ts`) reads the same `CORS_ORIGINS` list, so websocket and HTTP allowlists cannot drift.

`CORS_ORIGINS` is read at boot, so redeploy the backend after changing it.

---

## STEP K — Staging test checklist

| Flow | Pass criteria |
|------|---------------|
| Homepage | Loads on Railway frontend domain |
| Registration | Client + freelancer signup |
| Login | Session refresh via httpOnly cookie (`AUTH_COOKIE_SAME_SITE=none` on staging) |
| Logout | `refresh_token` cookie removed; a later `/api/auth/refresh` returns 401 |
| CORS rejection | A request from an origin outside `CORS_ORIGINS` is blocked by the browser |
| Profile image upload | Image stored in S3; URL loads |
| Portfolio upload | Same |
| Project creation | API persists to Postgres |
| Proposals + acceptance | End-to-end |
| Socket.IO messages | Realtime delivery |
| Notifications | Push via socket event |
| Reviews | Create + display |
| Admin `/admin/login` | Staff login on same Railway frontend host |
| Admin dashboard | SUPER_ADMIN / ADMIN routes |

---

## STEP L — Custom domains (after staging passes)

**Do not** change VPS production DNS until Railway is validated.

When ready:

1. Railway **Settings → Custom Domain** on frontend → `libyanfreelance.ly`, `www.libyanfreelance.ly`
2. Optional admin subdomain on same frontend service → `admin.libyanfreelance.ly`  
   Set `NEXT_PUBLIC_ADMIN_URL=https://admin.libyanfreelance.ly` and `ADMIN_HOSTS=admin.libyanfreelance.ly`
3. Backend custom domain → `api.libyanfreelance.ly`
4. Update all `NEXT_PUBLIC_*`, `CORS_ORIGINS`, `FRONTEND_URL`, `S3_PUBLIC_BASE_URL`.
   `NEXT_PUBLIC_*` values are inlined at build time — the frontend must be **rebuilt**, not just restarted.
5. Switch `AUTH_COOKIE_SAME_SITE` from `none` to `lax` and leave `AUTH_COOKIE_DOMAIN` empty
   (see [Auth cookies on Railway](#auth-cookies-on-railway))

VPS deployment remains available via existing scripts and GitHub Actions.

---

## Prisma migration strategy

| Action | Command | Where |
|--------|---------|-------|
| Production migrate | `prisma migrate deploy` | Railway **pre-deploy** (see `backend/railway.json`) |
| Production status | `prisma migrate status` | Read-only; safe to run manually |
| Never use | `migrate reset`, `db push --force-reset`, `migrate dev` | — |
| Reference seed | `npm run prisma:seed` | Manual one-off only if needed; not automatic on Railway |

Runtime container does **not** run migrations on boot. `migrate deploy` only applies pending migrations and never resets or drops the database, which makes it the correct production strategy.

`prisma/migrations/` holds 19 forward-only migrations with `migration_lock.toml` pinned to `postgresql`. They apply cleanly to an empty database, which is what a fresh Railway Postgres provides. Do not edit applied migration history — ship a forward-fix migration instead.

If a migration fails partway on Railway, the deploy is aborted and the previous deployment keeps serving. Resolve by restoring from a backup or shipping a forward-fix migration — never with `migrate reset`.

---

## Auth cookies on Railway

Access tokens live in frontend memory only and travel as `Authorization: Bearer` headers. The single cookie in the system is the refresh token, set by the API on its own hostname.

| Setting | Custom domains (production) | `*.up.railway.app` (staging) |
|---------|-----------------------------|------------------------------|
| `AUTH_COOKIE_SAME_SITE` | `lax` | `none` (required) |
| `AUTH_COOKIE_DOMAIN` | empty (host-only) | empty |
| `Secure` | `true` (from `NODE_ENV=production`) | `true` (forced by `none`) |
| `HttpOnly` | `true` | `true` |
| `Path` | `/api/auth` | `/api/auth` |
| `Max-Age` | follows `JWT_REFRESH_EXPIRES_IN` (`7d`) | same |

**Why `lax` is enough in production.** SameSite compares registrable domains, not origins. `libyanfreelance.ly`, `www.`, `admin.` and `api.` all resolve to the registrable domain `libyanfreelance.ly`, so a `fetch` from the frontend to the API is a **same-site** request and `lax` cookies are sent. `none` is only needed on `*.up.railway.app`, where each service sits on a different registrable domain. Never set `none` on the custom domains: it would make the cookie available to genuinely cross-site requests for no benefit.

**Why the cookie stays host-only.** Omitting `AUTH_COOKIE_DOMAIN` scopes the cookie to `api.libyanfreelance.ly` alone. Only the API ever reads it, so `Domain=.libyanfreelance.ly` would widen exposure to every current and future subdomain without enabling anything. Combined with `Path=/api/auth`, the cookie is not attached to ordinary API calls at all — only to `login`, `register`, `refresh` and `logout`.

**Cloudflare / Railway proxy.** `Secure` is derived from `NODE_ENV=production`, not from the request scheme, so it cannot be defeated by a proxy hop that terminates TLS. `trust proxy` is set to `1` in `bootstrap.ts` before CORS and the rate limiters; it is what makes `req.ip` and `req.secure` reflect `X-Forwarded-For` / `X-Forwarded-Proto` rather than the Railway edge. Cloudflare must stay on **Full** SSL/TLS mode so the hop into Railway is HTTPS and `X-Forwarded-Proto: https` arrives intact.

**Logout.** `clearRefreshCookie` reuses the exact `Path`, `Domain`, `SameSite` and `Secure` attributes of the original cookie, which is what browsers require to actually drop it, and `AuthService.logout` deletes the hashed token row so a captured cookie cannot be replayed. `refresh` is single-use: the stored row is deleted and a fresh pair issued on every call.

---

## Socket.IO

- URL: `NEXT_PUBLIC_SOCKET_URL` (API origin, no `/api` suffix)
- Auth: Bearer token in handshake (`auth.token`)
- Transports: `websocket` + `polling` fallback
- CORS: `CORS_ORIGINS` on backend
- No Redis adapter (single instance). Document horizontal scaling as future work.

---

## VPS compatibility preserved

Unchanged:

- `docker-compose.production.yml`
- `scripts/deploy-*.sh`
- `.github/workflows/deploy-production.yml`
- Caddy external reverse proxy assumptions
- MinIO bundled in VPS compose

Railway uses environment configuration only — no compose required.

---

## Related docs

- `backend/docs/STORAGE.md` — S3 providers
- `docs/PRODUCTION_DEPLOYMENT.md` — VPS path
- `backend/.env.railway.example` — backend variable template
- `frontend/.env.railway.example` — frontend variable template
