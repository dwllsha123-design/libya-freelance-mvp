# Database Index Review (MVP)

Indexes are intentional — not every column is indexed.

## Projects

| Index | Purpose |
|-------|---------|
| `status`, `publishedAt` | Public listing filters and sort |
| `clientId` | Client dashboard |
| `categoryId` | Category filter |
| `slug` UNIQUE | Public detail URLs |

## Proposals

| Index | Purpose |
|-------|---------|
| `(projectId, freelancerId)` UNIQUE | One proposal per freelancer per project |
| `projectId`, `status` | Client proposal list, acceptance |
| `freelancerId` | Freelancer "my proposals" |

## Project.acceptedProposalId

Unique when set — enforces at most one accepted proposal reference per project.

## Messages

| Index | Purpose |
|-------|---------|
| `(conversationId, createdAt)` | Cursor pagination |
| `senderId` | Sender lookups |

## Conversations

| Index | Purpose |
|-------|---------|
| `proposalId` UNIQUE | One conversation per proposal |

## Notifications

| Index | Purpose |
|-------|---------|
| `(userId, createdAt)` | User feed pagination |
| `(userId, isRead)` | Unread count |

## Reviews

| Index | Purpose |
|-------|---------|
| `(projectId, reviewerId)` UNIQUE | One review per participant per project |
| `(reviewedUserId, isVisible)` | Public profile + rating cache |

## AdminAuditLog

| Index | Purpose |
|-------|---------|
| `adminId`, `action`, `createdAt` | Admin audit filters |
| `(entityType, entityId)` | Entity history lookup |

## Skills / Categories

| Index | Purpose |
|-------|---------|
| `isActive`, `sortOrder` | Public active lists |

## Notes

- No redundant duplicate indexes identified in current migration chain.
- Rating `averageRating` is cached on profiles; `reviewCount` is computed live.
- Full-text search uses `contains` / `insensitive` — acceptable for MVP scale; consider PostgreSQL FTS post-MVP if needed.
