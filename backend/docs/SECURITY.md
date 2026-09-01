# Authentication Security Strategy

## Token Model

| Token | Storage | Lifetime | Transport |
|-------|---------|----------|-----------|
| Access JWT | **Memory only** (React state) | 15 minutes | `Authorization: Bearer` header |
| Refresh JWT | **httpOnly cookie** | 7 days | Cookie on `/api/auth` paths |

Access tokens are **never** stored in `localStorage` or `sessionStorage`.

On page reload, the frontend calls `POST /api/auth/refresh` using the httpOnly refresh cookie to obtain a new access token.

## Refresh Cookie Configuration

```
httpOnly: true
secure: true (production only)
sameSite: 'lax'
path: '/api/auth'
maxAge: 7 days
```

## Refresh Token Rotation

On every successful `POST /api/auth/refresh`:

1. The presented refresh token hash is looked up in the database.
2. The old `RefreshToken` row is **deleted** before issuing a new one.
3. A new refresh JWT is generated and stored (SHA-256 hash only).
4. A stolen/old refresh token cannot be reused after rotation.

## CSRF Considerations (Cookie-Based Refresh)

Refresh authentication uses a cookie, which creates CSRF exposure if an attacker can trigger cross-site POST requests.

**Mitigations in place:**

1. **`SameSite=Lax`** — cross-site POST requests from third-party sites do not include the cookie.
2. **Strict CORS** — only configured frontend origins may call the API with credentials.
3. **`X-Client-Request: libya-freelance`** — state-changing auth endpoints require this custom header, which simple cross-site forms cannot set.
4. **No GET refresh** — refresh is POST-only.

**Residual risk:** Same-site XSS could still exfiltrate tokens. Mitigate with CSP and input sanitization in later phases.

## Password Reset & Email Verification

- Tokens: `crypto.randomBytes(32)` (64 hex chars)
- Database stores **SHA-256 hashes only**
- Single-use (`usedAt` timestamp)
- Expiration enforced server-side
- Password reset revokes all refresh sessions for the user
- Forgot-password returns identical message whether email exists or not

## Rate Limiting

Per-endpoint limits on auth routes (in addition to a relaxed global limit):

| Endpoint | Limit |
|----------|-------|
| login | 10 / 15 min / IP |
| register | 5 / 15 min / IP |
| forgot-password | 5 / 15 min / IP |
| reset-password | 10 / 15 min / IP |
| refresh | 30 / 15 min / IP |

`trust proxy` is enabled so rate limits work behind Railway/Nginx reverse proxies.

## Account Status

| Status | Can authenticate? |
|--------|-------------------|
| ACTIVE | Yes |
| SUSPENDED | No |
| BANNED | No |

Email verification is tracked separately via `emailVerified` (does not block login in MVP).
