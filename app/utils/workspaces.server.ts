import { and, eq } from 'drizzle-orm'
import type { Db } from '~/db/client.server'
import { workspaces, workspaceMembers, users } from '~/db/schema'
import type { WorkspaceMemberRole } from '~/db/schema'

/**
 * Normalizes a workspace name into a URL-safe slug with an 8-character UUID suffix
 * to ensure global uniqueness.
 */
export function generateSlug(name: string): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'workspace'
	const suffix = crypto.randomUUID().slice(0, 8)
	return `${base}-${suffix}`
}

/**
 * Returns all workspaces the given user belongs to, along with their role in each.
 */
export async function getUserWorkspaces(db: Db, userId: string) {
	return db
		.select({
			id: workspaces.id,
			name: workspaces.name,
			slug: workspaces.slug,
			isPersonal: workspaces.isPersonal,
			role: workspaceMembers.role,
		})
		.from(workspaceMembers)
		.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
		.where(eq(workspaceMembers.userId, userId))
}

/**
 * Looks up a single workspace by its primary key. Returns the workspace row or undefined.
 */
export async function getWorkspaceById(db: Db, workspaceId: string) {
	return db
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)
		.then((r) => r[0])
}

/**
 * Looks up a single workspace by its slug. Returns the workspace row or undefined.
 */
export async function getWorkspaceBySlug(db: Db, slug: string) {
	return db
		.select()
		.from(workspaces)
		.where(eq(workspaces.slug, slug))
		.limit(1)
		.then((r) => r[0])
}

/**
 * Returns the workspace membership row for a specific user in a specific workspace,
 * or null if no membership exists.
 */
export async function getWorkspaceMember(
	db: Db,
	workspaceId: string,
	userId: string,
) {
	return db
		.select()
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, userId),
			),
		)
		.limit(1)
		.then((r) => r[0] ?? null)
}

/**
 * Returns all members of a workspace joined with their user profile data.
 */
export async function getWorkspaceMembers(db: Db, workspaceId: string) {
	return db
		.select({
			id: workspaceMembers.id,
			userId: workspaceMembers.userId,
			email: users.email,
			displayName: users.displayName,
			role: workspaceMembers.role,
			createdAt: workspaceMembers.createdAt,
		})
		.from(workspaceMembers)
		.innerJoin(users, eq(workspaceMembers.userId, users.id))
		.where(eq(workspaceMembers.workspaceId, workspaceId))
}

/**
 * Atomically creates a new workspace and adds the owner as a member via db.batch.
 * Returns the new workspace's ID.
 */
export async function createWorkspace(
	db: Db,
	opts: { name: string; slug: string; ownerId: string },
): Promise<{ workspaceId: string }> {
	const workspaceId = crypto.randomUUID()
	const memberId = crypto.randomUUID()

	await db.batch([
		db.insert(workspaces).values({
			id: workspaceId,
			name: opts.name,
			slug: opts.slug,
		}),
		db.insert(workspaceMembers).values({
			id: memberId,
			workspaceId,
			userId: opts.ownerId,
			role: 'owner',
		}),
	])

	return { workspaceId }
}

/**
 * Renames a workspace, updating its name and updatedAt timestamp.
 */
export async function renameWorkspace(
	db: Db,
	workspaceId: string,
	name: string,
): Promise<void> {
	await db
		.update(workspaces)
		.set({ name, updatedAt: new Date() })
		.where(eq(workspaces.id, workspaceId))
}

/**
 * Removes a user from a workspace by deleting their membership row.
 */
export async function removeWorkspaceMember(
	db: Db,
	workspaceId: string,
	userId: string,
): Promise<void> {
	await db
		.delete(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, userId),
			),
		)
}

/**
 * Updates the role of an existing workspace member.
 */
export async function changeWorkspaceMemberRole(
	db: Db,
	workspaceId: string,
	userId: string,
	role: WorkspaceMemberRole,
): Promise<void> {
	await db
		.update(workspaceMembers)
		.set({ role })
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, userId),
			),
		)
}

/**
 * Deletes a workspace by ID. Cascades to workspaceMembers and workspaceInvitations via FK
 * constraints defined in the schema.
 */
export async function deleteWorkspace(
	db: Db,
	workspaceId: string,
): Promise<void> {
	await db.delete(workspaces).where(eq(workspaces.id, workspaceId))
}
