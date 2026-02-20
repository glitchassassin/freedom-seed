# rbac

## Description

Role-based access control scoped to team membership. Each team member holds a
role (owner, admin, member) that governs what actions they may perform on shared
resources. Permissions are checked in Route loaders/actions via a
`can(user, action, resource)` helper. Global app-level roles (e.g. `superadmin`)
are separate from team roles.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
