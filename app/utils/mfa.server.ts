import { eq, and, isNull } from 'drizzle-orm'
import * as OTPAuth from 'otpauth'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import { mfaBackupCodes } from '~/db/schema'
import { secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'
import {
	sha256Base64url,
	signToken,
	verifySignedToken,
} from '~/utils/crypto.server'

// ── TOTP helpers ──────────────────────────────────────────────────────────────

/**
 * Generates a new TOTP secret and otpauth URI for enrollment.
 */
export function generateMfaSecret(userEmail: string): {
	secret: string
	otpauthUri: string
} {
	const totp = new OTPAuth.TOTP({
		issuer: 'Seed Vault',
		label: userEmail,
		secret: new OTPAuth.Secret(),
		period: 30,
		digits: 6,
		algorithm: 'SHA1',
	})
	return {
		secret: totp.secret.base32,
		otpauthUri: totp.toString(),
	}
}

/**
 * Validates a 6-digit TOTP code against the stored secret.
 * Allows a +-1 window (30 seconds each side).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
	const totp = new OTPAuth.TOTP({
		issuer: 'Seed Vault',
		secret: OTPAuth.Secret.fromBase32(secret),
		period: 30,
		digits: 6,
		algorithm: 'SHA1',
	})
	// delta returns null if invalid, or the time step difference if valid
	const delta = totp.validate({ token: code, window: 1 })
	return delta !== null
}

// ── Backup codes ──────────────────────────────────────────────────────────────

const BACKUP_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generates random backup codes and their SHA-256 hashes for storage.
 */
export async function generateBackupCodes(count = 8): Promise<{
	codes: string[]
	hashes: string[]
}> {
	const codes: string[] = []
	const hashes: string[] = []
	for (let i = 0; i < count; i++) {
		const bytes = crypto.getRandomValues(new Uint8Array(8))
		let code = ''
		for (let j = 0; j < 8; j++) {
			code += BACKUP_CODE_CHARS[bytes[j] % BACKUP_CODE_CHARS.length]
		}
		codes.push(code)
		hashes.push(await sha256Base64url(code))
	}
	return { codes, hashes }
}

/**
 * Verifies a backup code for a user. If valid, marks it as used and returns true.
 */
export async function verifyBackupCode(
	env: ValidatedEnv,
	userId: string,
	code: string,
): Promise<boolean> {
	const codeHash = await sha256Base64url(code.toLowerCase().trim())
	const db = getDb(env)

	const row = await db
		.select()
		.from(mfaBackupCodes)
		.where(
			and(
				eq(mfaBackupCodes.userId, userId),
				eq(mfaBackupCodes.codeHash, codeHash),
				isNull(mfaBackupCodes.usedAt),
			),
		)
		.limit(1)
		.then((r) => r[0])

	if (!row) return false

	await db
		.update(mfaBackupCodes)
		.set({ usedAt: new Date() })
		.where(eq(mfaBackupCodes.id, row.id))

	return true
}

// ── MFA pending cookie ────────────────────────────────────────────────────────

const MFA_PENDING_COOKIE = 'en_mfa_pending'
const MFA_PENDING_TTL_SECONDS = 300 // 5 minutes

/**
 * Creates a signed cookie containing the userId for the MFA challenge step.
 * Returns the Set-Cookie header value.
 */
export async function createMfaPendingCookie(
	env: ValidatedEnv,
	userId: string,
): Promise<string> {
	const payload = `${userId}.${Date.now()}`
	const signed = await signToken(payload, env.SESSION_SECRET)
	const isSecure = env.ENVIRONMENT === 'production'
	return `${MFA_PENDING_COOKIE}=${signed}; Path=/; Max-Age=${MFA_PENDING_TTL_SECONDS}; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}

/**
 * Reads and verifies the MFA pending cookie.
 * Returns the userId if valid, null otherwise.
 */
export async function verifyMfaPendingCookie(
	request: Request,
	env: ValidatedEnv,
): Promise<string | null> {
	const signed = readCookie(request, MFA_PENDING_COOKIE)
	if (!signed) return null

	const payload = await verifySignedToken(signed, env.SESSION_SECRET)
	if (!payload) return null

	// payload format: "{userId}.{timestamp}"
	const dotIdx = payload.lastIndexOf('.')
	if (dotIdx === -1) return null

	const userId = payload.slice(0, dotIdx)
	const timestamp = parseInt(payload.slice(dotIdx + 1), 10)
	if (isNaN(timestamp)) return null

	const age = Date.now() - timestamp
	if (age > MFA_PENDING_TTL_SECONDS * 1000 || age < 0) return null

	return userId
}

/**
 * Returns a Set-Cookie header value that clears the MFA pending cookie.
 */
export function clearMfaPendingCookie(isSecure: boolean): string {
	return `${MFA_PENDING_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}
