# Dependency Vulnerability Audit

**Date audited:** 2026-09-01  
**Prisma version:** 6.19.3 (`@prisma/client` + `prisma` CLI)  
**Scope:** Libya Freelance MVP — backend (`backend/`) and frontend (`frontend/`)

---

## Executive summary

| Tree | Critical | High | Moderate | Low | Classification |
|------|----------|------|----------|-----|----------------|
| **Frontend** | 0 | 0 | 0 | 0 | **CLEAN** |
| **Backend runtime** (`npm ci --omit=dev`) | 0 | **0** | 0 | 0 | **No reachable HIGH/CRITICAL** |
| **Backend dev/migration tooling** (full `npm ci`) | 0 | **3** | 0 | 0 | **ACCEPTED DEV-TOOLING RISK** |

Production runtime isolation verified: `backend/scripts/verify-prod-deploy-boundary.mjs` (see `backend/docs/PROD_DEPLOY_BOUNDARY_REPORT.json`).

**Beta blocker from dependency audit:** **No** — provided deploy uses `npm ci --omit=dev` for runtime and migrations run in a separate build/CI job with the Prisma CLI.

---

## Frontend

```
cd frontend && npm audit
found 0 vulnerabilities
```

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 0 |

---

## Backend — development / migration tooling (3 HIGH)

These findings appear when auditing the **full** developer/CI install (`npm ci`). They are **not fixed** — they remain in the migration tooling chain until Prisma upstream updates `@prisma/config` / `deepmerge-ts`.

### Dependency chain

```
prisma@6.19.3 (devDependency)
  └── @prisma/config@6.19.3
        └── deepmerge-ts@7.x
```

### Full table

| Package | Installed version | Advisory | Dependency path | Classification | Reachable in deployed NestJS runtime? |
|---------|-------------------|----------|-----------------|----------------|--------------------------------------|
| `deepmerge-ts` | 7.x | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) — stack exhaustion merging recursive object graphs | `prisma` → `@prisma/config` → `deepmerge-ts` | Dev/migration tooling | **No** — absent after `npm ci --omit=dev` |
| `@prisma/config` | 6.19.3 | Same (transitive) | `prisma` → `@prisma/config` | Dev/migration tooling | **No** |
| `prisma` | 6.19.3 | Inherits above | direct `devDependencies` | Dev/migration tooling | **No** — CLI not in production `node_modules` |

### Why not present / reachable in final runtime

| Check | Result (verified 2026-09-01) |
|-------|------------------------------|
| `prisma` in `dependencies`? | **No** — listed under `devDependencies` only |
| `@prisma/client` in `dependencies`? | **Yes** — production runtime dependency |
| `prisma` package after `npm ci --omit=dev`? | **Absent** |
| `deepmerge-ts` after `npm ci --omit=dev`? | **Absent** |
| `vitest`, `typescript`, `@nestjs/cli` after `--omit=dev`? | **Absent** |
| NestJS boots from prod tree? | **PASS** — all modules + Socket.IO wire; fails only on DB connect when PostgreSQL unavailable |
| `@prisma/client` import in prod tree? | **PASS** — after copying `node_modules/.prisma` from build stage |

The vulnerable `deepmerge-ts` code executes during **Prisma CLI config merging** (`prisma generate`, `prisma migrate deploy`). The running API uses `@prisma/client` query engine only — a separate package tree without `deepmerge-ts`.

### Migration tooling exposure

| Exposure | Risk |
|----------|------|
| Attacker triggers `prisma migrate deploy` on production API pod | **Mitigated** — CLI not shipped to runtime; migrations run in CI/release job only |
| Attacker controls malicious `prisma` config merge in CI | **Low** — requires compromise of build pipeline or repo, not public API |
| Developer machine running `prisma` CLI | **Accepted** — local/CI tooling risk; stack exhaustion requires crafted recursive config |

### Planned upgrade path

1. Monitor Prisma releases for `@prisma/config` bump using `deepmerge-ts` ≥ 8.0.0
2. **Do not** run `npm audit fix --force` (suggests `prisma@6.12.0` downgrade — breaking)
3. Any Prisma upgrade must pass: lint → typecheck → unit (63) → E2E (123×2) → build
4. Re-run `npm run verify:prod-boundary` after upgrades

### Removed dev noise (2026-09-01)

`@nestjs/mau` removed — eliminated 5 additional HIGH findings (`undici`, `tmp`) with zero application impact.

---

## Backend — production runtime audit

After `npm ci --omit=dev --legacy-peer-deps` in an isolated runtime directory:

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | **0** (prisma/deepmerge-ts chain not installed) |

Production runtime includes `@aws-sdk/client-s3` (required for `STORAGE_DRIVER=s3`). Audit the **runtime bundle** (`npm run package:runtime`) separately from the full dev tree. As of 2026-09-01, `@aws-sdk/client-s3` introduces no HIGH/CRITICAL findings in the production dependency tree.

`npm audit` on the **full** developer install still reports 3 HIGH (Prisma CLI tooling only).

---

## Risk classification

### ACCEPTED DEV-TOOLING RISK

The 3 HIGH findings remain installed for **development and migration** workflows. They are **not** classified as "fixed."

Production runtime isolation is **verified**:

- Deploy pattern: **Pattern A — CI/Release migration job** (`docs/DEPLOYMENT.md`)
- Lockfile installs: **`npm ci`** only (never `npm install` in deploy)
- No `npm audit fix --force` in deploy pipelines

| Question | Answer |
|----------|--------|
| Remotely exploitable HIGH in production API process? | **No** |
| Dependency audit a Beta blocker? | **No** |

---

## Deploy hygiene checklist

1. **Migration job:** `npm ci` → `prisma generate` → `prisma migrate deploy` (CI already does this on PostgreSQL 16)
2. **Runtime:** `npm ci --omit=dev` → copy `dist/` + `node_modules/.prisma` from build → `node dist/main.js`
3. **Verify:** `npm run verify:prod-boundary` before each release
4. **Re-audit monthly:** `npm audit` in `frontend/` and `backend/` (full dev tree)

---

## References

- Deployment architecture: `docs/DEPLOYMENT.md`
- Production boundary report: `backend/docs/PROD_DEPLOY_BOUNDARY_REPORT.json`
- CI migration proof: `backend/docs/MVP_TEST_REPORT.md` (run 33552148568 — `migrate deploy` PASS)
