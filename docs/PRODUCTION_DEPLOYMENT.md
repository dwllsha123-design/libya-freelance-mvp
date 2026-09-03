# Production CI/CD — Libya Freelance
# https://libyanfreelance.ly

## Architecture

```
Developer (Cursor)
    → git commit
    → GitHub (main branch)
    → GitHub Actions (CI + deploy)
    → SSH → production VPS (102.203.200.88)
    → scripts/deploy-production.sh
    → Docker Compose (api, web, postgres, minio)
    → Caddy (external — NOT managed by app deploy)
```

| Component | Role |
|-----------|------|
| **Caddy** | TLS + reverse proxy on the VPS. Routes public domains to `localhost:3000` (web) and `localhost:4000` (api). **Independent** from application deployments. |
| **web** | Next.js frontend (port 3000) |
| **api** | NestJS backend (port 4000) |
| **postgres** | PostgreSQL 16 (Docker volume `prod_pg_data`) |
| **minio** | S3-compatible object storage (Docker volume `prod_minio_data`) |

Caddy is **not** in this repository and is **not** restarted during normal deployments.

## GitHub → server flow

1. Code is merged/pushed to **`main`** (repository default branch).
2. GitHub Actions runs CI (lint, typecheck, tests, build).
3. If CI passes, Actions SSHs to the production server.
4. `scripts/deploy-production.sh` runs:
   - Records previous commit SHA
   - `git fetch` + fast-forward to `origin/main`
   - Validates Docker Compose config
   - Builds `api` and `web` images
   - Runs `prisma migrate deploy` (safe — never reset)
   - Recreates **only** `api` and `web` containers
   - Runs HTTP health checks
5. On failure: logs previous/new commit and optional auto-rollback.

## Required GitHub Secrets

Create these in **Settings → Secrets and variables → Actions** (repository or `production` environment):

| Secret | Description | Example |
|--------|-------------|---------|
| `PRODUCTION_HOST` | Server IP or hostname | `102.203.200.88` |
| `PRODUCTION_USER` | SSH user | `root` |
| `PRODUCTION_SSH_KEY` | Private SSH key (PEM). **Never log or commit.** | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PRODUCTION_PORT` | SSH port | `22` |
| `PRODUCTION_PATH` | Absolute path to repo on server | `/root/libya-freelance-mvp` |
| `PRODUCTION_SSH_KNOWN_HOSTS` | (Recommended) Output of `ssh-keyscan` for the host | `102.203.200.88 ssh-ed25519 AAAA...` |

## Required GitHub Variables

Create these in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `PRODUCTION_AUTODEPLOY` | Enable automatic deploy on `push` to `main` (`true` to enable) | `true` |

Push to `main` runs CI always. **SSH deployment runs only when** `vars.PRODUCTION_AUTODEPLOY == 'true'`.  
Manual **workflow_dispatch** deploys after CI even when autodeploy is off. There is no `skip_ci` path.

Optional repository variable:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEPLOY_BRANCH` | `main` | Branch tracked on the server |

Automatic: push/merge to `main`.

Manual:

1. GitHub → **Actions** → **Deploy Production** → **Run workflow**.

## One-time server setup

Run once on the production VPS (`102.203.200.88`):

```bash
# 1. Clone (if not already present)
cd ~
git clone https://github.com/dwllsha123-design/libya-freelance-mvp.git libya-freelance-mvp
cd ~/libya-freelance-mvp

# 2. Track production branch (main)
git fetch origin
git checkout main
git pull --ff-only origin main

# 3. Create production env (NEVER commit this file)
cp .env.production.example .env.production
# Edit secrets: POSTGRES_PASSWORD, JWT_*, S3_*
nano .env.production

# 4. Make scripts executable
chmod +x scripts/deploy-production.sh scripts/deploy-preflight.sh scripts/production-healthcheck.sh scripts/rollback-production.sh scripts/deploy-lib.sh

# 5. First-time stack (postgres + minio + migrate + app)
docker compose -f docker-compose.production.yml --env-file .env.production up -d postgres minio
docker compose -f docker-compose.production.yml --env-file .env.production --profile tools run --rm minio-init
docker compose -f docker-compose.production.yml --env-file .env.production --profile tools run --rm migrate
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build api web

# 6. Create SUPER_ADMIN (once)
docker compose -f docker-compose.production.yml --env-file .env.production run --rm api \
  node -e "console.log('Use: docker compose run --rm --entrypoint sh api -c \"npm run admin:create -- --super true ...\"')"

# 7. Add deploy SSH public key for GitHub Actions
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# Paste the public key matching PRODUCTION_SSH_KEY into authorized_keys

# 8. Capture host key for GitHub secret PRODUCTION_SSH_KNOWN_HOSTS
ssh-keyscan -p 22 102.203.200.88
```

