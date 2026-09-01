# Rating Cache (Pre-Phase H)

## Source of truth

The **`Review` table** remains the authoritative source for all ratings and review counts.

## Cached fields

| Field | Table | Cached? |
|-------|-------|---------|
| `averageRating` | `FreelancerProfile`, `ClientProfile` | Yes — aggregate cache |
| `reviewCount` | — | **No** — always computed from `Review` rows |

`reviewCount` is never stored on profile tables. Public endpoints compute it via `Review.aggregate()` or `COUNT(*)`.

## When the cache updates

`ReviewRatingService.refreshForUser(userId, tx?)` runs **inside the same Prisma transaction** as `Review.create` in `ReviewsService.submitReview()`.

If the review insert fails (validation, unique constraint, etc.), the cache is **not** updated.

If the transaction rolls back, both the review row and cache update roll back together.

Notification creation happens **after** the transaction commits successfully.

## Public data derivation

- Paginated review lists query `Review` directly.
- Profile `reviews.ratingAverage` / `reviews.reviewCount` in `getRatingSummary()` aggregate from `Review`.
- Directory cards use cached `averageRating` for performance; count uses live aggregate where displayed.

## Maintenance / repair

Use the internal helper (not exposed via HTTP):

```typescript
ReviewRatingService.recalculateUserRating(userId)
```

This recomputes `averageRating` from all **visible** `Review` rows (`isVisible = true`) where `reviewedUserId = userId` and updates the appropriate profile cache.

Admin hide/restore (`POST /admin/reviews/:id/hide|restore`) runs moderation and `recalculateUserRating()` in the same transaction so hidden reviews stop contributing immediately.

### When to run repair

- After manual database fixes
- After suspected cache drift
- As part of future admin maintenance tooling

### Batch repair (future ops script)

```sql
-- Identify users with reviews
SELECT DISTINCT "reviewedUserId" FROM "Review";
```

Then call `recalculateUserRating` per user ID from a maintenance script or admin job.

## Do not

- Treat profile `averageRating` as independently editable
- Accept rating values from the client for profile fields
- Update cache outside a review transaction without running full recalculation

See also: [REVIEW_RATING_STRATEGY.md](./REVIEW_RATING_STRATEGY.md)
