import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from '~/db/client.server'
import { workspaceInvitations, workspaceMembers } from '~/db/schema'
import type { WorkspaceMemberRole } from '~/db/schema'
import { sha256Base64url, toBase64url } from '~/utils/crypto.server'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Creates a workspace invitation, stores the SHA-256 hash of the token in D1
 * with a 7-day expiry, and returns the raw token for the invitation URL.
 */
export async function createWorkspaceInvitation(
	db: Db,
	opts: {
		workspaceId: string
		invitedByUserId: string
		email: string
		role: WorkspaceMemberRole
	},
): Promise<{ invitationId: string; rawToken: string }> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
	const rawToken = toBase64url(tokenBytes)
	const tokenHash = await sha256Base64url(rawToken)
	const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
	const invitationId = crypto.randomUUID()

	await db.insert(workspaceInvitations).values({
		id: invitationId,
		workspaceId: opts.workspaceId,
		invitedByUserId: opts.invitedByUserId,
		email: opts.email.toLowerCase(),
		role: opts.role,
		tokenHash,
		expiresAt,
	})

	return { invitationId, rawToken }
}

/**
 * Looks up a workspace invitation by hashing the raw token from the URL.
 * Returns the DB row or null if not found / expired / used / revoked.
 */
export async function findValidInvitation(db: Db, rawToken: string) {
	const tokenHash = await sha256Base64url(rawToken)
	const row = await db
		.select()
		.from(workspaceInvitations)
		.where(eq(workspaceInvitations.tokenHash, tokenHash))
		.limit(1)
		.then((r) => r[0])
	if (!row) return null
	if (row.acceptedAt || row.revokedAt) return null
	if (row.expiresAt < new Date()) return null
	return row
}

/**
 * Accepts an invitation: marks it as accepted and inserts the user
 * as a workspace member in a single batch.
 */
export async function acceptInvitation(
	db: Db,
	opts: {
		invitationId: string
		userId: string
		workspaceId: string
		role: WorkspaceMemberRole
	},
): Promise<void> {
	await db.batch([
		db
			.update(workspaceInvitations)
			.set({ acceptedAt: new Date() })
			.where(eq(workspaceInvitations.id, opts.invitationId)),
		db.insert(workspaceMembers).values({
			workspaceId: opts.workspaceId,
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
		.update(workspaceInvitations)
		.set({ revokedAt: new Date() })
		.where(eq(workspaceInvitations.id, invitationId))
}

/** Returns all pending (non-accepted, non-revoked) invitations for a workspace. */
export async function getPendingInvitations(db: Db, workspaceId: string) {
	return db
		.select()
		.from(workspaceInvitations)
		.where(
			and(
				eq(workspaceInvitations.workspaceId, workspaceId),
				isNull(workspaceInvitations.acceptedAt),
				isNull(workspaceInvitations.revokedAt),
			),
		)
		.orderBy(workspaceInvitations.createdAt)
}
