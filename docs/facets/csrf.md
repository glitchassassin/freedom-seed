# csrf

## Description

Double-submit cookie CSRF protection for all state-mutating form submissions
made by cookie-authenticated sessions. A signed HMAC-SHA256 token is set as an
`HttpOnly` session cookie (`__Host-csrf`) and embedded in every `<form>` via a
hidden `<input name="csrf">`. The root middleware validates the pair on every
POST/PUT/PATCH/DELETE before the action runs. GET/HEAD requests and Bearer-token
authenticated API routes are exempt.

## How It Works

1. **Token generation** (every request) — the CSRF middleware in `app/root.tsx`
   generates a random 32-byte token, signs it with the `SESSION_SECRET`, stores
   the raw token in React Router context, and sets the signed value as the
   `__Host-csrf` cookie on the response.
2. **Form embedding** — the `<CsrfInput />` component reads the token from root
   loader data and renders a hidden input (`name="csrf"`).
3. **Validation** (mutating requests) — on POST/PUT/PATCH/DELETE the middleware
   clones the request, reads the `csrf` field from `formData`, verifies the
   cookie signature, and confirms the form field matches the cookie token.
   Mismatches throw a `403` response.

## Related Files

- `app/utils/csrf-constants.ts` — `CSRF_COOKIE_NAME` and `CSRF_FIELD_NAME`
  constants (shared between server and client code).
- `app/utils/csrf.server.ts` — `generateCsrfToken`, `validateCsrfToken`,
  `makeCsrfCookie`.
- `app/utils/csrf-context.ts` — React Router context key for the CSRF token.
- `app/utils/cookie.server.ts` — shared `readCookie` helper used by CSRF and
  session utilities.
- `app/components/csrf-input.tsx` — `<CsrfInput />` hidden input component.
- `app/root.tsx` — CSRF middleware (first in the middleware array) and loader
  that exposes `csrfToken` to the client.
- `app/utils/crypto.server.ts` — underlying `signToken` / `verifySignedToken`
  HMAC helpers.

### Forms that include `<CsrfInput />`

- `app/routes/_auth.login/route.tsx`
- `app/routes/_auth.signup/route.tsx`
- `app/routes/_auth.forgot-password/route.tsx`
- `app/routes/_auth.reset-password/route.tsx`
- `app/routes/_authenticated.settings.change-password/route.tsx`
- `app/routes/_authenticated/_layout.tsx`
- `app/routes/resources/theme-switch/index.tsx`
- `app/routes/demo/index.tsx`

## Removal

1. Delete `app/utils/csrf.server.ts`, `app/utils/csrf-context.ts`, and
   `app/utils/csrf-constants.ts`.
2. Delete `app/components/csrf-input.tsx`.
3. Remove the CSRF middleware block (first entry) from `app/root.tsx` middleware
   array.
4. Remove the `csrfToken` line from the root loader return object and the
   `csrfContext` import/usage.
5. Remove `<CsrfInput />` and its import from every form component listed above.
6. `app/utils/cookie.server.ts` is shared with `session.server.ts` — keep it.
