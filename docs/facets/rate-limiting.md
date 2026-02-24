# rate-limiting

## Description

Per-IP request throttling on sensitive auth endpoints (login, registration,
password reset). Uses a KV-based sliding window that stores an array of
timestamps per IP. Exceeding a limit returns `429` with a `Retry-After` header.

**Why KV:** Rate limiting needs fast reads/writes without transactional
guarantees. KV is globally distributed with built-in TTL for automatic cleanup.
Eventual consistency is acceptable — worst case a few extra requests slip
through during propagation.

## How It Works

1. `checkRateLimit` reads a JSON array of epoch-ms timestamps from KV.
2. Timestamps older than the window are filtered out.
3. If the count >= limit, the request is rejected with `retryAfter` seconds.
4. Otherwise the current timestamp is appended and written back with
   `expirationTtl` so entries auto-expire.

## Default Limits

| Endpoint           | Prefix      | Limit | Window |
| ------------------ | ----------- | ----- | ------ |
| `/login`           | `login`     | 5     | 5 min  |
| `/signup`          | `signup`    | 3     | 5 min  |
| `/forgot-password` | `forgot-pw` | 3     | 5 min  |
| `/reset-password`  | `reset-pw`  | 5     | 5 min  |

## Related Files

- `app/utils/rate-limit.server.ts` — sliding window core (`checkRateLimit`)
- `app/utils/require-rate-limit.server.ts` — action guard (`requireRateLimit`)
- `workers/env.ts` — `RATE_LIMIT_KV` Zod binding validation
- `worker-configuration.d.ts` — `RATE_LIMIT_KV: KVNamespace` type declaration
- `wrangler.jsonc` — `kv_namespaces` binding (dev + production)
- `app/routes/_auth.login/route.tsx` — login rate limit integration
- `app/routes/_auth.signup/route.tsx` — signup rate limit integration
- `app/routes/_auth.forgot-password/route.tsx` — forgot-password rate limit
- `app/routes/_auth.reset-password/route.tsx` — reset-password rate limit

## Testing

Set `DISABLE_RATE_LIMITING=true` in the Worker environment to bypass all rate
limit checks. The `test` wrangler environment has this enabled so E2E tests are
not throttled. Unit-test the rate-limiting logic directly via
`checkRateLimit()`.

## Removal

1. Remove `requireRateLimit` calls from the four auth route action functions.
2. Delete `app/utils/rate-limit.server.ts` and
   `app/utils/require-rate-limit.server.ts`.
3. Remove `RATE_LIMIT_KV` from `workers/env.ts`, `worker-configuration.d.ts`,
   and `wrangler.jsonc` (both dev and production `kv_namespaces` entries).
4. Optionally delete the KV namespace:
   `wrangler kv namespace delete --namespace-id <id>`.
