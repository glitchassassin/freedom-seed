import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from '~/db/client.server'
import { teamInvitations, teamMembers } from '~/db/schema'
import type { TeamMemberRole } from '~/db/schema'
import { sha256Base64url, toBase64url } from '~/utils/crypto.server'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Creates a team invitation, stores the SHA-256 hash of the token in D1
 * with a 7-day expiry, and returns the raw token for the invitation URL.
 */
export async function createTeamInvitation(
	db: Db,
	opts: {
		teamId: string
		invitedByUserId: string
		email: string
		role: TeamMemberRole
	},
): Promise<{ invitationId: string; rawToken: string }> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
	const rawToken = toBase64url(tokenBytes)
	const tokenHash = await sha256Base64url(rawToken)
	const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
	const invitationId = crypto.randomUUID()

	await db.insert(teamInvitations).values({
		id: invitationId,
		teamId: opts.teamId,
		invitedByUserId: opts.invitedByUserId,
		email: opts.email.toLowerCase(),
		role: opts.role,
		tokenHash,
		expiresAt,
	})

	return { invitationId, rawToken }
}

/**
 * Looks up a team invitation by hashing the raw token from the URL.
 * Returns the DB row or null if not found / expired / used / revoked.
 */
export async function findValidInvitation(db: Db, rawToken: string) {
	const tokenHash = await sha256Base64url(rawToken)
	const row = await db
		.select()
		.from(teamInvitations)
		.where(eq(teamInvitations.tokenHash, tokenHash))
		.limit(1)
		.then((r) => r[0])
	if (!row) return null
	if (row.acceptedAt || row.revokedAt) return null
	if (row.expiresAt < new Date()) return null
	return row
}

/**
 * Accepts an invitation: marks it as accepted and inserts the user
 * as a team member in a single batch.
 */
export async function acceptInvitation(
	db: Db,
	opts: {
		invitationId: string
		userId: string
		teamId: string
		role: TeamMemberRole
	},
): Promise<void> {
	await db.batch([
		db
			.update(teamInvitations)
			.set({ acceptedAt: new Date() })
			.where(eq(teamInvitations.id, opts.invitationId)),
		db.insert(teamMembers).values({
			teamId: opts.teamId,
			userId: opts.userId,
			role: opts.role,
		}),
	])
}

/** Revokes a pending invitation by setting revokedAt. */
export async function revokeInvitation(
	db: Db,
	invitationId: string,
): Promise<void> {
	await db
		.update(teamInvitations)
		.set({ revokedAt: new Date() })
		.where(eq(teamInvitations.id, invitationId))
}

/** Returns all pending (non-accepted, non-revoked) invitations for a team. */
export async function getPendingInvitations(db: Db, teamId: string) {
	return db
		.select()
		.from(teamInvitations)
		.where(
			and(
				eq(teamInvitations.teamId, teamId),
				isNull(teamInvitations.acceptedAt),
				isNull(teamInvitations.revokedAt),
			),
		)
		.orderBy(teamInvitations.createdAt)
}
