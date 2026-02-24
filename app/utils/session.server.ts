import { eq } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import type { SessionUser } from './session-context'
import { getDb } from '~/db/client.server'
import { passwordResetTokens, sessions, users } from '~/db/schema'
import { secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'
import {
	sha256Base64url,
	signToken,
	toBase64url,
	verifySignedToken,
} from '~/utils/crypto.server'

const SESSION_COOKIE = 'en_session'
const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const IDLE_MAX_AGE = 7 * 24 * 60 * 60 // 7-day sliding window (seconds)

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new session row in D1 and returns the signed cookie header value.
 */
export async function createSession(
	env: ValidatedEnv,
	userId: string,
	request: Request,
): Promise<{ token: string; cookie: string }> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
	const token = toBase64url(tokenBytes)
	const expiresAt = new Date(Date.now() + ABSOLUTE_TTL_MS)
	const ipAddress =
		request.headers.get('CF-Connecting-IP') ??
		request.headers.get('X-Forwarded-For')
	const userAgent = request.headers.get('user-agent')

	const db = getDb(env)
	await db
		.insert(sessions)
		.values({ id: token, userId, expiresAt, ipAddress, userAgent })

	const signedToken = await signToken(token, env.SESSION_SECRET)
	const isSecure = env.ENVIRONMENT === 'production'
	return { token, cookie: makeSessionCookie(signedToken, isSecure) }
}

/**
 * Validates the session cookie, checks the DB row, and returns the user.
 * Also returns the raw token (for deleteSession) and signed token (to re-issue
 * the cookie in the root middleware).
 */
export async function getSessionUser(
	request: Request,
	env: ValidatedEnv,
): Promise<{
	user: SessionUser | null
	token: string | null
	signedToken: string | null
}> {
	const signedToken = readCookie(request, SESSION_COOKIE)
	if (!signedToken) return { user: null, token: null, signedToken: null }

	const token = await verifySignedToken(signedToken, env.SESSION_SECRET)
	if (!token) return { user: null, token: null, signedToken: null }

	const db = getDb(env)
	const result = await db
		.select({
			id: users.id,
			email: users.email,
			displayName: users.displayName,
			emailVerifiedAt: users.emailVerifiedAt,
			expiresAt: sessions.expiresAt,
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, token))
		.limit(1)

	const row = result[0]
	if (!row) return { user: null, token: null, signedToken: null }
	if (row.expiresAt < new Date())
		return { user: null, token: null, signedToken: null }

	return {
		user: {
			id: row.id,
			email: row.email,
			displayName: row.displayName,
			emailVerifiedAt: row.emailVerifiedAt,
		},
		token,
		signedToken,
	}
}

/** Deletes a single session row (logout). */
export async function deleteSession(
	env: ValidatedEnv,
	token: string,
): Promise<void> {
	const db = getDb(env)
	await db.delete(sessions).where(eq(sessions.id, token))
}

/** Deletes all sessions for a user (password change / "sign out everywhere"). */
export async function deleteAllSessions(
	env: ValidatedEnv,
	userId: string,
): Promise<void> {
	const db = getDb(env)
	await db.delete(sessions).where(eq(sessions.userId, userId))
}

/**
 * Generates a 32-byte URL-safe random token for password reset flows, stores
 * its SHA-256 hash in D1 (so a DB leak cannot be used directly), and returns
 * the raw token to embed in the reset URL.
 */
export async function createPasswordResetToken(
	env: ValidatedEnv,
	userId: string,
): Promise<string> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
	const token = toBase64url(tokenBytes)
	const tokenHash = await sha256Base64url(token)
	const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

	const db = getDb(env)
	await db.insert(passwordResetTokens).values({ tokenHash, userId, expiresAt })
	return token
}

/**
 * Looks up a password reset token by hashing the raw token from the URL.
 * Returns the DB row (including userId) or null if not found / expired / used.
 */
export async function findPasswordResetToken(
	env: ValidatedEnv,
	rawToken: string,
) {
	const tokenHash = await sha256Base64url(rawToken)
	const db = getDb(env)
	const row = await db
		.select()
		.from(passwordResetTokens)
		.where(eq(passwordResetTokens.tokenHash, tokenHash))
		.limit(1)
		.then((r) => r[0])
	if (!row || row.usedAt || row.expiresAt < new Date()) return null
	return row
}

/**
 * Marks all unused reset tokens for a user as used.
 * Call after a successful password reset to invalidate any other pending tokens.
 */
export async function invalidatePasswordResetTokens(
	env: ValidatedEnv,
	userId: string,
): Promise<void> {
	const db = getDb(env)
	await db
		.update(passwordResetTokens)
		.set({ usedAt: new Date() })
		.where(eq(passwordResetTokens.userId, userId))
}

// ── Cookie builders ──────────────────────────────────────────────────────────

/**
 * Builds a Set-Cookie header value for the session cookie.
 * Max-Age slides the 7-day idle window on every request.
 */
export function makeSessionCookie(
	signedToken: string,
	isSecure: boolean,
): string {
	return `${SESSION_COOKIE}=${signedToken}; Path=/; Max-Age=${IDLE_MAX_AGE}; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}

/** Returns a Set-Cookie header value that immediately expires the session cookie. */
export function clearSessionCookie(isSecure: boolean): string {
	return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}
