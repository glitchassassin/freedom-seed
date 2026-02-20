# security-headers

## Description

HTTP security headers applied in the Worker entry point for every response:
`Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
HSTS and HTTPS redirect are production-only. CSP is configured to allow only
first-party scripts and trusted CDN origins.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
