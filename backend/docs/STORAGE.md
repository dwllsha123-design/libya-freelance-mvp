# Object Storage — Libya Freelance Backend

## Overview

Uploads flow through the NestJS API (authenticated). The backend validates authorization, ownership, MIME type, size, and magic bytes, then stores objects via the `StorageService` abstraction.

| Driver | Use case |
|--------|----------|
| `local` | Development and local E2E (`uploads/` directory) |
| `s3` | Staging and production (S3-compatible providers) |

**Production rule:** `NODE_ENV=production` requires `STORAGE_DRIVER=s3`. The application **fails startup** if local storage is selected in production.

## Environment variables

### Local (`STORAGE_DRIVER=local`)

| Variable | Description |
|----------|-------------|
| `STORAGE_DRIVER` | `local` (default in development) |
| `STORAGE_LOCAL_DIR` | Optional profile root (default: `./uploads/profiles`) |
| `STORAGE_PUBLIC_BASE_URL` | Public URL prefix for profile images |
| `STORAGE_PORTFOLIO_PUBLIC_BASE_URL` | Public URL prefix for portfolio images |

### S3-compatible (`STORAGE_DRIVER=s3`)

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_DRIVER` | Yes | Must be `s3` in staging/production |
| `S3_BUCKET` | Yes | Bucket name |
| `S3_ACCESS_KEY_ID` | Yes | Access key (never expose to frontend) |
| `S3_SECRET_ACCESS_KEY` | Yes | Secret key (never expose to frontend) |
| `S3_PUBLIC_BASE_URL` | Yes | Public CDN or bucket URL for marketplace images |
| `S3_ENDPOINT` | Provider-dependent | Custom endpoint (R2, Spaces, MinIO) |
| `S3_REGION` | No | Default `auto` (R2); use region for AWS |
| `S3_FORCE_PATH_STYLE` | No | `true` for MinIO/some providers; default `false` |

### Provider examples

**Cloudflare R2**

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=libya-freelance-staging
S3_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
S3_FORCE_PATH_STYLE=false
```

**DigitalOcean Spaces**

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<region>.digitaloceanspaces.com
S3_REGION=<region>
S3_BUCKET=libya-freelance-staging
S3_PUBLIC_BASE_URL=https://<bucket>.<region>.digitaloceanspaces.com
```

**AWS S3**

```
STORAGE_DRIVER=s3
S3_REGION=eu-central-1
S3_BUCKET=libya-freelance-staging
S3_PUBLIC_BASE_URL=https://<bucket>.s3.eu-central-1.amazonaws.com
```

## Object key layout

Original filenames are **never** used as storage paths.

| Asset | Key pattern |
|-------|-------------|
| Profile photo | `profile-images/{userId}/{uuid}.{ext}` |
| Portfolio image | `portfolio/{userId}/{portfolioItemId}/{uuid}.{ext}` |

Extensions derive from validated MIME type (`.jpg`, `.png`, `.webp`, `.gif` for profiles).

Traversal (`..`, `/`, `\`) in IDs is rejected.

## Public access policy

Profile and portfolio images are **intentionally public** marketplace content once uploaded. Upload endpoints remain authenticated.

Configure bucket/CDN for public read on object prefixes:

- `profile-images/*`
- `portfolio/*`

Do not make the entire bucket writable publicly.

## Upload / delete behavior

### Profile photo replacement

1. Upload new object to S3
2. Update database URL
3. Best-effort delete previous object

The old object is **not** deleted before the new upload succeeds.

### Portfolio images

Existing rules preserved: JPEG/PNG/WebP, 5 MB max, 5 images per item, ownership checks. Deletes authorize first, then remove DB row and storage object.

## Backup and lifecycle

- Enable versioning or periodic backup on the staging/production bucket
- Consider lifecycle rules for orphaned objects after DB cleanup jobs (post-MVP)
- Secrets rotate via provider IAM; never commit keys to git

## Testing

- Unit: `test/storage-upload.util.spec.ts`, `test/s3-storage.service.spec.ts`, `test/storage.module.spec.ts`
- E2E: portfolio authorization tests unchanged (`testStorage: true` in E2E)

## Verification checklist (staging)

1. Upload profile image via API
2. Upload portfolio image via API
3. Restart/redeploy API
4. Confirm images still load from `S3_PUBLIC_BASE_URL`
5. Delete portfolio image; confirm removal