**Caddy** must already be configured separately and is not modified by these steps.

## Environment variables on the server

| File | Purpose |
|------|---------|
| `.env.production` | Primary production secrets (preferred) |
| `.env` | Fallback if `.env.production` is absent |

Deploy scripts **never overwrite** these files. Template only: `.env.production.example`.

Protected paths (gitignored):

- `.env`, `.env.production`, `.env.staging`
- `backend/.env`, `backend/.env.production`
- `frontend/.env.local`, `frontend/.env.production`
- `deploy-logs/`
- `*.pem`, `*.key`, SSH private keys

## Inspecting deployments

On the server:

```bash
cd ~/libya-freelance-mvp

# Git state
git status
git log -5 --oneline

# Containers
docker ps
docker compose -f docker-compose.production.yml --env-file .env.production ps

# Logs
docker compose -f docker-compose.production.yml --env-file .env.production logs -f api
docker compose -f docker-compose.production.yml --env-file .env.production logs -f web

# Latest deploy log
ls -lt deploy-logs/ | head
tail -100 deploy-logs/deploy-*.log | tail -100

# Preflight only (no deploy / no migrations)
./scripts/deploy-preflight.sh
# or
DEPLOY_DRY_RUN=1 ./scripts/deploy-production.sh
curl -fsS https://api.libyanfreelance.ly/api/health/ready
```

## Deployment failures

1. Check GitHub Actions log for the failed step.
2. SSH to server and read `deploy-logs/deploy-*.log`.
3. Check container logs (`docker compose logs api web`).
4. Verify `.env.production` is present and complete.
5. Confirm Caddy is still running (`systemctl status caddy` or `docker ps` for Caddy container).

## Rollback

Rollback **application code only** — database schema is **not** automatically reverted.

```bash
cd ~/libya-freelance-mvp

# Find previous good commit
git log --oneline -10

# Roll back
./scripts/rollback-production.sh <commit-sha>
```

Automatic rollback on failed health checks (optional):

```bash
export ENABLE_AUTO_ROLLBACK=true
./scripts/deploy-production.sh
```

If a **failed migration** was partially applied, restore from PostgreSQL backup or ship a forward-fix migration — do not use `prisma migrate reset`.

## Database migration safety

| Allowed | Forbidden |
|---------|-----------|
| `prisma migrate deploy` | `prisma migrate reset` |
| `prisma migrate status` | `prisma db push --force-reset` |
| Idempotent reference seed (`RUN_REFERENCE_SEED=true`) | `prisma:seed:demo` |
| | `docker compose down -v` |
| | Dropping `prod_pg_data` volume |

Migrations run in a one-off `migrate` container (`--profile tools`), not inside the running API process.

Reference seed (categories/skills/cities) is **off by default**. Enable once or when needed:

```bash
export RUN_REFERENCE_SEED=true
./scripts/deploy-production.sh
```

## Caddy independence

Production Caddy routes (already live):

| Host | Upstream |
|------|----------|
| `libyanfreelance.ly` | `localhost:3000` |
| `www.libyanfreelance.ly` | `localhost:3000` |
| `admin.libyanfreelance.ly` | `localhost:3000` |
| `api.libyanfreelance.ly` | `localhost:4000` |

- No `Caddyfile` is tracked in this repository.
- Deploy scripts do not restart or reconfigure Caddy.
- Keep Caddy config on the server outside the git deployment path (e.g. `/etc/caddy/Caddyfile`).

## Health endpoints

| Check | URL |
|-------|-----|
| API liveness | `GET https://api.libyanfreelance.ly/api/health` |
| API readiness (DB) | `GET https://api.libyanfreelance.ly/api/health/ready` |
| Marketplace | `https://libyanfreelance.ly` (HTTP 200 or redirect) |
| Admin | `https://admin.libyanfreelance.ly` (HTTP 200 or redirect to login) |

## Security rules

- Deploy **only** from `main` push or manual `workflow_dispatch`.
- **Never** deploy from `pull_request` workflows.
- SSH key and production `.env` values stay in GitHub Secrets / server only.
- GitHub Actions `permissions: contents: read` (minimal).

## Related docs

- `docs/DEPLOYMENT.md` — general deployment guide
- `backend/docs/STORAGE.md` — S3/MinIO configuration
- `.env.production.example` — variable template (no real secrets)
