# observability

## Description

Covers three concerns: error tracking (Sentry, which has a Cloudflare Workers
SDK), structured JSON logging with a `requestId` threaded through each request
lifecycle, and a `GET /health` endpoint that returns DB reachability. Logs are
written to `console` (Cloudflare captures them in Workers Logs / Logpush).

## Related Files

- `workers/app.ts` — Sentry `withSentry()` wrapper, request ID generation,
  logger instantiation, `x-request-id` response header
- `workers/env.ts` — `SENTRY_DSN` env var (optional)
- `app/utils/request-id-context.ts` — `requestIdContext` key
- `app/utils/logger.server.ts` — `Logger` class, `loggerContext` key,
  `getLogger()` helper
- `app/routes/health/route.ts` — `GET /health` endpoint (DB reachability)
- `wrangler.jsonc` — `SENTRY_DSN` var, `observability.enabled` flag

## Removal

1. `npm uninstall @sentry/cloudflare`
2. In `workers/app.ts`, remove the `Sentry.withSentry()` wrapper, `Sentry`
   import, and `Sentry.setTag()` call.
3. Delete `app/utils/request-id-context.ts` and `app/utils/logger.server.ts`.
4. Remove `requestIdContext` / `loggerContext` from `workers/app.ts` context
   setup and all `getLogger(context)` calls from loaders/actions.
5. Delete `app/routes/health/route.ts`.
6. Remove `SENTRY_DSN` from `workers/env.ts` and `wrangler.jsonc`.
