# Notification Indexes (Phase H)

## Primary list query

```sql
SELECT * FROM "Notification"
WHERE "userId" = $1
ORDER BY "createdAt" DESC
LIMIT $2 OFFSET $3;
```

## Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `Notification_userId_isRead_idx` | `(userId, isRead)` | Unread count, unread filter |
| `Notification_userId_createdAt_idx` | `(userId, createdAt DESC)` | Paginated list sorted by newest |

## Removed

- Standalone `createdAt` index — replaced by composite `(userId, createdAt)` which covers per-user chronological queries.

## Future retention (not implemented)

MVP retains all notifications. A future policy may archive or delete rows older than 6–12 months using `createdAt` with a batch job.
