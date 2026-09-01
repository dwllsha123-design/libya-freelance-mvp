# Portfolio Image Strategy (Phase F)

## Storage

- Images stored via `StorageService.uploadPortfolioImage()` — not in PostgreSQL.
- Local dev: `uploads/portfolio/{userId}/{portfolioItemId}/`
- Production-ready abstraction supports S3/R2/Spaces via same interface.

## Validation

- MIME: JPEG, PNG, WEBP only (server-side `file.mimetype`)
- Max size: 5MB per image
- Max count: 5 images per portfolio item

## Frontend optimization (MVP)

- Next.js `Image` component for layout + lazy loading
- Card views use cover image only (first `sortOrder`)
- Full gallery loaded only on detail modal/page
- Future: storage variants/thumbnails at upload time
