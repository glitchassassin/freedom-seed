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
```

See `docs/facets/database.md` for database commands and schema workflow. See
`docs/facets/e2e-testing.md` for test commands.

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

## Ops Documentation

Manual operations (CI/CD setup, database backup/restore, production queries) are
documented in `docs/operations/`. Refer there before performing infrastructure
tasks.
