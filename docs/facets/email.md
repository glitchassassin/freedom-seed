# email

## Description

Transactional email delivery using Resend, which is edge-compatible and works
within Cloudflare Workers. A thin `sendEmail(env, { to, subject, react })`
abstraction wraps the Resend SDK so the delivery provider can be swapped without
touching call sites. When `RESEND_API_KEY` is empty (local dev), emails are
logged to the console instead of sent. The Resend API key is stored as a
Wrangler secret.

## Related Files

- `app/utils/email.server.ts` — `sendEmail()` abstraction over the Resend SDK.
- `workers/env.ts` — `RESEND_API_KEY` and `FROM_EMAIL` env var declarations.
- `wrangler.jsonc` — Env var defaults and secret documentation.
- `.dev.vars` — Local development placeholder values.

## Dependencies

- `resend` — Resend SDK (edge-compatible).
- `@react-email/render` — Renders React Email components to HTML and plain text.

## Removal

1. Delete `app/utils/email.server.ts`.
2. Remove `RESEND_API_KEY` and `FROM_EMAIL` from `workers/env.ts`,
   `wrangler.jsonc`, and `.dev.vars`.
3. Remove call sites that import `sendEmail`.
4. Run `npm uninstall resend` (keep `@react-email/*` if email-templates facet is
   still in use).
