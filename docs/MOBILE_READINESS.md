# Mobile readiness (Libya Freelance)

Status: **backend + website prep only**. No React Native / Flutter / Xcode / Android Studio apps yet.

Active product: **WEB**  
Future: **iOS App**, **Android App**

## Domains

| Surface | Production | Staging (future mobile test builds) |
|---------|------------|-------------------------------------|
| Marketplace | `https://libyanfreelance.ly` | staging web host |
| Admin | `https://admin.libyanfreelance.ly` | staging admin |
| API | `https://api.libyanfreelance.ly` | `https://api-staging.libyanfreelance.ly` |

Environments: **LOCAL**, **STAGING**, **PRODUCTION**.

Store builds must call production API. Internal TestFlight / Play internal tracks call staging API.

## Shared API (single business-logic source)

NestJS remains the only place for:

- auth, profiles, projects, proposals, messages, portfolio, reviews, notifications, finance / commission rules

WEB, ADMIN, and future IOS/ANDROID are clients — they do not duplicate rules.

See also: [backend/docs/API_VERSIONING.md](../backend/docs/API_VERSIONING.md)

## Auth strategy

### WEB (unchanged)

- Short-lived access JWT (Bearer)
- Rotating refresh token in **HttpOnly Secure** cookie (`path=/api/auth`)

### Future native

- Same access + rotating refresh issuance from `AuthService`
- Refresh stored in **iOS Keychain** / **Android Keystore** only
- Never store refresh tokens in insecure local storage / SharedPreferences plaintext

## Device / session architecture

Prisma `UserDevice`:

- `platform`: WEB | IOS | ANDROID
- optional `pushToken`, `appVersion`
- `lastActiveAt`, `isActive`

`RefreshToken.deviceId` (nullable) links a refresh session to a device for future per-device revocation without breaking current WEB cookies.

Avoid unnecessary hardware identifiers.

## Push notifications

Flow:

1. Business event  
2. Persist `Notification` (source of truth)  
3. Socket.IO realtime emit  
4. Optional `PushNotificationService` fan-out (FCM / APNs)

`PushNotificationService` ships with a **noop** provider. Failures are logged and **must never** delete DB notifications.

Do not put FCM/APNs credentials in `PlatformSetting` / normal DB settings — use secret env / vault when apps ship.

## Realtime (Socket.IO)

- Current: single Nest instance + `IoAdapter`
- Mobile clients will authenticate the same way WEB sockets do (JWT on connect)
- Scale path (not implemented now): Redis Socket.IO adapter behind multiple API instances

## Object storage

Uploads from WEB / future IOS / ANDROID go through Nest authorization + `StorageService` (S3-compatible).

Never expose `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` to mobile clients.

## App config

Public safe endpoints:

- `GET /api/v1/app-config`
- `GET /api/platform/app-config`

Returns maintenance, version floors, store status, store URLs only when status is AVAILABLE/BETA, legal URLs, feature flags. **No secrets.**

## Admin mobile settings

`/admin/settings/mobile` (SUPER_ADMIN):

- iOS / Android status: COMING_SOON | BETA | AVAILABLE | MAINTENANCE  
- Latest / minimum supported versions  
- Store URLs (https only)  
- Mobile maintenance message  
- Mobile feature flags (all default **false**)

Initial: **IOS = COMING_SOON**, **ANDROID = COMING_SOON**.

## Feature flags (mobile)

| Flag | Initial |
|------|---------|
| MOBILE_ENABLED | false |
| MOBILE_MESSAGING | false |
| MOBILE_PORTFOLIO | false |
| MOBILE_REVIEWS | false |
| MOBILE_PAYMENTS | false |
| MOBILE_AI_MATCHING | false |

## Website “Coming Soon” badges

Homepage + footer show App Store / Google Play cards with Arabic **قريبًا**.

While status is COMING_SOON: buttons are **disabled** (no `href="#"`).  
When SUPER_ADMIN sets AVAILABLE + https store URL: badges become safe external links (`rel="noopener noreferrer"`).

## Deep links

See [DEEP_LINKS.md](./DEEP_LINKS.md).

## Account deletion (distribution readiness)

Documented lifecycle (implementation can complete before store submit):

1. User requests deletion (in-app / support)  
2. Account deactivated (`UserStatus` / login blocked)  
3. Personal profile fields anonymized where appropriate  
4. Immutable financial / escrow / audit history **retained** (no hard-delete of ledgers)  
5. Refresh tokens + devices revoked  

## Report / block (UGC readiness)

Schema prepared:

- `ContentReport` (USER | PROJECT | PORTFOLIO | REVIEW)  
- `UserBlock`

Private messages stay private unless a defined moderation report flow attaches evidence later. Do not dump full chat histories to admins by default.

## Legal URLs

Configurable: `privacyPolicyUrl`, `termsUrl`, `supportUrl` (https).  
Do not fabricate final legal prose here — pages already exist under WEB routes.

## Remaining work that needs Apple / Google developer accounts

- App Store Connect / Play Console apps  
- Signing certificates & provisioning (secrets vault — not DB)  
- Real FCM + APNs credentials wired into `PushNotificationProvider`  
- Universal Links / App Links association files  
- Production store URLs + status flip to AVAILABLE  
- Native iOS / Android codebases  

Until then, the public site must show **App Store — قريبًا** and **Google Play — قريبًا** with no fake store links.
