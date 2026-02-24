# auth-magic-link

## Description

Passwordless login via a short-lived, single-use token delivered by email. The
user enters their email, receives a link, and is authenticated on clicking it.
Tokens expire after 15 minutes and are invalidated immediately on use. On
successful verification, the user's email is also marked as verified. Pairs well
with passkeys as a fallback recovery method.

## How It Works

1. User visits `/magic-link` and submits their email address.
2. If the email matches a user, a 32-byte random token is generated. Its SHA-256
   hash is stored in the `magic_link_tokens` table with a 15-minute expiry.
3. An email is sent with a link to `/magic-link/verify?token=<raw-token>`.
4. On click, the loader hashes the token, looks it up, validates expiry, and
   marks all tokens for that user as used (single-use).
5. The user's `emailVerifiedAt` is set if not already (email ownership proven).
6. A session is created and the user is redirected to `/`.

## Related Files

### Schema

- `app/db/schema.ts` — `magicLinkTokens` table definition
- `migrations/0001_round_boomerang.sql` — migration for new auth tables

### Server Utilities

- `app/utils/magic-link.server.ts` — `createMagicLinkToken`,
  `findMagicLinkToken`, `invalidateMagicLinkTokens`

### Email Template

- `app/emails/magic-link.tsx` — `MagicLinkEmail` component

### Routes

- `app/routes/_auth.magic-link/route.tsx` — request magic link (POST form)
- `app/routes/_auth.magic-link.verify/route.tsx` — verify token (GET loader)

### Modified Files

- `app/routes/_auth.login/route.tsx` — added "Sign in with email link" button

## Dependencies

- [auth-sessions](./auth-sessions.md) — session creation on successful login
- [email](./email.md) — sending the magic link email
- [email-templates](./email-templates.md) — `EmailLayout` and shared styles
- [csrf](./csrf.md) — CSRF protection on the request form
- [rate-limiting](./rate-limiting.md) — 3 requests per 5 minutes per IP

## Removal

1. Delete `app/routes/_auth.magic-link/` and
   `app/routes/_auth.magic-link.verify/` directories.
2. Delete `app/utils/magic-link.server.ts`.
3. Delete `app/emails/magic-link.tsx`.
4. Remove the `magicLinkTokens` export from `app/db/schema.ts`.
5. Remove the "Sign in with email link" button and divider from
   `app/routes/_auth.login/route.tsx`.
6. Generate a new migration: `npx drizzle-kit generate`.
7. Delete this file.
