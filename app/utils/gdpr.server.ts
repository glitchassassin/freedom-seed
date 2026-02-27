import { eq } from 'drizzle-orm'
import { getDb } from '~/db/client.server'
import {
	mfaCredentials,
	passkeyCredentials,
	sessions,
	socialIdentities,
	users,
	workspaceMembers,
} from '~/db/schema'

const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

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

	const [user, userSessions, members, identities, passkeys, mfa] =
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
		])

	return {
		exportedAt: new Date().toISOString(),
		user,
		sessions: userSessions,
		workspaceMemberships: members,
		connectedAccounts: identities,
		passkeys,
		mfaEnabled: mfa !== null,
	}
}

/**
 * Soft-deletes a user account by:
 * 1. Anonymising all PII stored directly on the users row.
 * 2. Setting `scheduledForDeletionAt` to 30 days from now so a cron job can
 *    perform the hard deletion after the grace period.
 *
 * Call `deleteAllSessions` separately to revoke active sessions.
 */
export async function softDeleteUser(
	env: { DB: D1Database },
	userId: string,
): Promise<void> {
	const db = getDb(env)
	const scheduledForDeletionAt = new Date(Date.now() + DELETION_GRACE_PERIOD_MS)

	await db
		.update(users)
		.set({
			// Replace PII with non-identifiable placeholders
			email: `deleted-${userId}@deleted.invalid`,
			displayName: null,
			emailVerifiedAt: null,
			scheduledForDeletionAt,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId))
}
