# auth-sessions

## Description

Manages the full lifecycle of authenticated sessions using signed HTTP-only
cookies. Covers session creation on login, rotation on privilege changes, idle
and absolute timeouts, and explicit revocation (logout / "sign out everywhere").
All session state is stored server-side (D1) so tokens can be invalidated
without waiting for expiry.

## Related Files

- `app/db/schema.ts` — `users`, `sessions`, `passwordCredentials`, and
  `passwordResetTokens` table definitions.
- `workers/env.ts` — `SESSION_SECRET` env var (min 32 chars).
- `app/utils/session.server.ts` — core session utilities:
  - `createSession(env, userId, request)` — generates a 32-byte random token,
    inserts a DB row with a 30-day absolute expiry, returns a signed cookie.
  - `getSessionUser(request, env)` — verifies HMAC signature, queries DB,
    enforces `expiresAt`. Returns `{ user, token, signedToken }`.
  - `deleteSession(env, token)` — removes a single session (logout).
  - `deleteAllSessions(env, userId)` — revokes all sessions (password change).
  - `makeSessionCookie(signedToken)` — builds the `Set-Cookie` string with a
    7-day sliding `Max-Age`.
  - `clearSessionCookie()` — `Max-Age=0` header to expire the cookie.
- `app/utils/session-context.ts` — React Router context key for the session
  user, plus `getOptionalUser(context)` and `requireUser(context)` helpers.
- `app/root.tsx` — root middleware that runs `getSessionUser` on every request,
  sets the context, and re-issues the cookie to slide the idle window.
- `app/routes/_auth/route.tsx` — pathless guest layout; redirects to `/` when
  already authenticated.
- `app/routes/_authenticated/route.tsx` — pathless auth-required layout;
  redirects to `/login?redirectTo=…` when unauthenticated.
- `app/routes/resources.logout/route.tsx` — POST action that deletes the session
  and clears the cookie.

## Cookie design

| Property | Value                                          |
| -------- | ---------------------------------------------- |
| Name     | `en_session`                                   |
| Signing  | `{token}.{base64url(HMAC-SHA256)}`             |
| HttpOnly | ✓                                              |
| Secure   | ✓                                              |
| SameSite | Lax                                            |
| Max-Age  | 604800 (7 days, re-issued each visit)          |
| Absolute | 30 days enforced by `sessions.expiresAt` in D1 |

## Removal

1. Delete `app/utils/session.server.ts`, `app/utils/session-context.ts`.
2. Remove the session middleware from `app/root.tsx`.
3. Delete the `sessions` and `users` tables from `app/db/schema.ts` (if no other
   facets depend on them).
4. Remove `SESSION_SECRET` from `workers/env.ts` and `wrangler.jsonc`.
5. Delete `app/routes/_auth/`, `app/routes/_authenticated/`, and
   `app/routes/resources.logout/`.
