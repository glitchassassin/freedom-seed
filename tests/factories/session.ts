/**
 * Session factory — creates authenticated sessions for E2E tests.
 */
import { generateRawToken, openD1, signSessionToken } from './db'

interface CreateSessionOptions {
	userId: string
	expiresAt?: number
}

interface CreateSessionResult {
	sessionId: string
	signedToken: string
}

/**
 * Inserts a session row and returns the signed token suitable for
 * setting as the `en_session` cookie via `context.addCookies()`.
 */
export function createSession(
	options: CreateSessionOptions,
): CreateSessionResult {
	const rawToken = generateRawToken()
	const expiresAt = options.expiresAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
	const now = Date.now()

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO sessions (id, user_id, created_at, expires_at)
			 VALUES (?, ?, ?, ?)`,
		).run(rawToken, options.userId, now, expiresAt)
	} finally {
		db.close()
	}

	return {
		sessionId: rawToken,
		signedToken: signSessionToken(rawToken),
	}
}
