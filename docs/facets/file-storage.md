# file-storage

## Description

Cloudflare R2 object storage for user-uploaded files (avatars, attachments,
exports). Uploads use pre-signed URLs so the browser posts directly to R2
without proxying through the Worker. File metadata (key, size, MIME type, owner)
is stored in D1. A configurable size limit and MIME allowlist are enforced
server-side before generating the pre-signed URL. `image/svg+xml` is excluded
from the allowlist — SVGs can contain embedded JavaScript and become XSS
vectors.

## Setup

1. Create an R2 bucket: `wrangler r2 bucket create <bucket-name>`
2. Generate R2 API tokens at Cloudflare Dashboard → R2 → Manage R2 API Tokens
   (grant Object Read & Write on the bucket).
3. Add the R2 binding to `wrangler.jsonc` (uncomment the `r2_buckets` line).
4. Set non-secret config in `wrangler.jsonc` vars: `R2_ACCOUNT_ID`,
   `R2_BUCKET_NAME`.
5. Set secrets via `wrangler secret put`:
   - `R2_ACCESS_KEY_ID` — from the R2 API token
   - `R2_SECRET_ACCESS_KEY` — from the R2 API token
6. Run `npm run db:migrate` (and `npm run db:migrate:remote` for production).

## Upload Flow

1. **Client** sends `POST /resources/uploads/presign` with JSON body
   `{ filename, contentType, size }`.
2. **Server** validates auth, enforces the MIME allowlist and size limit,
   creates a `pending` `files` row in D1, and returns `{ fileId, uploadUrl }`.
3. **Client** PUTs the file binary directly to `uploadUrl` (Cloudflare R2).
4. **Client** sends `PATCH /resources/uploads/:fileId` to mark the upload
   complete (returns 404 if file is not found or already confirmed).

To delete a file: `DELETE /resources/uploads/:fileId`.

## Known Limitations

**Stale pending files**: if a client requests a presigned URL but never
completes the upload (e.g. page navigation or network failure), a `pending` row
remains in D1 indefinitely. To clean these up, schedule a periodic query that
deletes `files` rows where `status = 'pending'` and `created_at` is older than
your chosen TTL (e.g. 24 hours). A Cloudflare Cron Trigger is the natural
mechanism for this.

## Related Files

- `app/db/schema.ts` — `files` table definition.
- `app/utils/file-storage.server.ts` — presigned URL generation (AWS Sig V4),
  `isR2Configured`, and `createPendingFile`, `confirmFileUpload`, `deleteFile`.
- `app/routes/resources.uploads.presign/route.tsx` — rate-limited `POST` action:
  validates request, returns `{ fileId, uploadUrl }`.
- `app/routes/resources.uploads.$fileId/route.tsx` — `PATCH` (confirm) and
  `DELETE` actions.
- `workers/env.ts` — `FILE_BUCKET`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` env entries.
- `wrangler.jsonc` — `r2_buckets` binding (commented out; configure to enable).
- `migrations/0009_mature_zaran.sql` — migration adding the `files` table.

## Removal

1. Delete `app/utils/file-storage.server.ts`.
2. Delete `app/routes/resources.uploads.presign/` and
   `app/routes/resources.uploads.$fileId/`.
3. Remove the `files` table from `app/db/schema.ts` and run
   `npm run db:generate`.
4. Remove `FILE_BUCKET`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`,
   and `R2_SECRET_ACCESS_KEY` from `workers/env.ts` and `wrangler.jsonc`.
