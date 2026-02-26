# test-factories

## Description

Typed factory functions and a database seed script for generating test data.
Factories insert directly into the miniflare D1 SQLite file via `node:sqlite`,
bypassing the app API layer. This enables fast test setup without driving the
browser UI for data that isn't under test.

Key factories: `createUser`, `createWorkspace`, `createSession`,
`createInvitation`. A `db:seed` npm script populates a local D1 instance with a
representative dataset for manual testing.

## Related Files

- `tests/factories/db.ts` — Shared DB access (`openD1`) and crypto primitives
  (`hashPassword`, `signSessionToken`, `hashToken`).
- `tests/factories/user.ts` — `createUser()` (user + credentials + personal
  workspace), `getUserIdByEmail()`.
- `tests/factories/workspace.ts` — `createWorkspace()`,
  `createWorkspaceMember()`.
- `tests/factories/session.ts` — `createSession()` → signed token for
  `en_session` cookie.
- `tests/factories/token.ts` — Password-reset, magic-link, email-verification
  token seeders; `createInvitation()`.
- `tests/factories/index.ts` — Barrel re-exports.
- `tests/playwright-utils.ts` — Custom Playwright fixtures (`login`,
  `insertNewUser`) and `authenticatedContext` helper; extends `base.test`.
- `tests/db-helpers.ts` — Deprecated shim; re-exports from `./factories`.
- `scripts/db-seed.ts` — CLI script seeding alice/bob/carol + Acme Corp
  workspace.

## Commands

```bash
npm run db:seed   # Seed local D1 with sample users and workspaces
```

## Removal

Delete `tests/factories/`, `scripts/db-seed.ts`, and the `db:seed` script in
`package.json`. Restore `tests/db-helpers.ts` to its original inline
implementation if any specs still import it.
