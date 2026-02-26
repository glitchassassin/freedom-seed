import type { RouterContext } from 'react-router'
import type { WorkspaceMemberRole } from '~/db/schema'
import { workspaceMemberContext } from '~/utils/workspace-context'

const ROLE_RANK: Record<WorkspaceMemberRole, number> = {
	owner: 3,
	admin: 2,
	member: 1,
}

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/** Returns true if `userRole` meets or exceeds the `minimumRole` rank. */
export function hasRole(
	userRole: WorkspaceMemberRole,
	minimumRole: WorkspaceMemberRole,
): boolean {
	return ROLE_RANK[userRole] >= ROLE_RANK[minimumRole]
}

/**
 * Reads the workspace member from context and throws 403 if the user's role
 * does not meet the minimum required rank.
 */
export function requireRole(
	context: ContextReader,
	minimumRole: WorkspaceMemberRole,
): void {
	const member = context.get(workspaceMemberContext)
	if (!member) throw new Response('Forbidden', { status: 403 })
	if (!hasRole(member.role, minimumRole)) {
		throw new Response('Forbidden', { status: 403 })
	}
}
