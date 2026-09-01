# Auth & Session Invalidation

## Access tokens (JWT)

Access JWTs are **signed credentials**, not authorization by themselves.

Every protected HTTP request passes through `JwtAuthGuard` → `JwtStrategy.validate()`, which:

1. Verifies JWT signature and expiry
2. Loads the user from PostgreSQL (`id`, `role`, `status`, …)
3. Rejects missing users and non-`ACTIVE` accounts via `assertUserCanAuthenticate()`

**Suspended/banned users lose access on the next protected request**, even if their access token has not expired. The JWT payload `status` field is never trusted for authorization.

## Refresh tokens

Stored hashed in `RefreshToken`. Rotation deletes the previous row on successful refresh.

Revoked (all rows deleted) when:

- Admin **suspend** or **ban**
- **Password reset** completes
- **Logout** (current refresh cookie only)

After revocation, `POST /api/auth/refresh` returns `401`.

## Realtime (Socket.IO)

On connect, `MessagingService.verifySocketToken()` verifies JWT and loads persisted `User.status`.

On **suspend**, **ban**, or **password reset**:

- All refresh tokens are deleted
- `RealtimeSessionService.disconnectUser(userId)` disconnects sockets in `user:{userId}`

Sensitive socket handlers re-check persisted status before:

- `conversation:join`
- `message:send`
- `typing:start` / `typing:stop`

## What is NOT invalidated immediately

Access JWTs remain cryptographically valid until expiry, but **cannot be used** for protected HTTP or socket actions because `JwtStrategy` / `verifySocketToken` / `assertActiveUser` reload status from PostgreSQL on every request/action.

## Multi-instance note

`RealtimeSessionService` disconnects sockets on the current Node process only. Horizontal scaling requires a Socket.IO Redis adapter for cluster-wide disconnect.

## Admin provisioning

`ADMIN` accounts are not creatable via public registration. Use `npm run admin:create`.
