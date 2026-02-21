# cloudflare-workers

## Description

Conventions and service-selection guide for the Cloudflare Workers runtime. The
worker entry point is `workers/app.ts`, which seeds a `RouterContextProvider`
with Cloudflare env/ctx. Routes access these via `getCloudflare(context)` from
`app/utils/cloudflare-context.ts`.

## Conventions

- Use **ES modules format exclusively** (never Service Worker format)
- Use **TypeScript** — always import all types and methods used
- Use **`wrangler.jsonc`** (not `wrangler.toml`) for configuration
- Do **not** use libraries with FFI/native/C bindings
- Never bake secrets into code — use Wrangler secrets/env vars
- After adding new Cloudflare bindings, run `npm run cf-typegen` to update types

## Service Selection

| Use Case                                | Service                 |
| --------------------------------------- | ----------------------- |
| Relational/SQL data                     | D1 (already configured) |
| Key-value / config / sessions           | Workers KV              |
| Strongly consistent state / multiplayer | Durable Objects         |
| Object storage / user uploads           | R2                      |
| Async background tasks                  | Queues                  |
| AI inference                            | Default to OpenRouter   |
| Vector search                           | Vectorize               |

## Related Files

- `workers/app.ts` — Worker entry point
- `wrangler.jsonc` — Worker and binding configuration
- `worker-configuration.d.ts` — Auto-generated binding types (via `cf-typegen`)

## Removal

N/A — the Cloudflare Workers runtime is the foundation of this stack.
