import type { RouterContext } from 'react-router'
import type { TeamMemberRole } from '~/db/schema'
import { teamMemberContext } from '~/utils/team-context'

const ROLE_RANK: Record<TeamMemberRole, number> = {
	owner: 3,
	admin: 2,
	member: 1,
}

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/** Returns true if `userRole` meets or exceeds the `minimumRole` rank. */
export function hasRole(
	userRole: TeamMemberRole,
	minimumRole: TeamMemberRole,
): boolean {
	return ROLE_RANK[userRole] >= ROLE_RANK[minimumRole]
}

/**
 * Reads the team member from context and throws 403 if the user's role
 * does not meet the minimum required rank.
 */
export function requireRole(
	context: ContextReader,
	minimumRole: TeamMemberRole,
): void {
	const member = context.get(teamMemberContext)
	if (!member) throw new Response('Forbidden', { status: 403 })
	if (!hasRole(member.role, minimumRole)) {
		throw new Response('Forbidden', { status: 403 })
	}
}
