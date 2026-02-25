import { and, eq } from 'drizzle-orm'
import type { Db } from '~/db/client.server'
import { teams, teamMembers, users } from '~/db/schema'
import type { TeamMemberRole } from '~/db/schema'

/**
 * Normalizes a team name into a URL-safe slug with an 8-character UUID suffix
 * to ensure global uniqueness.
 */
export function generateSlug(name: string): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'team'
	const suffix = crypto.randomUUID().slice(0, 8)
	return `${base}-${suffix}`
}

/**
 * Returns all teams the given user belongs to, along with their role in each.
 */
export async function getUserTeams(db: Db, userId: string) {
	return db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			isPersonal: teams.isPersonal,
			role: teamMembers.role,
		})
		.from(teamMembers)
		.innerJoin(teams, eq(teamMembers.teamId, teams.id))
		.where(eq(teamMembers.userId, userId))
}

/**
 * Looks up a single team by its primary key. Returns the team row or undefined.
 */
export async function getTeamById(db: Db, teamId: string) {
	return db
		.select()
		.from(teams)
		.where(eq(teams.id, teamId))
		.limit(1)
		.then((r) => r[0])
}

/**
 * Looks up a single team by its slug. Returns the team row or undefined.
 */
export async function getTeamBySlug(db: Db, slug: string) {
	return db
		.select()
		.from(teams)
		.where(eq(teams.slug, slug))
		.limit(1)
		.then((r) => r[0])
}

/**
 * Returns the team membership row for a specific user in a specific team,
 * or null if no membership exists.
 */
export async function getTeamMember(db: Db, teamId: string, userId: string) {
	return db
		.select()
		.from(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
		.limit(1)
		.then((r) => r[0] ?? null)
}

/**
 * Returns all members of a team joined with their user profile data.
 */
export async function getTeamMembers(db: Db, teamId: string) {
	return db
		.select({
			id: teamMembers.id,
			userId: teamMembers.userId,
			email: users.email,
			displayName: users.displayName,
			role: teamMembers.role,
			createdAt: teamMembers.createdAt,
		})
		.from(teamMembers)
		.innerJoin(users, eq(teamMembers.userId, users.id))
		.where(eq(teamMembers.teamId, teamId))
}

/**
 * Atomically creates a new team and adds the owner as a member via db.batch.
 * Returns the new team's ID.
 */
export async function createTeam(
	db: Db,
	opts: { name: string; slug: string; ownerId: string },
): Promise<{ teamId: string }> {
	const teamId = crypto.randomUUID()
	const memberId = crypto.randomUUID()

	await db.batch([
		db.insert(teams).values({
			id: teamId,
			name: opts.name,
			slug: opts.slug,
		}),
		db.insert(teamMembers).values({
			id: memberId,
			teamId,
			userId: opts.ownerId,
			role: 'owner',
		}),
	])

	return { teamId }
}

/**
 * Renames a team, updating its name and updatedAt timestamp.
 */
export async function renameTeam(
	db: Db,
	teamId: string,
	name: string,
): Promise<void> {
	await db
		.update(teams)
		.set({ name, updatedAt: new Date() })
		.where(eq(teams.id, teamId))
}

/**
 * Removes a user from a team by deleting their membership row.
 */
export async function removeTeamMember(
	db: Db,
	teamId: string,
	userId: string,
): Promise<void> {
	await db
		.delete(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
}

/**
 * Updates the role of an existing team member.
 */
export async function changeTeamMemberRole(
	db: Db,
	teamId: string,
	userId: string,
	role: TeamMemberRole,
): Promise<void> {
	await db
		.update(teamMembers)
		.set({ role })
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
}

/**
 * Deletes a team by ID. Cascades to teamMembers and teamInvitations via FK
 * constraints defined in the schema.
 */
export async function deleteTeam(db: Db, teamId: string): Promise<void> {
	await db.delete(teams).where(eq(teams.id, teamId))
}
