# Dependency Vulnerability Audit

**Date:** 2026-09-01  
**Scope:** Libya Freelance MVP — backend (`backend/`) and frontend (`frontend/`)

## Summary

| Package tree | Critical | High | Moderate | Low | Total |
|--------------|----------|------|----------|-----|-------|
| Frontend | 0 | 0 | 0 | 0 | **0** |
| Backend (after removing `@nestjs/mau`) | 0 | 3 | 0 | 0 | **3** |

Frontend: `npm audit` — **0 vulnerabilities**.

Backend: `npm audit` — **3 high** (single chain via Prisma CLI tooling).

---

## Backend HIGH vulnerabilities (full table)

| Package | Installed version | Advisory | Dependency path | Prod runtime or dev-only? | Vulnerable code reachable in deployed NestJS app? | Recommended fix | Breaking-change risk |
|---------|-------------------|----------|-----------------|---------------------------|---------------------------------------------------|-----------------|----------------------|
| `deepmerge-ts` | 7.x (transitive) | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) — stack exhaustion when merging recursive object graphs | `prisma` → `@prisma/config` → `deepmerge-ts` | **Dev/build-time only** — used by Prisma CLI for config merging during `prisma generate`, `migrate deploy`, etc. Not bundled into `dist/` or imported by `backend/src`. | **No** — NestJS production runtime uses `@prisma/client` only; no `deepmerge-ts` in application code or production `node_modules` prod tree for API process if deploy uses `npm ci --omit=dev`. | Wait for Prisma release that bumps `@prisma/config` / `deepmerge-ts` ≥ 8.0.0. `npm audit fix --force` suggests downgrading to `prisma@6.12.0` (semver-major regression). | **High** if forced downgrade |
| `@prisma/config` | 6.19.3 (transitive) | Same as `deepmerge-ts` (depends on vulnerable range) | `prisma` → `@prisma/config` | **Dev-only** (Prisma CLI) | **No** in API runtime | Same as above | **High** if forced downgrade |
| `prisma` | 6.19.3 (direct devDependency) | Inherits `@prisma/config` / `deepmerge-ts` advisory | Direct devDependency | **Dev-only** in `package.json` — CLI for migrations/generate. Production deploy should run `npm ci --omit=dev` after `prisma generate` in build stage. | **No** — `@prisma/client@6.19.3` does not depend on `deepmerge-ts`. | Monitor Prisma 6.20+ / 7.x release notes for patched `@prisma/config`. | Low for routine patch upgrade when available |

### Removed dev noise (2026-09-01)

`@nestjs/mau@^0.2.6` was removed from `backend/package.json`. It was unused in `backend/src` and pulled in vulnerable `undici`, `tmp`, and `inquirer` chains. Removal eliminated **5 additional HIGH** audit findings with zero application impact.

### Previously reported HIGH (resolved by removal)

| Package | Was via | Status |
|---------|---------|--------|
| `undici` | `@nestjs/mau` | **Removed** — dev-only, not in runtime |
| `tmp` | `@nestjs/mau` → `inquirer` → `external-editor` | **Removed** — dev-only |

---

## Risk assessment — Beta gate

| Finding | Remotely exploitable in staging/production API? | Beta blocker? |
|---------|--------------------------------------------------|---------------|
| `deepmerge-ts` via Prisma CLI | **No** — requires attacker to control Prisma config merge input during developer/CI migrate operations | **No** — justified accept with deploy hygiene (`--omit=dev`, migrate in CI/build only) |
| Former `undici`/`tmp` via `@nestjs/mau` | **No** — package removed | **Resolved** |

**Conclusion:** No unresolved **remotely exploitable HIGH runtime** vulnerability identified in production dependency tree after `@nestjs/mau` removal and dev/prod separation.

---

## Frontend audit

```
cd frontend && npm audit
found 0 vulnerabilities
```

No critical or high findings. Re-run before each release.

---

## Recommended deploy hygiene

1. Build stage: `npm ci && npx prisma generate && npm run build`
2. Production image/runtime: `npm ci --omit=dev` (excludes `prisma` CLI and vulnerable dev chain from running container)
3. Migrations: run `npx prisma migrate deploy` in CI or one-shot release job, not from public API pods
4. Re-audit monthly: `npm audit` in both `backend/` and `frontend/`
