# audit-log

## Description

Append-only record of significant actions taken within an account (member added,
role changed, subscription updated, resource deleted, etc.). Each entry stores
the actor, action type, target resource, timestamp, and request metadata. The
log is exposed in team settings for admins and owners. Entries are never
modified or deleted, only appended.

`logAuditEvent` is the single write path — call it from any action handler,
optionally inside `ctx.waitUntil()` to avoid blocking the response. The
`AuditAction` string union in `app/db/audit-log.server.ts` is the authoritative
list of loggable event types; extend it as new features are added.

RBAC enforcement (owner/admin only) is stubbed in the loader and will be wired
up when the `rbac` facet is implemented.

## Related Files

- `app/db/schema.ts` — `auditLog` table definition (`audit_log` in SQL)
- `app/db/audit-log.server.ts` — `AuditAction` type and `logAuditEvent` utility
- `app/routes/teams.$teamId.settings.audit-log/route.tsx` — paginated admin view

## Removal

1. Delete `app/db/audit-log.server.ts`
2. Delete `app/routes/teams.$teamId.settings.audit-log/`
3. Remove the `auditLog` export from `app/db/schema.ts`
4. `npm run db:generate` — emits DROP TABLE migration
5. `npm run db:migrate` then `npm run db:migrate:remote`
6. Remove any `logAuditEvent` call sites in action handlers
