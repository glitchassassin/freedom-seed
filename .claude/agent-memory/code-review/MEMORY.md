# Code Review Agent Memory

## Project Structure

- **Hooks directory**: `.claude/hooks/` -- custom Claude Code lifecycle hooks
- **Agents directory**: `.claude/agents/` -- subagent definitions (e.g.,
  `code-review.md`)
- **Settings**: `.claude/settings.json` (project), `.claude/settings.local.json`
  (local)
- **CLAUDE.md** exists at project root (created 2026-02-20 via /init)
- **No Python linting config** (no pyproject.toml, .pylintrc, setup.cfg)

## Claude Code Hooks Conventions

- Stop hooks MUST check `stop_hook_active` from stdin JSON to prevent infinite
  loops
- Exit code 0 = pass (allow stop), exit code 2 = block (stderr fed back to
  Claude)
- Hook input arrives as JSON on stdin with common fields: `session_id`,
  `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`
- Stop hooks also receive `stop_hook_active` (bool) and `last_assistant_message`
  (string)
- Transcript files are JSONL but this is an internal format, not a stable API

## Project Tooling

- PostToolUse hooks run `prettier --write` and `eslint --fix` on Edit/Write (see
  settings.json)
- The code-review subagent uses Opus model, has tools: Glob, Grep, Read,
  WebFetch, WebSearch
- Subagent types to match for code review: `"code-review"`,
  `"best-practices-reviewer"`

## Code Style & Linting

- ESLint uses `@epic-web/config/eslint` as base config (`eslint.config.js`)
- **Import style**: `import/consistent-type-specifier-style: prefer-top-level`
  -- must use separate `import type` statements, not inline `import { type X }`
- **TypeScript**: `verbatimModuleSyntax: true` in `tsconfig.json` reinforces
  separate type imports
- **Prettier**: configured via `@epic-web/config/prettier` (set in package.json
  `"prettier"` field) -- tabs, no semicolons
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin +
  `prettier-plugin-tailwindcss`

## Tech Stack

- React Router 7 + Cloudflare Workers (SSR)
- Cloudflare D1 (SQLite) + Drizzle ORM
- Vite 7 + Tailwind CSS v4
- Playwright for E2E tests (per-worker `vite preview`, ports 4200+)
- Node >= 24 required (engines.node bumped from >=22 to >=24 in Feb 2026)

## Context API (v8_middleware)

- `v8_middleware: true` is enabled in `react-router.config.ts`
- Cloudflare env/ctx is provided via `RouterContextProvider` (not legacy
  `AppLoadContext`)
- `app/utils/cloudflare-context.ts` exports `cloudflareContext` (context key)
  and `getCloudflare(context)` (typed accessor with null guard)
- `app/utils/toast-context.ts` exports `toastContext` for the flash toast
- In loaders/actions: use `getCloudflare(context)` to access `{ env, ctx }`
- `workers/app.ts` creates `RouterContextProvider` per-request, sets
  `cloudflareContext`
- Root middleware in `app/root.tsx` reads toast cookie before `next()`, clears
  it after
- `ContextReader` duck-type interface in `cloudflare-context.ts` accepts both
  `Readonly<RouterContextProvider>` and `RouterContextProvider`

## Routing

- Uses `react-router-auto-routes` (NOT `@react-router/fs-routes`)
- `app/routes.ts` calls `autoRoutes()` -- no manual route registration
- Route files should be named `index.tsx` (not `route.tsx` -- deprecated)
- Layout files migrated from `route.tsx` to `_layout.tsx` for `_auth/` and
  `_authenticated/`; some other routes still use `route.tsx` (migration ongoing)
