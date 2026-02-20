# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Freedom Seed is a full-stack starter template built with React Router 7 on
Cloudflare Workers, featuring SSR, Cloudflare D1 (SQLite), and Drizzle ORM. The
goal is rapid, AI-assisted development where features are specified in English
and grown from documentation.

## Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run deploy           # Build and deploy to Cloudflare Workers
npm run typecheck        # Full TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint issues
npm run format           # Format with Prettier
npm run cf-typegen       # Regenerate Cloudflare Worker types (run after wrangler.jsonc changes)

# Database
npm run db:generate      # Generate Drizzle migration from schema changes
npm run db:migrate       # Apply migrations to local D1
npm run db:migrate:remote  # Apply migrations to production D1

# Testing (E2E only — Playwright runs against preview build on port 4173)
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Run with Playwright UI
npx playwright test tests/home.spec.ts          # Run a single test file
npx playwright test -g "test name pattern"      # Run tests matching a pattern
```

## Architecture

### Request Flow

```
HTTP Request → workers/app.ts (Cloudflare Worker)
  → HTTPS redirect / HSTS headers (production only)
  → React Router SSR handler
    → app/routes/ (filesystem routing)
    → app/root.tsx (root layout)
```

### Key Directories

- `workers/app.ts` — Worker entry point; provides `AppLoadContext` with
  `cloudflare.env` and `cloudflare.ctx`
- `app/routes/` — React Router filesystem routes
- `app/db/schema.ts` — Drizzle ORM schema (source of truth for DB)
- `app/db/client.server.ts` — Database client factory (server-only)
- `migrations/` — Auto-generated SQL migration files (do not hand-edit)
- `docs/` — Operations guides and architecture decision records

### Data Flow for DB Access

Routes access the database via `context.cloudflare.env.DB` (the D1 binding). The
`client.server.ts` module wraps this into a Drizzle client. Always import db
utilities from `.server.ts` files to ensure they stay server-side only.

### Schema Change Workflow

1. Edit `app/db/schema.ts`
2. `npm run db:generate` → creates migration in `migrations/`
3. `npm run db:migrate` → apply locally
4. Test, then `npm run deploy && npm run db:migrate:remote`

## Cloudflare Workers Conventions

- Use **ES modules format exclusively** (never Service Worker format)
- Use **TypeScript** — always import all types and methods used
- Use **`wrangler.jsonc`** (not `wrangler.toml`) for configuration
- Do **not** use libraries with FFI/native/C bindings
- Never bake secrets into code — use Wrangler secrets/env vars
- When adding new Cloudflare bindings, run `npm run cf-typegen` to update types

### Cloudflare Service Selection

| Use Case                                | Service                 |
| --------------------------------------- | ----------------------- |
| Relational/SQL data                     | D1 (already configured) |
| Key-value / config / sessions           | Workers KV              |
| Strongly consistent state / multiplayer | Durable Objects         |
| Object storage / user uploads           | R2                      |
| Async background tasks                  | Queues                  |
| AI inference                            | Default to OpenRouter   |
| Vector search                           | Vectorize               |

## Testing

E2E tests use Playwright with accessibility checks via `axe-core`. The test
server is the preview build (`npm run preview`), not the dev server. Tests live
in `tests/`.

## Ops Documentation

Manual operations (CI/CD setup, database backup/restore, production queries) are
documented in `docs/operations/`. Refer there before performing infrastructure
tasks.
