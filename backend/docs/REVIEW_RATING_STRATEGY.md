# Review Rating Strategy (Phase G)

## Source of truth

The **`Review` table** is the authoritative source for ratings.

## Cached aggregates (Strategy A)

`FreelancerProfile.averageRating` and `ClientProfile.averageRating` are **transactionally updated caches** recalculated from `Review` rows whenever a new review is submitted via `ReviewRatingService.refreshForUser()` / `recalculateUserRating()`.

`reviewCount` is **not cached** on profile tables — it is always derived from `Review` aggregates.

See [RATING_CACHE.md](./RATING_CACHE.md) for cache rules, transaction guarantees, and repair strategy.

`FreelancerProfile.completedProjects` increments when a project transitions to `COMPLETED`.

## Public display

- Profile endpoints expose `reviews.ratingAverage`, `reviews.reviewCount`, and up to 3 `latestReviews`
- Paginated history: `GET /freelancers/:username/reviews`, `GET /clients/:username/reviews`
- Directory/proposal cards use cached `averageRating` to avoid N+1 aggregate queries

## Rules

- Reviews immutable after submission (MVP)
- One review per direction per project (DB unique constraint)
- `reviewedUserId` derived server-side — never from client