- Colocated non-route files use `+` prefix (e.g., `+welcome.tsx`, `+helpers/`)
- `_layout.tsx` creates nesting; folders without it are purely organizational
- Recognized extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.mdx`
- Facet doc: `docs/facets/routing.md`

## Action Validation

- Actions that read `formData` MUST use `parseWithZod` from `@conform-to/zod/v4`
- Standard pattern: `parseWithZod(formData, { schema })` → check
  `submission.status !== 'success'` → return `submission.reply()`
- Intent-based actions dispatch to per-intent schemas via
  `formData.get('intent')`
- Exempt: actions that never read formData (logout, WebAuthn challenge gen)
- JSON API actions that read formData (e.g. passkey verify) should also use
  `parseWithZod` for the validation step
- Facet reference: `docs/facets/routing.md` → "Action Validation" section
- When reviewing changes in `app/routes/`, always check compliance with routing
  facet rules including action validation

## Patterns & Conventions

- [hooks-patterns.md](hooks-patterns.md) -- detailed notes on hook
  implementation patterns
- [auth-patterns.md](auth-patterns.md) -- auth session/password review findings
- [workspaces-patterns.md](workspaces-patterns.md) -- workspaces feature review
  findings (renamed from teams Feb 2026)

## Auth Architecture

- `app/utils/session.server.ts` -- HMAC-signed cookies, session CRUD,
  `createPasswordResetToken`
- `app/utils/session-context.ts` -- `sessionContext` key +
  `getOptionalUser`/`requireUser` helpers
- Root middleware (2nd middleware in `app/root.tsx`) runs `getSessionUser` and
  slides cookie; uses `getSetCookie()` + `startsWith('en_session=')` guard to
  avoid overwriting action-set cookies (logout clear, change-password re-issue)
- `_auth/` pathless layout redirects authed users away; `_authenticated/`
  pathless layout redirects unauthed to `/login?redirectTo=...`
- Form validation uses Conform + Zod in all auth routes
- Auth routes use `setToast` + array headers pattern (not `showToast`) to set
  both session and toast cookies

## Workspaces Architecture

- `app/utils/workspace-context.ts` -- `workspaceMemberContext` key +
  `getOptionalWorkspaceMember`/`requireWorkspaceMember` helpers
- `app/utils/workspaces.server.ts` -- Workspace CRUD (createWorkspace,
  renameWorkspace, deleteWorkspace)
- `app/utils/rbac.server.ts` -- `hasRole`/`requireRole` with numeric rank
  (owner=3, admin=2, member=1)
- `app/utils/invitations.server.ts` -- Invitation CRUD with SHA-256 hashed
  tokens
- Workspace layout middleware at
  `app/routes/workspaces.$workspaceId/_layout.tsx` gates all workspace routes
- Personal workspace created on signup in `_auth.signup/route.tsx` batch
- Cookie: `en_last_workspace` for last-visited workspace redirect
- Audit actions: `workspace.created`, `workspace.renamed`, `workspace.deleted`

## Facets System

- `docs/facets/README.md` is the index of all facets
- Facet files must stay under 100 lines (documented lint rule in README)
- Standard facet sections: `## Description`, `## Related Files`, `## Removal`
- Some facets add extra sections (e.g., `## Commands`, `## Configuration`) --
  this is acceptable
- Stub facets use `_Not yet implemented._` for Related Files and Removal
- Implemented facets list actual files and removal steps
- CLAUDE.md should cross-reference facets but retain cross-cutting safety rules
  (e.g., `.server.ts` import constraint, `cf-typegen` trigger conditions)

## DB Patterns

- All queries use `db.select().from()` builder API -- avoid `db.query.*`
  relational API for consistency
- `db.batch()` for atomic multi-statement operations (D1-specific)
- Schema uses `$defaultFn(() => crypto.randomUUID())` for text PKs
- Timestamps: `integer('...', { mode: 'timestamp_ms' })` with
  `unixepoch('now') * 1000` default
- `{ schema }` passed to `drizzle()` in client.server.ts

## E2E Test Architecture

- Per-worker isolation: each Playwright worker gets its own `vite preview`
  server with deep-copied `.wrangler/state/` (isolated D1 database)
- No `webServer` in playwright.config.ts; servers managed via `workerServer`
  fixture in `tests/playwright-utils.ts`
- Port range: `4200 + workerInfo.parallelIndex`; `--strictPort` enforced
- `tests/worker-server.ts` encapsulates start/stop/cleanup lifecycle
- `setWorkerRoot()` in `tests/factories/db.ts` points factories at isolated DB
- All spec files MUST import `test`/`expect` from `./playwright-utils`
- Shared mock Resend server on port 3001; email isolation via `uniqueEmail()`
- `RESEND_BASE_URL` baked in at build time, not runtime
- Temp dir strategy: symlink everything except `.wrangler/` and `.react-router/`
  (deep-copied to avoid race conditions)
- `CF_INSPECTOR_PORT=false` env var disables miniflare inspector port conflicts
- `stopWorkerServer` is synchronous (SIGTERM only, no wait)
- CI workers: 4 (set in playwright.config.ts)
