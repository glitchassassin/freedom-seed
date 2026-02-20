# rate-limiting

## Description

Per-IP and per-user request throttling on sensitive endpoints (login,
registration, password reset, magic link, invite acceptance). Implemented via
Cloudflare's native rate limiting rules in `wrangler.jsonc` for coarse limits
and a Workers KV token bucket for fine-grained in-app limits. Exceeding a limit
returns `429` with a `Retry-After` header.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
