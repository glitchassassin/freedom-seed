/**
 * Workspace and membership factories.
 */
import { generateId, generateSlug, openD1 } from './db'

interface CreateWorkspaceOptions {
	ownerId: string
	name?: string
	slug?: string
}

interface CreateWorkspaceResult {
	workspace: { id: string; name: string; slug: string }
	membership: { id: string; role: string }
}

/** Creates a shared (non-personal) workspace with the owner as a member. */
export function createWorkspace(
	options: CreateWorkspaceOptions,
): CreateWorkspaceResult {
	const wsId = generateId()
	const name = options.name ?? `Workspace ${wsId.slice(0, 6)}`
	const slug = options.slug ?? generateSlug(name)
	const memberId = generateId()
	const now = Date.now()

	const db = openD1()
	try {
		db.exec('BEGIN')
		db.prepare(
			`INSERT INTO workspaces (id, name, slug, is_personal, created_at, updated_at)
			 VALUES (?, ?, ?, 0, ?, ?)`,
		).run(wsId, name, slug, now, now)

		db.prepare(
			`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
			 VALUES (?, ?, ?, 'owner', ?)`,
		).run(memberId, wsId, options.ownerId, now)

		db.exec('COMMIT')
	} catch (err) {
		db.exec('ROLLBACK')
		throw err
	} finally {
		db.close()
	}

	return {
		workspace: { id: wsId, name, slug },
		membership: { id: memberId, role: 'owner' },
	}
}

interface CreateWorkspaceMemberOptions {
	workspaceId: string
	userId: string
	role?: 'owner' | 'admin' | 'member'
}

/** Adds a user as a member of an existing workspace. */
export function createWorkspaceMember(options: CreateWorkspaceMemberOptions): {
	id: string
	role: string
} {
	const id = generateId()
	const role = options.role ?? 'member'
	const now = Date.now()

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
			 VALUES (?, ?, ?, ?, ?)`,
		).run(id, options.workspaceId, options.userId, role, now)
	} finally {
		db.close()
	}

	return { id, role }
}
