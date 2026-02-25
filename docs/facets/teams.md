# teams

## Description

Account/team abstraction that decouples resources from individual users. Every
user gets a personal team on signup; additional teams can be created and shared.
Resources (projects, data, subscriptions) belong to a team, not a user, enabling
hand-off and multi-seat access. Users may belong to multiple teams and switch
context via a team selector.

## Related Files

- `app/db/schema.ts` — `teams`, `teamMembers`, `teamInvitations` tables
- `app/utils/teams.server.ts` — Team CRUD and query utilities
- `app/utils/team-context.ts` — React Router context for current team membership
- `app/routes/teams.$teamId/_layout.tsx` — Team layout with middleware, switcher
- `app/routes/teams.$teamId/index.tsx` — Team dashboard
- `app/routes/teams.$teamId/settings.general/route.tsx` — Rename / delete team
- `app/routes/teams.new/route.tsx` — Create a new team
- `app/routes/_auth.signup/route.tsx` — Creates personal team on signup

## Removal

1. Delete `app/utils/teams.server.ts`, `app/utils/team-context.ts`
2. Delete `app/routes/teams.$teamId/` and `app/routes/teams.new/`
3. Remove `teams`, `teamMembers`, `teamInvitations` from `app/db/schema.ts`
4. Revert signup route to remove personal team creation
5. `npm run db:generate && npm run db:migrate`
