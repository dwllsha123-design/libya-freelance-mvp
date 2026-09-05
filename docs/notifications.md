# Notification System

Production notification stack for Libya Freelance. Extends the existing Phase H inbox + Socket.IO realtime layer — it does **not** replace it.

## Architecture

```
Business Event
  → NotificationsService.notify() / queue job
  → Preferences + Deduplication + Rate limits
  → PostgreSQL Notification row (source of truth)
  → Realtime (Socket.IO room user:{id})
  → Queue fan-out
       ├─ Web Push (VAPID) + UserDevice mobile tokens
       └─ Email (SMTP via EmailService) for important types only
  → NotificationLog (channel delivery + retries)
```

## Database

Migration: `20250905030000_phase_q_notification_system`

| Table | Purpose |
|-------|---------|
| `Notification` | Inbox (+ `data`, `entityType`, `entityId`, `priority`, `dedupeKey`, `readAt`) |
| `NotificationPreference` | Per-user category channel toggles |
| `PushSubscription` | Web Push endpoints (VAPID) |
| `NotificationLog` | Delivery attempts / failures |
| `NotificationReminder` | Idempotent deadline reminders |
| `Profile.preferredLocale` | `ar` \| `en` for copy + email |

`UserDevice` remains the mobile push token store (noop provider until FCM/APNs secrets exist).

## Notification types

Existing types kept for compatibility. Added:

- `PROJECT_MATCHED`, `PROJECT_MATCHED_DIGEST`
- `PROJECT_STARTED`, `PROJECT_DEADLINE_APPROACHING`, `PROJECT_DEADLINE_6H`, `PROJECT_OVERDUE`
- `PROPOSAL_WITHDRAWN`
- `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `ESCROW_REFUNDED`
- `POINTS_EARNED`, `POINTS_SPENT`, `LOW_POINTS`, `INSUFFICIENT_POINTS`
- `PROFILE_COMPLETED`, `ACCOUNT_SECURITY_ALERT`
- `SYSTEM_ANNOUNCEMENT`, `MAINTENANCE`, `IMPORTANT_UPDATE`

Priorities: `LOW` | `NORMAL` | `HIGH` | `CRITICAL`.

## Events wired today

| Trigger | Notification |
|---------|--------------|
| Project published | `PROJECT_MATCHED` / digest (queued, skill overlap) |
| Proposal created | `NEW_PROPOSAL` (+ points spent) |
| Proposal accepted | `PROPOSAL_ACCEPTED` + `PROJECT_STARTED` (client) |
| Proposal rejected | `PROPOSAL_REJECTED` |
| New message | `NEW_MESSAGE` (aggregated) |
| Completion request / complete | existing completion types |
| Escrow fund/release/dispute | existing escrow types |
| Payment final success/fail | `PAYMENT_*` |
| Nuqati credit/debit | `POINTS_*` (+ low / insufficient) |
| Deadline scheduler | 24h / 6h / overdue (idempotent) |
| Admin broadcast | `ADMIN_BROADCAST` |

## API

Auth required unless noted.

| Method | Path |
|--------|------|
| GET | `/api/notifications` (`category`, `status`, `type`, pagination) |
| GET | `/api/notifications/unread-count` |
| GET | `/api/notifications/latest` |
| POST | `/api/notifications/:id/read` |
| PATCH | `/api/notifications/:id/read` |
| PATCH | `/api/notifications/:id/unread` |
| POST | `/api/notifications/read-all` |
| DELETE | `/api/notifications/:id` |
| DELETE | `/api/notifications` |
| GET/PATCH | `/api/notifications/preferences` |
| GET | `/api/notifications/push/public-key` (**public**) |
| POST | `/api/notifications/push-subscriptions` |
| DELETE | `/api/notifications/push-subscriptions/:id` |
| GET | `/api/admin/notifications/stats` |
| POST | `/api/admin/notifications/broadcast` |

## Frontend

- Bell dropdown (navbar) + `/notifications` center with category tabs
- `/settings/notifications` preferences + Web Push opt-in
- Realtime toast host (`notification:new`)
- Service worker: `frontend/public/sw.js`

## Push setup

1. `npx web-push generate-vapid-keys`
2. Set `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, optional `PUSH_VAPID_SUBJECT`
3. Users enable push from Settings → Notifications (HTTPS required in production)

Without keys the provider stays `noop` and inbox/realtime still work.

## Email setup

Uses existing SMTP (`EMAIL_FROM`, `SMTP_*`). Notification emails go only to **email-eligible** types (payments, escrow, proposal accepted, security, broadcasts, etc.) and only when the user preference allows email.

Templates: bilingual shell in `notification-email-templates.ts` with CTA + preferences link.

## Environment variables

```bash
PUSH_VAPID_PUBLIC_KEY=
PUSH_VAPID_PRIVATE_KEY=
PUSH_VAPID_SUBJECT=mailto:support@libyanfreelance.ly
# plus existing SMTP_* / EMAIL_FROM
```

## Queue & retries

In-process `NotificationQueueService` with exponential backoff (max 3 attempts). Swap later for Redis/Bull without changing `notify()` callers.

## Safeguards

- Ownership checks on all inbox mutations
- Internal `targetUrl` paths only
- Deduplication via `dedupeKey`
- Match rate limit + digest grouping
- Deadline reminders unique per `(projectId, reminderType)`
- No secrets in notification payloads / logs

## Deployment

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run build

cd ../frontend
npm run build
```

Verify: SMTP in production, VAPID keys if push needed, Socket.IO CORS origins, service worker served from the marketplace origin.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| No realtime | Socket auth token + `user:{id}` room join |
| No push | VAPID env, HTTPS, permission, `/sw.js` |
| No email | SMTP config + preference + type eligibility |
| Duplicate matches | `dedupeKey` / reminder unique indexes |
| Slow publish | Matching is queued — should not block HTTP |
