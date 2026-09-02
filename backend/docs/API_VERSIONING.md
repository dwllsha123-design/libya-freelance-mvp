# API versioning

## Current state (WEB)

- Global prefix: `/api`
- Existing marketplace + admin clients call unversioned routes, e.g.:
  - `POST /api/auth/login`
  - `GET /api/projects`
  - `GET /api/platform/site-config`

**Do not break these routes** while WEB remains the active product.

## Mobile / future clients

Prefer the versioned surface:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/app-config` | Safe mobile bootstrap (status, store URLs when AVAILABLE, legal URLs, feature flags) |

The same app-config payload is also available at:

- `GET /api/platform/app-config`

so WEB can consume it without migrating immediately.

## Compatibility strategy

1. **Additive first** — new mobile-oriented endpoints land under `/api/v1/*`.
2. **Unversioned stays stable** — WEB continues on `/api/*` until a planned cutover.
3. **Shared business logic** — controllers are thin; Nest services remain the single source of truth for auth, projects, proposals, messaging, portfolio, reviews, notifications, and finance rules.
4. **Deprecation window** — when a breaking change is required:
   - Ship `v2` (or a new field with a default).
   - Keep `v1` for at least one mobile store release cycle.
   - Document removal date in this file and release notes.
5. **No secrets in public versioned config** — never return JWT secrets, S3 keys, SMTP, FCM, or APNs credentials from `/api/v1/*` public routes.

## Auth contract (all clients)

| Client | Access token | Refresh token |
|--------|--------------|---------------|
| WEB | Bearer (memory) | HttpOnly Secure cookie (`/api/auth`) |
| Future iOS / Android | Bearer (memory / secure runtime) | Rotating refresh in Keychain / Keystore — **not** insecure local storage |

Token issuance, rotation, and revocation stay in `AuthService` for every client.

## Health

- `GET /api/health` remains unversioned for load balancers and uptime checks.
