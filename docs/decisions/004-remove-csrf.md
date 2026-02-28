# 004 — Remove CSRF Token Protection

**Date:** 2026-02-27 **Status:** Accepted

## Context

The codebase uses a double-submit cookie CSRF token pattern on all
state-mutating form submissions. The `en_session` cookie is already configured
with `SameSite=Lax`, which prevents cross-site cookie transmission on POST
requests — the primary CSRF vector.

## Decision

Remove CSRF token protection entirely.

## Rationale

1. **`SameSite=Lax` eliminates the traditional CSRF vector.** Modern browsers
   (all major engines since ~2020) do not send `SameSite=Lax` cookies on
   cross-origin POST requests, so a malicious page cannot forge authenticated
   form submissions.
2. **No GET endpoints mutate state.** All mutations use POST/PUT/PATCH/DELETE,
   so the GET exception in `SameSite=Lax` is irrelevant.
3. **Login CSRF is not a practical risk.** The POST `/login` endpoint requires
   credentials the attacker does not possess.
4. **Removing the token simplifies every form** — no `<CsrfInput />` component,
   no middleware validation, and no risk of stale-token 403 errors on back-
   navigation or long-idle tabs.

This aligns with the Epic Stack's decision to remove CSRF
(epicweb-dev/epic-stack decision 035).

## Consequences

- If a future endpoint uses `SameSite=None` cookies or mutates state via GET,
  CSRF protection must be re-evaluated for that endpoint.
- Bot-protection (Cloudflare Turnstile) remains as an independent layer.
