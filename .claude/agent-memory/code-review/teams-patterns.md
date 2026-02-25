# Teams Feature Review Notes

## Known Issues (from Feb 2026 review)

1. **Privilege escalation**: Admin can remove/demote owners via
   `settings.members/route.tsx`. Needs `hasRole(actor.role, target.role)` guard.
2. **Missing duplicate-member check**: `invitations.$token/route.tsx` action
   does not check if user is already a team member before `acceptInvitation`,
   which would hit unique constraint and 500.
3. **Audit log cascade**: `auditLog.teamId` has `ON DELETE CASCADE`, so deleting
   a team destroys its audit trail. Contradicts append-only design.
4. **Expired invitations shown**: `getPendingInvitations` does not filter
   `expiresAt < now()`.
5. ~~**`db.query.teams.findFirst()`** in team layout middleware~~ --
   **RESOLVED**: replaced with `getTeamById()` helper (Feb 2026).
6. **Signup duplicates team creation**: Inline batch in signup instead of using
   `createTeam` utility (acceptable due to atomicity needs but worth noting).
7. **`teams.new` route has no layout shell**: Renders without header/nav.
8. **Audit log page uses hardcoded gray colors**: Will break in dark mode.
9. **Facet docs still say "Not yet implemented"** for teams, invitations, rbac.

## Architecture Decisions

- Personal team auto-created on signup with `isPersonal: true`
- Team context loaded in `teams.$teamId/_layout.tsx` middleware
- RBAC uses numeric rank comparison (owner=3, admin=2, member=1)
- Invitation tokens are SHA-256 hashed at rest (same pattern as password reset)
- Raw invitation token is exposed in URL path (accepted trade-off for 7-day
  expiring single-use tokens)
