# Backup & Recovery (Operational)

Libya Freelance MVP does **not** include in-app backup software. Production/Beta operations must configure backups externally.

## PostgreSQL

- **Frequency:** daily automated backups minimum
- **Retention:** 14–30 days recommended for Beta
- **Restore testing:** monthly restore drill to a staging database
- **Tooling:** managed provider backups (Railway, Supabase, RDS, etc.) or `pg_dump` cron

## Object storage (portfolio/profile images)

- Enable bucket versioning or lifecycle rules where supported
- Replicate or export critical buckets periodically
- Document restore procedure for missing objects

## Secrets

- Store JWT and database credentials in platform secret manager
- Never commit `.env` files

## Recovery order

1. Restore PostgreSQL to point-in-time or latest snapshot
2. Run `npx prisma migrate deploy` only if schema drift detected (normally migrations already applied)
3. Verify `GET /api/health/ready`
4. Restore/re-link object storage if needed
5. Smoke test auth, project list, messaging

## RPO / RTO (Beta guidance)

- **RPO:** ≤ 24 hours (daily backups)
- **RTO:** platform-dependent; target < 4 hours for Beta
