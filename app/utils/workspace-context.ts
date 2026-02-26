import { createContext } from 'react-router'
import type { RouterContext } from 'react-router'
import type { WorkspaceMemberRole } from '~/db/schema'

export type WorkspaceMember = {
	workspaceId: string
	workspaceName: string
	workspaceSlug: string
	isPersonal: boolean
	role: WorkspaceMemberRole
}

export const workspaceMemberContext = createContext<WorkspaceMember | null>(
	null,
)

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/** Returns the current workspace membership, or null if not in a workspace context. */
export function getOptionalWorkspaceMember(
	context: ContextReader,
): WorkspaceMember | null {
	return context.get(workspaceMemberContext)
}

/**
 * Returns the current workspace membership, throwing 403 if not available.
 * Use in loaders/actions inside the `workspaces.$workspaceId` layout.
 */
export function requireWorkspaceMember(
	context: ContextReader,
): WorkspaceMember {
	const member = context.get(workspaceMemberContext)
	if (!member) throw new Response('Forbidden', { status: 403 })
	return member
}
