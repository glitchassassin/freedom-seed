# security-headers

## Description

HTTP security headers applied in the Worker entry point for every response:
`Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
HSTS and HTTPS redirect are production-only. CSP is configured to allow only
first-party scripts and trusted CDN origins.

### Headers

| Header                      | Value                                                  | Environments |
| --------------------------- | ------------------------------------------------------ | ------------ |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`         | Production   |
| `Content-Security-Policy`   | See CSP directives below                               | All          |
| `X-Frame-Options`           | `DENY`                                                 | All          |
| `X-Content-Type-Options`    | `nosniff`                                              | All          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                      | All          |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=()` | All          |

### CSP Directives

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` (plus Plausible origin when analytics
  enabled)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`
- `img-src 'self' data:`
- `connect-src 'self'` (plus Plausible origin when analytics enabled)
- `frame-ancestors 'none'`
- `form-action 'self'`
- `base-uri 'self'`

`script-src` currently includes `'unsafe-inline'` because the app uses inline
scripts for client hints. A TODO is in the code to switch to nonce-based CSP.

When `PLAUSIBLE_DOMAIN` is set, the Plausible host origin (defaulting to
`https://plausible.io`) is added to `script-src` and `connect-src`.

## Related Files

- `workers/app.ts` — sets all security headers on every response after the React
  Router handler runs

## Removal

1. In `workers/app.ts`, remove the CSP-building block (from the
   `plausibleDomain` variable through the `headers.set('Permissions-Policy', …)`
   call)
2. Optionally remove the HSTS `headers.set` call if HTTPS enforcement is also
   unwanted
