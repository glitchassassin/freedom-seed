import { createContext } from 'react-router'
import type { RouterContext } from 'react-router'
import type { TeamMemberRole } from '~/db/schema'

export type TeamMember = {
	teamId: string
	teamName: string
	teamSlug: string
	isPersonal: boolean
	role: TeamMemberRole
}

export const teamMemberContext = createContext<TeamMember | null>(null)

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/** Returns the current team membership, or null if not in a team context. */
export function getOptionalTeamMember(
	context: ContextReader,
): TeamMember | null {
	return context.get(teamMemberContext)
}

/**
 * Returns the current team membership, throwing 403 if not available.
 * Use in loaders/actions inside the `teams.$teamId` layout.
 */
export function requireTeamMember(context: ContextReader): TeamMember {
	const member = context.get(teamMemberContext)
	if (!member) throw new Response('Forbidden', { status: 403 })
	return member
}
