import { and, eq, isNull } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import { magicLinkTokens } from '~/db/schema'
import { sha256Base64url, toBase64url } from '~/utils/crypto.server'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Generates a 32-byte random token for magic link login, stores its SHA-256
 * hash in D1 with a 15-minute expiry, and returns the raw token to embed in
 * the login URL.
 */
export async function createMagicLinkToken(
	env: ValidatedEnv,
	userId: string,
): Promise<string> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
	const token = toBase64url(tokenBytes)
	const tokenHash = await sha256Base64url(token)
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

	const db = getDb(env)
	await db.insert(magicLinkTokens).values({ tokenHash, userId, expiresAt })
	return token
}

/**
 * Looks up a magic link token by hashing the raw token from the URL.
 * Returns the DB row (including userId) or null if not found / expired / used.
 */
export async function findMagicLinkToken(env: ValidatedEnv, rawToken: string) {
	const tokenHash = await sha256Base64url(rawToken)
	const db = getDb(env)
	const row = await db
		.select()
		.from(magicLinkTokens)
		.where(eq(magicLinkTokens.tokenHash, tokenHash))
		.limit(1)
		.then((r) => r[0])
	if (!row || row.usedAt || row.expiresAt < new Date()) return null
	return row
}

/**
 * Marks all unused magic link tokens for a user as used.
 * Call after a successful magic link login to prevent reuse.
 */
export async function invalidateMagicLinkTokens(
	env: ValidatedEnv,
	userId: string,
): Promise<void> {
	const db = getDb(env)
	await db
		.update(magicLinkTokens)
		.set({ usedAt: new Date() })
		.where(
			and(eq(magicLinkTokens.userId, userId), isNull(magicLinkTokens.usedAt)),
		)
}
