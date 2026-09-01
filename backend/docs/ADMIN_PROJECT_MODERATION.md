# Admin Project Moderation Policy (Phase I)

## Allowed admin actions

| Status | Admin may close? |
|--------|------------------|
| DRAFT | Yes |
| OPEN | Yes |
| IN_PROGRESS | **No** — read-only |
| COMPLETED | **No** — read-only |
| CANCELLED | No (already terminal) |
| CLOSED | No (idempotent) |

## Rationale

Closing an active engagement (`IN_PROGRESS`) or a completed project from the admin panel could harm freelancers and clients without a formal dispute workflow. Admin inspection is allowed; destructive intervention on active engagements is deferred to a future disputes phase.

## Implementation

`POST /admin/projects/:id/close` uses `ProjectStateService.transitionToClosed()` only when status is `DRAFT` or `OPEN`.
