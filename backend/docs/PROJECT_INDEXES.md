# Project Table Indexes

This document explains index choices on the `Project` and `ProjectSkill` models for Phase C marketplace queries.

## Query patterns

| Endpoint | Typical WHERE / ORDER BY |
|----------|--------------------------|
| `GET /projects` (public list) | `status = OPEN`, filters, `ORDER BY publishedAt` or budget |
| `GET /projects/manage` | `clientId = ?`, optional `status` |
| `GET /projects/slug/:slug` | `slug` (unique) + `status = OPEN` |
| Owner lookups | `id` (PK) + `clientId` ownership check |

## Justified indexes

### `@@index([status])`

**Justified.** Every public listing filters `status = OPEN`. High selectivity for marketplace discovery.

### `@@index([publishedAt])`

**Justified.** Default sort is `newest` / `oldest` on `publishedAt`. Combined with `status = OPEN`, this supports the primary browse experience.

**Note:** A composite `(status, publishedAt DESC)` could be added later if profiling shows benefit. For MVP, separate indexes are sufficient at expected scale.

### `@@index([clientId])`

**Justified.** Client dashboard lists all projects for one owner (`WHERE clientId = ?`).

### `@@index([categoryId])`

**Justified.** Category filter on public list (`category.slug` join). Frequently used filter.

### `@@index([workMode])`

**Justified.** Common filter on public browse. Moderate cardinality.

### `@@index([createdAt])`

**Justified.** Manage list orders by `updatedAt` today; `createdAt` supports admin/reporting and future sorts.

### `ProjectSkill @@index([projectId])` and `@@index([skillId])`

**Justified.** Skill filter uses `skills.some(skill.slug)`. `projectId` supports cascade deletes and join from project side; `skillId` supports reverse lookups.

## Indexes kept with lower immediate priority

### `@@index([cityId])`

**Potentially useful.** City filter is supported but may be less common than category/skill. Kept because city joins are used in filter UI and ON_SITE/HYBRID projects.

### `@@index([budgetType])`

**Potentially useful.** Lower-cardinality enum filter. Small write overhead; acceptable for MVP.

### `@@index([experienceLevel])`

**Potentially useful.** Same as `budgetType` — enum filter with low cardinality.

## Not indexed (deliberately)

- **`title` / `description`** — text search uses `ILIKE`/`contains`; full-text search indexes belong in a dedicated search phase.
- **`budgetMin` / `budgetMax`** — range filters on numeric fields; composite or BRIN indexes only if profiling demands.
- **`slug`** — already `@unique` (implicit unique index).

## ProjectSkill

No redundant indexes beyond `projectId` and `skillId`. Composite PK `(projectId, skillId)` covers lookups by both keys.

## Review conclusion

Current indexes match Phase C read paths without indexing every filter field blindly. Revisit composite `(status, publishedAt)` and budget range indexes after production traffic data.
