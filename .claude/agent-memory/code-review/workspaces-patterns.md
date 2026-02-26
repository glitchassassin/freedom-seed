# Workspaces Feature Review Notes

(Renamed from "teams" to "workspaces" in Feb 2026.)

## Known Issues (from Feb 2026 review)

1. **Privilege escalation**: Admin can remove/demote owners via
   `settings.members/route.tsx`. Needs `hasRole(actor.role, target.role)` guard.
2. **Missing duplicate-member check**: `invitations.$token/route.tsx` action
   does not check if user is already a workspace member before
   `acceptInvitation`, which would hit unique constraint and 500.
3. **Audit log cascade**: `auditLog.workspaceId` has `ON DELETE CASCADE`, so
   deleting a workspace destroys its audit trail. Contradicts append-only
   design.
4. **Expired invitations shown**: `getPendingInvitations` does not filter
   `expiresAt < now()`.
5. **Signup duplicates workspace creation**: Inline batch in signup instead of
   using `createWorkspace` utility (acceptable due to atomicity needs but worth
   noting).
6. **`workspaces.new` route has no layout shell**: Renders without header/nav.
7. **Audit log page uses hardcoded gray colors**: Will break in dark mode.

## Architecture Decisions

- Personal workspace auto-created on signup with `isPersonal: true`
- Workspace context loaded in `workspaces.$workspaceId/_layout.tsx` middleware
- RBAC uses numeric rank comparison (owner=3, admin=2, member=1)
- Invitation tokens are SHA-256 hashed at rest (same pattern as password reset)
- Raw invitation token is exposed in URL path (accepted trade-off for 7-day
  expiring single-use tokens)
- Cookie `en_last_workspace` tracks last-visited workspace for root redirect
