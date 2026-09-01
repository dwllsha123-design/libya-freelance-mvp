# Admin Security (Phase I)

## Backend RBAC

All `/admin/*` routes require:

1. Valid JWT access token (`JwtAuthGuard`)
2. `User.status === ACTIVE` (checked in `JwtStrategy.validate` and `RolesGuard`)
3. `User.role === ADMIN` (`@Roles(Role.ADMIN)` + `RolesGuard`)

| Caller | Typical response |
|--------|------------------|
| Anonymous | `401 Unauthorized` |
| CLIENT / FREELANCER | `403 Forbidden` |
| SUSPENDED / BANNED (including admin) | `401 Unauthorized` at JWT validation |

Frontend `/admin` layout redirects non-admins; this is UX only — authorization is enforced on every API call.

## Admin provisioning

- Public registration cannot create `ADMIN` users.
- Production admins: `npm run admin:create -- --email ... --password ... --firstName ... --lastName ...`
- Development demo admin (non-production only): `demo-admin@seed.ly` via `prisma/seed-demo.ts`

Never seed predictable production credentials (`admin@admin.com` / `admin123`).

## User moderation

- Suspend/ban revokes all `RefreshToken` rows for the target user.
- Existing access tokens remain valid until expiry, but the next protected request re-validates status from DB and returns `401`.
- Admin cannot suspend/ban themselves or other admins (MVP).

## Socket behavior

When an admin suspends/bans a user (or password is reset):

- All `RefreshToken` rows are deleted
- `RealtimeSessionService.disconnectUser()` disconnects sockets in `user:{userId}` (best-effort, current Node instance)
- Socket handlers re-validate persisted `User.status` before join/send/typing

On reconnect or the next authenticated HTTP request, JWT validation loads current status from DB and rejects non-`ACTIVE` accounts.

Multi-instance: socket disconnect requires Socket.IO Redis adapter for cluster-wide eviction.

## Audit log

- Append-only `AdminAuditLog` records important mutations.
- Metadata must never include passwords, JWTs, or refresh tokens.
- No public or user-facing audit endpoints.

See also: [ADMIN_PROJECT_MODERATION.md](./ADMIN_PROJECT_MODERATION.md)
