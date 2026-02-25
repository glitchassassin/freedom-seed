# rbac

## Description

Role-based access control scoped to team membership. Each team member holds a
role (owner, admin, member) that governs what actions they may perform on shared
resources. Permissions are checked in Route loaders/actions via `requireRole()`
and `hasRole()` helpers. Roles are ranked: owner (3) > admin (2) > member (1).

## Related Files

- `app/db/schema.ts` — `teamMemberRoleEnum`, `TeamMemberRole` type
- `app/utils/rbac.server.ts` — `hasRole()`, `requireRole()` utilities
- `app/utils/team-context.ts` — `teamMemberContext` (role is read from here)
- `app/routes/teams.$teamId/_layout.tsx` — Sets team context via middleware
- `app/routes/teams.$teamId/settings.members/route.tsx` — Role-gated actions
- `app/routes/teams.$teamId/settings.general/route.tsx` — Admin/owner gates
- `app/routes/teams.$teamId/settings.audit-log/route.tsx` — Admin gate

## Removal

1. Delete `app/utils/rbac.server.ts`
2. Replace `requireRole()` calls with custom permission checks or remove them
3. Remove `teamMemberRoleEnum` from schema if roles are no longer needed
