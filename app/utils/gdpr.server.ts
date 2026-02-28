import { eq } from 'drizzle-orm'
import { getDb } from '~/db/client.server'
import {
	mfaBackupCodes,
	mfaCredentials,
	passkeyCredentials,
	passwordCredentials,
	sessions,
	socialIdentities,
	users,
	workspaceInvitations,
	workspaceMembers,
} from '~/db/schema'

export const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Collects all personal data for a user and returns it as a plain object
 * suitable for JSON serialisation. Sensitive secrets (password hashes, TOTP
 * secrets, backup codes) are intentionally excluded.
 */
export async function exportUserData(
	env: { DB: D1Database },
	userId: string,
): Promise<Record<string, unknown>> {
	const db = getDb(env)

	const [user, userSessions, members, identities, passkeys, mfa, invitations] =
		await Promise.all([
			db
				.select({
					id: users.id,
					email: users.email,
					displayName: users.displayName,
					emailVerifiedAt: users.emailVerifiedAt,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1)
				.then((r) => r[0] ?? null),
			db
				.select({
					createdAt: sessions.createdAt,
					expiresAt: sessions.expiresAt,
					ipAddress: sessions.ipAddress,
					userAgent: sessions.userAgent,
				})
				.from(sessions)
				.where(eq(sessions.userId, userId)),
			db
				.select({
					workspaceId: workspaceMembers.workspaceId,
					role: workspaceMembers.role,
					createdAt: workspaceMembers.createdAt,
				})
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId)),
			db
				.select({
					provider: socialIdentities.provider,
					email: socialIdentities.email,
					displayName: socialIdentities.displayName,
					createdAt: socialIdentities.createdAt,
				})
				.from(socialIdentities)
				.where(eq(socialIdentities.userId, userId)),
			db
				.select({
					name: passkeyCredentials.name,
					deviceType: passkeyCredentials.deviceType,
					backedUp: passkeyCredentials.backedUp,
					lastUsedAt: passkeyCredentials.lastUsedAt,
					createdAt: passkeyCredentials.createdAt,
				})
				.from(passkeyCredentials)
				.where(eq(passkeyCredentials.userId, userId)),
			db
				.select({
					verifiedAt: mfaCredentials.verifiedAt,
					createdAt: mfaCredentials.createdAt,
				})
				.from(mfaCredentials)
				.where(eq(mfaCredentials.userId, userId))
				.limit(1)
				.then((r) => r[0] ?? null),
			db
				.select({
					workspaceId: workspaceInvitations.workspaceId,
					email: workspaceInvitations.email,
					role: workspaceInvitations.role,
					expiresAt: workspaceInvitations.expiresAt,
					acceptedAt: workspaceInvitations.acceptedAt,
					revokedAt: workspaceInvitations.revokedAt,
					createdAt: workspaceInvitations.createdAt,
				})
				.from(workspaceInvitations)
				.where(eq(workspaceInvitations.invitedByUserId, userId)),
		])

	return {
		exportedAt: new Date().toISOString(),
		user,
		sessions: userSessions,
		workspaceMemberships: members,
		connectedAccounts: identities,
		passkeys,
		mfaEnabled: mfa !== null,
		workspaceInvitationsSent: invitations,
	}
}

/**
 * Soft-deletes a user account:
 * 1. Anonymises PII on the users row and schedules hard deletion in 30 days.
 * 2. Deletes all credential and session rows that contain PII (IP addresses,
 *    OAuth profiles, password hashes, passkey keys, TOTP secrets).
 *
 * Returns the `scheduledForDeletionAt` date so callers can include it in
 * confirmation emails without duplicating the grace-period constant.
 */
export async function softDeleteUser(
	env: { DB: D1Database },
	userId: string,
): Promise<{ scheduledForDeletionAt: Date }> {
	const db = getDb(env)
	const scheduledForDeletionAt = new Date(Date.now() + DELETION_GRACE_PERIOD_MS)

	await db.batch([
		db
			.update(users)
			.set({
				email: `deleted-${userId}@deleted.invalid`,
				displayName: null,
				emailVerifiedAt: null,
				scheduledForDeletionAt,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId)),
		// Remove all PII-containing credential rows immediately
		db.delete(sessions).where(eq(sessions.userId, userId)),
		db.delete(socialIdentities).where(eq(socialIdentities.userId, userId)),
		db
			.delete(passwordCredentials)
			.where(eq(passwordCredentials.userId, userId)),
		db.delete(passkeyCredentials).where(eq(passkeyCredentials.userId, userId)),
		db.delete(mfaCredentials).where(eq(mfaCredentials.userId, userId)),
		db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, userId)),
	])

	return { scheduledForDeletionAt }
}
