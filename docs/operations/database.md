# Database Operations

This project uses Cloudflare D1 (SQLite) with Drizzle ORM. See
[docs/decisions/001-database.md](../decisions/001-database.md) for why.

## Migrations

### Create a migration

After editing `app/db/schema.ts`, generate a SQL migration file:

```bash
npm run db:generate
```

Review the generated file in `migrations/` before applying it.

### Apply migrations locally

```bash
npm run db:migrate
```

Wrangler writes to a local SQLite file at `.wrangler/state/v3/d1/`. No
Cloudflare account needed.

### Apply migrations to production

```bash
npm run db:migrate:remote
```

Run this after deploying new code that depends on the schema change.

## Backup & Restore

### Export a local database

```bash
wrangler d1 export freedom-seed --local --output=backup.sql
```

### Export the production database

```bash
wrangler d1 export freedom-seed --remote --output=backup.sql
```

### Restore from a SQL file

```bash
# Local
wrangler d1 execute freedom-seed --local --file=backup.sql

# Remote
wrangler d1 execute freedom-seed --remote --file=backup.sql
```

## Running ad-hoc queries

```bash
# Local
wrangler d1 execute freedom-seed --local --command="SELECT * FROM users"

# Remote
wrangler d1 execute freedom-seed --remote --command="SELECT * FROM users"
```

## Drizzle Studio

Browse and edit the local database in a web UI:

```bash
npx drizzle-kit studio
```

Connecting to the remote database requires a `.env` file with:

```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_DATABASE_ID=...   # from wrangler d1 list
CLOUDFLARE_D1_TOKEN=...      # Cloudflare API token with D1 permissions
```
