# Beta Readiness Checklist

Evidence:
- Automated: `backend/docs/MVP_TEST_REPORT.md` — CI run [33552148568](https://github.com/dwllsha123-design/libya-freelance-mvp/actions/runs/33552148568)
- Web QA: `docs/WEB_QA_REPORT.md`
- Staging: `docs/STAGING_SMOKE_REPORT.md`
- Dependencies: `docs/DEPENDENCY_AUDIT.md`

## Database

- [x] `prisma migrate deploy` succeeds on empty PostgreSQL (CI)
- [x] `prisma migrate status` shows all migrations applied (9)
- [x] Reference seed (`npm run prisma:seed`) works (CI)
- [x] Reference seed idempotent (CI)
- [x] Demo seed blocked in production (code guard in `prisma/seed-demo.ts`; not executed on staging)

## Security

- [x] JWT validated + DB status checked on every protected HTTP request
- [x] Suspend/ban revokes refresh tokens
- [x] Suspend/ban disconnects active sockets (single instance)
- [x] CORS explicit origins (no wildcard with credentials)
- [x] CSRF header on cookie auth routes
- [x] File upload MIME/size validation
- [x] No passwordHash/tokens in API responses (audited in hardening)
- [x] No unresolved remotely exploitable HIGH runtime dependency (see `DEPENDENCY_AUDIT.md`)

## Authentication

- [x] Register/login/refresh/logout flow (E2E)
- [x] Refresh token rotation invalidates old token (E2E + `jti` fix)
- [x] Password reset revokes sessions (E2E)
- [x] Suspended/banned blocked immediately on protected routes (E2E)
- [x] ADMIN not registrable publicly (E2E)

## Marketplace modules

- [x] Projects lifecycle (draft → open → in progress → completed)
- [x] Proposals (submit, accept, concurrency)
- [x] Messaging REST + Socket.IO
- [x] Portfolio + images
- [x] Reviews + rating cache
- [x] Notifications REST + realtime
- [x] Admin panel + audit log

## Storage

- [x] Production storage strategy documented (S3-compatible)
- [ ] Object storage verified on staging (not deployed)
- [x] Local uploads acceptable for dev/test; production requires object storage

## Responsive / UX

- [x] P0 mobile nav + messages layout fixes applied (code)
- [ ] Full responsive matrix browser-verified (390–1920px) on staging
- [x] RTL fixes applied (BackLink, logical positioning) — partial code review
- [ ] Loading/empty/error states manually verified in browser

## Deployment

- [x] `docs/DEPLOYMENT.md` complete
- [x] `backend/docs/BACKUP_RECOVERY.md` complete
- [x] CI workflow configured and passing (pre-QA-fixes run)
- [ ] Staging deployed (`staging.libyafreelance.ly` / `api-staging.libyafreelance.ly`)
- [ ] HTTPS cookies verified on staging
- [ ] CORS + Socket.IO verified on real hosts

## Tests

- [x] All E2E suites pass on PostgreSQL (123/123, run 1)
- [x] All E2E suites pass on PostgreSQL (123/123, run 2)
- [x] Zero required E2E skipped in CI
- [x] MVP happy-path E2E passes
- [x] MVP security journey E2E passes
- [x] Unit tests pass (63/63)
- [ ] CI re-run after Web QA fixes (pending push)

## Monitoring

- [x] Health/readiness endpoints implemented (`/api/health`, `/api/health/ready`)
- [ ] Health/readiness configured on hosting platform
- [x] Structured error logging (no secrets in logs)

---

## Classification

### **NOT YET BETA READY**

**Complete:**
- Automated CI on PostgreSQL 16 (123/123 E2E ×2, 63 unit, migrations, builds)
- P0/P1 mobile web fixes (navbar, messages, RTL, admin tables)
- Dependency audit: frontend 0 vulns; backend 3 HIGH dev-only Prisma CLI chain (accepted)
- Removed unused `@nestjs/mau` (eliminated 5 spurious HIGH findings)

**Blocking:**
1. **Staging not deployed** — no HTTPS smoke, cookies, CORS, Socket.IO, or storage persistence verification
2. **Full manual responsive/browser QA** not executed at all viewports on deployed staging
3. **Safari/WebKit:** NOT TESTED
4. **End-to-end staging marketplace flow** (CLIENT/FREELANCER/ADMIN) — NOT TESTED on real hosts

**Next steps to reach BETA READY:**
1. Provision staging (managed PostgreSQL, S3-compatible storage, separate secrets)
2. Deploy frontend + API; run `prisma migrate deploy`; `npm run admin:create`
3. Execute `docs/STAGING_SMOKE_REPORT.md` checklist on HTTPS
4. Complete browser responsive matrix per `docs/WEB_QA_REPORT.md`
5. Re-run CI after QA fixes merged
