# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Freedom Seed is a full-stack starter template built with React Router 7 on
Cloudflare Workers, featuring SSR, Cloudflare D1 (SQLite), and Drizzle ORM. The
goal is rapid, AI-assisted development where features are specified in English
and grown from documentation.

## Facets

Before planning or implementing any feature, check `docs/facets/README.md` for
relevant facet documentation and load the applicable facet files into context.
Facets describe what each feature area is, which files implement it, and how it
fits into the stack.

## Delegation

Your role is the planner and manager. Your context is too valuable to spend on
implementing code. Instead, spin up Sonnet subagents to handle the actual
implementation; use the worktree-merger agent, if necessary, to rebase changes
from multiple parallel subagents; and then use the code-review agent to check if
the changes meet the requirements.

## Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run deploy           # Build and deploy to Cloudflare Workers
npm run typecheck        # Full TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint issues
npm run format           # Format with Prettier
npm run cf-typegen       # Regenerate Cloudflare Worker types
npm run test             # Run unit tests (vitest)
npm run test:watch       # Run unit tests in watch mode
npm run validate         # Run lint:fix, typecheck, and format (run before committing)
```

**Always run `npm run validate` before committing changes** to catch lint
errors, type errors, and formatting issues.

When working on a specific GitHub issue, reference the issue number in commit
messages (e.g., `fix login redirect loop (#42)`).

See `docs/facets/database.md` for database commands and schema workflow. See
`docs/facets/e2e-testing.md` for E2E test commands.

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

- `workers/app.ts` — Worker entry point; seeds a `RouterContextProvider` with
  Cloudflare env/ctx via `cloudflareContext` (see
  `app/utils/cloudflare-context.ts`)
- `app/utils/cloudflare-context.ts` — typed context key; use
  `getCloudflare(context)` in loaders/actions to access `{ env, ctx }`
- `app/routes/` — React Router filesystem routes
- `app/db/schema.ts` — Drizzle ORM schema (source of truth for DB)
- `app/db/client.server.ts` — Database client factory (server-only)
- `migrations/` — Auto-generated SQL migration files (do not hand-edit)
- `docs/` — Operations guides and architecture decision records

## Testing

When planning new features or bug fixes, consider what automated tests are
needed (unit tests via Vitest, E2E tests via Playwright, or both). Unit tests
live in `app/**/*.test.ts`. See `docs/facets/e2e-testing.md` and
`docs/facets/test-factories.md` for E2E patterns.

## Agent Memory

Files in `.claude/agent-memory/` should be committed alongside the work that
prompted them, not left as unstaged stragglers.

## Ops Documentation

Manual operations (CI/CD setup, database backup/restore, production queries) are
documented in `docs/operations/`. Refer there before performing infrastructure
tasks.
