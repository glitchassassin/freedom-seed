# file-storage

## Description

Cloudflare R2 object storage for user-uploaded files (avatars, attachments,
exports). Uploads use pre-signed URLs so the browser posts directly to R2
without proxying through the Worker. File metadata (key, size, MIME type, owner)
is stored in D1. A configurable size limit and MIME allowlist are enforced
server-side before generating the pre-signed URL.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
