import { and, eq, isNull } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import { emailVerificationTokens, users } from '~/db/schema'
import { sha256Base64url, toBase64url } from '~/utils/crypto.server'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Generates a 32-byte random token for email verification, stores its SHA-256
 * hash in D1, and returns the raw token to embed in the verification URL.
 */
export async function createEmailVerificationToken(
	env: ValidatedEnv,
	userId: string,
): Promise<string> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
	const token = toBase64url(tokenBytes)
	const tokenHash = await sha256Base64url(token)
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

	const db = getDb(env)
	await db
		.insert(emailVerificationTokens)
		.values({ tokenHash, userId, expiresAt })
	return token
}

/**
 * Looks up an email verification token by hashing the raw token from the URL.
 * Returns the DB row (including userId) or null if not found / expired / used.
 */
export async function findEmailVerificationToken(
	env: ValidatedEnv,
	rawToken: string,
) {
	const tokenHash = await sha256Base64url(rawToken)
	const db = getDb(env)
	const row = await db
		.select()
		.from(emailVerificationTokens)
		.where(eq(emailVerificationTokens.tokenHash, tokenHash))
		.limit(1)
		.then((r) => r[0])
	if (!row || row.usedAt || row.expiresAt < new Date()) return null
	return row
}

/**
 * Marks all unused email verification tokens for a user as used.
 * Call after a successful verification to invalidate any other pending tokens.
 */
export async function invalidateEmailVerificationTokens(
	env: ValidatedEnv,
	userId: string,
): Promise<void> {
	const db = getDb(env)
	await db
		.update(emailVerificationTokens)
		.set({ usedAt: new Date() })
		.where(
			and(
				eq(emailVerificationTokens.userId, userId),
				isNull(emailVerificationTokens.usedAt),
			),
		)
}

/**
 * Sets emailVerifiedAt on the user row, but only if it hasn't been set yet.
 */
export async function markEmailVerified(
	env: ValidatedEnv,
	userId: string,
): Promise<void> {
	const db = getDb(env)
	await db
		.update(users)
		.set({ emailVerifiedAt: new Date() })
		.where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
}
