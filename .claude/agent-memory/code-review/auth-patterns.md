# Auth Patterns -- Review Findings

## Security Checklist for Auth Code

- Password reset tokens MUST be hashed (SHA-256) before DB storage
- Login must normalize timing: always run verifyPassword even when user not
  found (use a dummy hash) to prevent email enumeration via timing
- Multi-table mutations (user + credential) MUST use D1 batch/transaction
- `redirectTo` query params MUST be validated as relative paths (no `//` prefix)
  to prevent open redirects
- All reset tokens for a user should be invalidated when password is changed
- Argon2id memorySize (19456 KiB / ~19 MB) needs empirical testing on Workers

## Session Cookie Design

- Cookie name: `en_session`
- Format: `{base64url(32-byte-token)}.{base64url(HMAC-SHA256)}`
- DB stores raw token as `sessions.id` (NOT the signed form)
- 7-day sliding Max-Age (re-issued every request via root middleware)
- 30-day absolute TTL enforced by `sessions.expiresAt` in D1

## Route Conventions for Auth

- Guest-only routes nest under `_auth/` (pathless layout)
- Auth-required routes nest under `_authenticated/` (pathless layout)
- `_authenticated` appends `?redirectTo=` -- login action must honor it
- Logout is POST-only at `/resources/logout` with GET redirecting to `/`
- `route.tsx` naming convention used (note: MEMORY says `index.tsx` preferred --
  may be a migration in progress)

## Implemented Security Fixes (2026-02-21 review)

- [x] Token hashing: `createPasswordResetToken` stores SHA-256 hash,
      `findPasswordResetToken` re-hashes before lookup
- [x] Timing normalization: login uses lazy `DUMMY_HASH` for missing users
- [x] Atomic signup: `db.batch()` for user + credential inserts
- [x] `redirectTo` validation: `startsWith('/') && !startsWith('//')`
- [x] Token invalidation: `invalidatePasswordResetTokens` marks all user tokens
- [x] `sessions_user_id_idx` index added to schema

## Open Issues (2026-02-21 review)

- `invalidatePasswordResetTokens` overwrites `usedAt` on already-used tokens
  (should filter with `isNull(usedAt)`)
- Reset-password action is not atomic (password upsert, token invalidation,
  session wipe are sequential awaits -- should use `db.batch()`)

## Known TODOs

- No expired session/token cleanup (needs Cron Trigger or similar)
- Email delivery for password reset is a TODO (currently console.log in dev)
