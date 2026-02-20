# observability

## Description

Covers three concerns: error tracking (Sentry, which has a Cloudflare Workers
SDK), structured JSON logging with a `requestId` threaded through each request
lifecycle, and a `GET /health` endpoint that returns DB reachability and build
version. Logs are written to `console` (Cloudflare captures them in Workers Logs
/ Logpush).

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
