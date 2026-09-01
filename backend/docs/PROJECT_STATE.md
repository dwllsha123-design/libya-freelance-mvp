# Project Status Transitions (Phase C)

All project status mutations MUST go through `ProjectStateService` in
`src/projects/project-validation.util.ts`. Controllers and services must not
assign `project.status` directly.

## Allowed transitions (Phase C)

| From | To | Trigger | Method |
|------|-----|---------|--------|
| DRAFT | OPEN | Owner publishes complete draft | `transitionToOpen()` |
| DRAFT | CANCELLED | Owner cancels draft | `transitionToCancelled()` |
| OPEN | CLOSED | Owner closes listing | `transitionToClosed()` |
| OPEN | CANCELLED | Owner cancels open project | `transitionToCancelled()` |

## Phase D addition

| From | To | Trigger | Method |
|------|-----|---------|--------|
| OPEN | IN_PROGRESS | Client accepts a proposal (transactional) | `ProjectStateService.transitionToInProgress(acceptedProposalId)` |

When OPEN project is cancelled/closed with pending proposals, proposals transition to `REJECTED` inside a transaction.

## Editing with pending proposals (MVP rule)

Once a project has `PENDING` proposals, owner may only edit `description` and `deadline`. Structural fields (title, category, skills, budget, work mode, etc.) are blocked.

## Phase G addition

| From | To | Trigger | Method |
|------|-----|---------|--------|
| IN_PROGRESS | COMPLETED | Client confirms completion (transactional) | `ProjectStateService.transitionToCompleted()` |

Freelancer may request completion (`completionRequestedAt`) but cannot complete.

`IN_PROGRESS` projects cannot be CLOSED/CANCELLED via ordinary client actions.

## Not allowed in MVP

- `COMPLETED → OPEN` / `COMPLETED → IN_PROGRESS` reopen
- Freelancer self-completion (`IN_PROGRESS → COMPLETED`)
- Any transition from `CANCELLED`, `CLOSED` (except read-only access)

## Guard methods (updated)

- `assertCanEdit` — DRAFT, OPEN (with proposal restrictions in service)
- `assertCanDelete` — DRAFT only
- `assertCanPublish` — DRAFT only
- `assertCanClose` — OPEN only
- `assertCanCancel` — DRAFT or OPEN
- `assertCanRequestCompletion` — IN_PROGRESS (freelancer, accepted proposal)
- `assertCanComplete` — IN_PROGRESS (client owner)

## Hard delete

Only `DRAFT` projects may be hard-deleted by the owner.
