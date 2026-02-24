# auth-email-verification

## Description

Email address verification for new accounts. On registration a verification
email is sent containing a time-limited link. Unverified accounts see a
persistent banner in the authenticated layout and may be restricted from
sensitive actions. Tokens are hashed with SHA-256 before storage so a database
leak cannot be used to verify arbitrary accounts.

## Related Files

- `app/db/schema.ts` — `emailVerificationTokens` table (tokenHash PK, userId,
  expiresAt, usedAt, createdAt). The `users.emailVerifiedAt` column is also
  used.
- `app/utils/email-verification.server.ts` — Server utilities:
  `createEmailVerificationToken`, `findEmailVerificationToken`,
  `invalidateEmailVerificationTokens`, `markEmailVerified`.
- `app/emails/verify-email.tsx` — React Email template for the verification
  email.
- `app/routes/_auth.signup/route.tsx` — Modified to generate a verification
  token and send the verification email after user creation.
- `app/routes/verify-email/route.tsx` — Top-level route (works for both
  authenticated and unauthenticated users). Loader validates the token, marks
  the email verified, and redirects with a toast.
- `app/routes/resources.resend-verification/route.tsx` — POST-only resource
  route to resend the verification email. Rate limited to 3 requests per 5
  minutes.
- `app/routes/_authenticated/_layout.tsx` — Modified to show a verification
  banner when `emailVerifiedAt` is null, with a resend button.
- `app/utils/session-context.ts` — `SessionUser` type includes
  `emailVerifiedAt`.
- `app/utils/session.server.ts` — `getSessionUser` selects and returns
  `emailVerifiedAt`.
- `migrations/0001_black_jean_grey.sql` — Migration for the
  `email_verification_tokens` table.

## Removal

1. Delete `app/utils/email-verification.server.ts`.
2. Delete `app/routes/verify-email/` and
   `app/routes/resources.resend-verification/`.
3. Revert the signup route (`app/routes/_auth.signup/route.tsx`) to remove the
   verification token and email sending.
4. Revert the authenticated layout (`app/routes/_authenticated/_layout.tsx`) to
   remove the verification banner.
5. Remove `emailVerifiedAt` from `SessionUser` in `app/utils/session-context.ts`
   and from `getSessionUser` in `app/utils/session.server.ts`.
6. Drop `emailVerificationTokens` from `app/db/schema.ts` and run
   `npm run db:generate`.
7. Optionally remove the `emailVerifiedAt` column from the `users` table if no
   other facet depends on it.
