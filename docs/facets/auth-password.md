# auth-password

## Description

Username/email and password authentication. Passwords are hashed with scrypt
before storage. Includes the full self-service flow: registration, login, forgot
password (time-limited reset token sent by email), and change password (requires
current password). Rate limiting is applied to all credential endpoints.

## Related Files

- `app/db/schema.ts` — `passwordCredentials` (userId PK, hash, updatedAt) and
  `passwordResetTokens` (token, userId, expiresAt, usedAt, createdAt) tables.
- `app/utils/password.server.ts` — `hashPassword(plain)` and
  `verifyPassword(plain, hash)` using scrypt via `node:crypto` (N=16384, r=8,
  p=5).
- `app/utils/session.server.ts` — `createPasswordResetToken(env, userId)`
  generates and stores a 32-byte URL-safe reset token with a 1-hour expiry.
- `app/routes/_auth.login/route.tsx` — `/login`: Conform + Zod form; looks up
  user by email, verifies password, creates session on success.
- `app/routes/_auth.signup/route.tsx` — `/signup`: Conform + Zod form; checks
  for duplicate email, hashes password, creates user + credential + session.
- `app/routes/_auth.forgot-password/route.tsx` — `/forgot-password`: always
  returns success to prevent email enumeration; logs reset token to console in
  dev (email delivery is a TODO for the email facet).
- `app/routes/_auth.reset-password/route.tsx` — `/reset-password?token=…`:
  loader validates token; action re-validates, updates credential, marks token
  used, revokes all sessions, creates new session.
- `app/routes/_authenticated.settings.change-password/route.tsx` —
  `/settings/change-password`: requires auth; verifies current password before
  updating hash, revokes all sessions, issues new session.

## Removal

1. Delete `app/utils/password.server.ts`.
2. Remove `app/routes/_auth.login/`, `_auth.signup/`, `_auth.forgot-password/`,
   `_auth.reset-password/`, and `_authenticated.settings.change-password/`.
3. Drop `passwordCredentials` and `passwordResetTokens` from `app/db/schema.ts`
   and run `npm run db:generate`.
4. Remove `nodejs_compat` from `wrangler.jsonc` if unused by other facets.
