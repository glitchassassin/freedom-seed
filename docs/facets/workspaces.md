# workspaces

## Description

Account/workspace abstraction that decouples resources from individual users.
Every user gets a personal workspace on signup; additional workspaces can be
created and shared. Resources (projects, data, subscriptions) belong to a
workspace, not a user, enabling hand-off and multi-seat access. Users may belong
to multiple workspaces and switch context via a workspace selector.

## Related Files

- `app/db/schema.ts` — `workspaces`, `workspaceMembers`, `workspaceInvitations`
  tables
- `app/utils/workspaces.server.ts` — Workspace CRUD and query utilities
- `app/utils/workspace-context.ts` — React Router context for current workspace
  membership
- `app/routes/workspaces.$workspaceId/_layout.tsx` — Workspace layout with
  middleware, switcher
- `app/routes/workspaces.$workspaceId/index.tsx` — Workspace dashboard
- `app/routes/workspaces.$workspaceId/settings.general/route.tsx` — Rename /
  delete workspace
- `app/routes/workspaces.new/route.tsx` — Create a new workspace
- `app/routes/_auth.signup/route.tsx` — Creates personal workspace on signup

## Removal

1. Delete `app/utils/workspaces.server.ts`, `app/utils/workspace-context.ts`
2. Delete `app/routes/workspaces.$workspaceId/` and `app/routes/workspaces.new/`
3. Remove `workspaces`, `workspaceMembers`, `workspaceInvitations` from
   `app/db/schema.ts`
4. Revert signup route to remove personal workspace creation
5. `npm run db:generate && npm run db:migrate`
