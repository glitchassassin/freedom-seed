# invitations

## Description

Email-based flow for adding members to a workspace. An admin sends an invite
specifying the recipient email and intended role; the invitee receives a link
that creates (or links) their account and joins the workspace atomically.
Invitations are single-use, expire after 7 days, and can be revoked before
acceptance. Pending invitations are visible and manageable from workspace
settings.

## Related Files

- `app/db/schema.ts` — `workspaceInvitations` table
- `app/utils/invitations.server.ts` — Token generation, lookup, accept, revoke
- `app/emails/workspace-invitation.tsx` — Invitation email template
- `app/routes/invitations.$token/route.tsx` — Accept invitation page
- `app/routes/workspaces.$workspaceId/settings.members/route.tsx` — Invite &
  revoke UI

## Removal

1. Delete `app/utils/invitations.server.ts`
2. Delete `app/routes/invitations.$token/`
3. Remove invitation-related actions from settings.members route
4. Remove `workspaceInvitations` from `app/db/schema.ts`
5. `npm run db:generate && npm run db:migrate`
