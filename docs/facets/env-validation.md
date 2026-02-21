# env-validation

## Description

Zod schema validation of all Worker bindings and environment variables at
startup. If a required binding is missing or malformed, the Worker throws
immediately with a descriptive error rather than failing silently at the call
site. Each facet that introduces an env dependency registers its requirements in
a central schema.

## Related Files

- `workers/env.ts` — central Zod schema (`envSchema`), `ValidatedEnv` type, and
  `validateEnv()` function.
- `workers/app.ts` — calls `validateEnv(env)` once per cold start; passes
  `ValidatedEnv` through `AppLoadContext` so all routes receive the typed env.
- `app/db/client.server.ts` — `getDb` accepts `{ DB: D1Database }` rather than
  the full `Env` type, keeping it compatible with `ValidatedEnv`.

## Adding a New Env Dependency

Add the field to the `envSchema` object in `workers/env.ts`. Zod will validate
it on the next cold start and surface a clear error if it is missing.

## Removal

1. Delete `workers/env.ts`.
2. In `workers/app.ts`: remove the import, the `validatedEnv` cache, and the
   `validateEnv` call; restore `env: Env` in `AppLoadContext` and pass `env`
   directly to the request handler.
3. Restore `getDb(env: Env)` in `app/db/client.server.ts` if desired.
