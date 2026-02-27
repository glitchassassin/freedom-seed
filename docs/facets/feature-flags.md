# feature-flags

## Description

Database-backed feature flags for gradual rollout and per-account overrides.
Flags are defined in code with a type-safe registry (`FLAG_REGISTRY`) and
resolved via `getFlag(db, key, workspaceId?)` which checks D1 for overrides
before falling back to the default. Resolution priority: workspace override >
global override > code default. The admin settings page exposes a flags UI for
toggling without a deploy.

## Usage

```typescript
// In a loader or action
import { getFlag, getAllFlags } from '~/utils/feature-flags.server'

const enabled = await getFlag(db, 'new-dashboard', workspaceId)
const allFlags = await getAllFlags(db, workspaceId)
```

Add new flags by adding entries to `FLAG_REGISTRY` in
`app/utils/feature-flags.server.ts`.

## Related Files

- `app/utils/feature-flags.server.ts` — Flag registry, resolution logic, CRUD
- `app/db/schema.ts` — `featureFlags` table definition
- `app/routes/workspaces.$workspaceId/settings.feature-flags/route.tsx` — Admin
  UI
- `migrations/0004_colossal_forgotten_one.sql` — Schema migration
- `app/db/audit-log.server.ts` — `feature_flag.*` audit action types

## Removal

Drop the `feature_flags` table (generate a migration after removing it from
`app/db/schema.ts`). Delete `app/utils/feature-flags.server.ts` and the
`settings.feature-flags` route directory. Remove `feature_flag.*` entries from
the `AuditAction` type in `app/db/audit-log.server.ts`.
