# database

## Description

Cloudflare D1 (SQLite) accessed via Drizzle ORM. `app/db/schema.ts` is the
single source of truth for the schema. Routes access the DB through
`context.cloudflare.env.DB`; always wrap it with the Drizzle client from
`app/db/client.server.ts`. Import all DB utilities from `.server.ts` files to
ensure they remain server-side only. Migration files in `migrations/` are
auto-generated — do not hand-edit them.

## Schema Change Workflow

1. Edit `app/db/schema.ts`
2. `npm run db:generate` — creates a new migration in `migrations/`
3. `npm run db:migrate` — apply locally
4. Test, then `npm run deploy && npm run db:migrate:remote`

## Commands

```bash
npm run db:generate        # Generate Drizzle migration from schema changes
npm run db:migrate         # Apply migrations to local D1
npm run db:migrate:remote  # Apply migrations to production D1
```

## Related Files

- `app/db/schema.ts` — Drizzle schema (source of truth)
- `app/db/client.server.ts` — Drizzle client factory
- `migrations/` — Auto-generated SQL migrations

## Removal

Remove the `DB` binding from `wrangler.jsonc`, delete `app/db/`, `migrations/`,
and uninstall `drizzle-orm` and `drizzle-kit`.
