# rbac

## Description

Role-based access control scoped to workspace membership. Each workspace member
holds a role (owner, admin, member) that governs what actions they may perform
on shared resources. Permissions are checked in Route loaders/actions via
`requireRole()` and `hasRole()` helpers. Roles are ranked: owner (3) > admin
(2) > member (1).

## Related Files

- `app/db/schema.ts` — `workspaceMemberRoleEnum`, `WorkspaceMemberRole` type
- `app/utils/rbac.server.ts` — `hasRole()`, `requireRole()` utilities
- `app/utils/workspace-context.ts` — `workspaceMemberContext` (role is read from
  here)
- `app/routes/workspaces.$workspaceId/_layout.tsx` — Sets workspace context via
  middleware
- `app/routes/workspaces.$workspaceId/settings.members/route.tsx` — Role-gated
  actions
- `app/routes/workspaces.$workspaceId/settings.general/route.tsx` — Admin/owner
  gates
- `app/routes/workspaces.$workspaceId/settings.audit-log/route.tsx` — Admin gate

## Removal

1. Delete `app/utils/rbac.server.ts`
2. Replace `requireRole()` calls with custom permission checks or remove them
3. Remove `workspaceMemberRoleEnum` from schema if roles are no longer needed
