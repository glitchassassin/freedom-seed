/**
 * Token seeders for E2E tests — password reset, magic link,
 * email verification, and workspace invitation tokens.
 */
import { generateId, generateRawToken, hashToken, openD1 } from './db'

/** Creates a password-reset token and returns the raw token. */
export function seedPasswordResetToken(userId: string): string {
	const rawToken = generateRawToken()
	const tokenHash = hashToken(rawToken)
	const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
			 VALUES (?, ?, ?, ?)`,
		).run(tokenHash, userId, expiresAt, Date.now())
		return rawToken
	} finally {
		db.close()
	}
}

/** Creates a magic-link token and returns the raw token. */
export function seedMagicLinkToken(userId: string): string {
	const rawToken = generateRawToken()
	const tokenHash = hashToken(rawToken)
	const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO magic_link_tokens (token_hash, user_id, expires_at, created_at)
			 VALUES (?, ?, ?, ?)`,
		).run(tokenHash, userId, expiresAt, Date.now())
		return rawToken
	} finally {
		db.close()
	}
}

/** Creates an already-expired magic-link token (for testing expiry). */
export function seedExpiredMagicLinkToken(userId: string): string {
	const rawToken = generateRawToken()
	const tokenHash = hashToken(rawToken)
	const expiresAt = Date.now() - 60 * 1000 // expired 1 minute ago

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO magic_link_tokens (token_hash, user_id, expires_at, created_at)
			 VALUES (?, ?, ?, ?)`,
		).run(tokenHash, userId, expiresAt, Date.now() - 16 * 60 * 1000)
		return rawToken
	} finally {
		db.close()
	}
}

/** Marks a magic-link token as used. Accepts the raw (unhashed) token. */
export function markMagicLinkTokenUsed(rawToken: string): void {
	const tokenHash = hashToken(rawToken)
	const db = openD1()
	try {
		db.prepare(
			'UPDATE magic_link_tokens SET used_at = ? WHERE token_hash = ?',
		).run(Date.now(), tokenHash)
	} finally {
		db.close()
	}
}

/** Creates an email-verification token and returns the raw token. */
export function seedEmailVerificationToken(userId: string): string {
	const rawToken = generateRawToken()
	const tokenHash = hashToken(rawToken)
	const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO email_verification_tokens (token_hash, user_id, expires_at, created_at)
			 VALUES (?, ?, ?, ?)`,
		).run(tokenHash, userId, expiresAt, Date.now())
		return rawToken
	} finally {
		db.close()
	}
}

interface CreateInvitationOptions {
	workspaceId: string
	invitedByUserId: string
	email: string
	role?: 'owner' | 'admin' | 'member'
}

/** Creates a workspace invitation and returns the raw token. */
export function createInvitation(options: CreateInvitationOptions): {
	rawToken: string
} {
	const id = generateId()
	const rawToken = generateRawToken()
	const tokenHash = hashToken(rawToken)
	const role = options.role ?? 'member'
	const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
	const now = Date.now()

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO workspace_invitations (id, workspace_id, invited_by_user_id, email, role, token_hash, expires_at, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			id,
			options.workspaceId,
			options.invitedByUserId,
			options.email,
			role,
			tokenHash,
			expiresAt,
			now,
		)
	} finally {
		db.close()
	}

	return { rawToken }
}
