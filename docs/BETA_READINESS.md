# Beta Readiness Checklist

Only check items verified with evidence in `backend/docs/MVP_TEST_REPORT.md`.

## Database

- [ ] `prisma migrate deploy` succeeds on empty PostgreSQL
- [ ] `prisma migrate status` shows all migrations applied
- [ ] Reference seed (`npm run prisma:seed`) works
- [ ] Demo seed blocked in production

## Security

- [ ] JWT validated + DB status checked on every protected request
- [ ] Suspend/ban revokes refresh tokens
- [ ] Suspend/ban disconnects active sockets (single instance)
- [ ] CORS explicit origins (no wildcard with credentials)
- [ ] CSRF header on cookie auth routes
- [ ] File upload MIME/size validation
- [ ] No passwordHash/tokens in API responses

## Authentication

- [ ] Register/login/refresh/logout flow
- [ ] Password reset revokes sessions
- [ ] Suspended/banned blocked immediately on protected routes
- [ ] ADMIN not registrable publicly

## Marketplace modules

- [ ] Projects lifecycle (draft → open → in progress → completed)
- [ ] Proposals (submit, accept, concurrency)
- [ ] Messaging REST + Socket.IO
- [ ] Portfolio + images
- [ ] Reviews + rating cache
- [ ] Notifications REST + realtime
- [ ] Admin panel + audit log

## Storage

- [ ] Production storage strategy documented (S3-compatible)
- [ ] Local uploads not used for scaled production

## Responsive / UX

- [ ] Mobile layouts (390px) usable
- [ ] Arabic RTL correct
- [ ] Loading/empty/error states on MVP routes

## Deployment

- [ ] `docs/DEPLOYMENT.md` complete
- [ ] `backend/docs/BACKUP_RECOVERY.md` complete
- [ ] CI workflow configured

## Tests

- [ ] All E2E suites pass on PostgreSQL test database
- [ ] MVP happy-path E2E passes
- [ ] MVP security journey E2E passes
- [ ] Unit tests pass

## Monitoring

- [ ] Health/readiness endpoints configured in hosting platform
- [ ] Structured error logging (no secrets in logs)
