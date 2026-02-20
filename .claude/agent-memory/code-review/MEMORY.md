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
- Playwright for E2E tests (port 4173, preview build)
- Node >= 22 required

## Patterns & Conventions

- [hooks-patterns.md](hooks-patterns.md) -- detailed notes on hook
  implementation patterns
