# file-storage

## Description

Cloudflare R2 object storage for user-uploaded files (avatars, attachments,
exports). Uploads use pre-signed URLs so the browser posts directly to R2
without proxying through the Worker. File metadata (key, size, MIME type, owner)
is stored in D1. A configurable size limit and MIME allowlist are enforced
server-side before generating the pre-signed URL.

## Setup

1. Create an R2 bucket: `wrangler r2 bucket create <bucket-name>`
2. Generate R2 API tokens at Cloudflare Dashboard → R2 → Manage R2 API Tokens
   (grant Object Read & Write on the bucket).
3. Add the R2 binding to `wrangler.jsonc` (uncomment the `r2_buckets` line).
4. Set secrets via `wrangler secret put`:
   - `R2_ACCOUNT_ID` — your Cloudflare account ID
   - `R2_BUCKET_NAME` — the bucket name from step 1
   - `R2_ACCESS_KEY_ID` — from the R2 API token
   - `R2_SECRET_ACCESS_KEY` — from the R2 API token
5. Run `npm run db:migrate` (and `npm run db:migrate:remote` for production).

## Upload Flow

1. **Client** sends `POST /resources/uploads/presign` with JSON body
   `{ filename, contentType, size }`.
2. **Server** validates auth, enforces the MIME allowlist and size limit,
   creates a `pending` `files` row in D1, and returns `{ fileId, uploadUrl }`.
3. **Client** PUTs the file binary directly to `uploadUrl` (Cloudflare R2).
4. **Client** sends `PATCH /resources/uploads/:fileId` to mark the upload
   complete.

To delete a file: `DELETE /resources/uploads/:fileId`.

## Related Files

- `app/db/schema.ts` — `files` table definition.
- `app/utils/file-storage.server.ts` — presigned URL generation (AWS Sig V4),
  and `createPendingFile`, `confirmFileUpload`, `deleteFile` helpers.
- `app/routes/resources.uploads.presign/route.tsx` — `POST` action: validates
  request, returns `{ fileId, uploadUrl }`.
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
