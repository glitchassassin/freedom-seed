# email

## Description

Transactional email delivery using Resend, which is edge-compatible and works
within Cloudflare Workers. A thin `sendEmail(to, template, data)` abstraction
wraps the Resend SDK so the delivery provider can be swapped without touching
call sites. The Resend API key is stored as a Wrangler secret.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
