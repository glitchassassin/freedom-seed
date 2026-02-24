/**
 * Direct D1 database access for E2E tests.
 *
 * Uses Node's built-in `node:sqlite` module (Node >= 22) to read/write
 * the local miniflare D1 SQLite file while the preview server is running.
 * This enables tests that need to seed data the app API cannot expose
 * (e.g. password-reset tokens that are only logged to console in dev).
 */
import { createHash, randomBytes } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MINIFLARE_D1_DIR = join(
	process.cwd(),
	'.wrangler/state/v3/d1/miniflare-D1DatabaseObject',
)

/**
 * Opens the miniflare D1 SQLite database that contains the app tables.
 * Throws if no matching database is found (preview server not running).
 */
function openD1(): InstanceType<typeof DatabaseSync> {
	const files = readdirSync(MINIFLARE_D1_DIR).filter((f) =>
		f.endsWith('.sqlite'),
	)
	for (const file of files) {
		const db = new DatabaseSync(join(MINIFLARE_D1_DIR, file))
		try {
			const tables = db
				.prepare("SELECT name FROM sqlite_master WHERE type='table'")
				.all() as Array<{ name: string }>
			if (tables.some((t) => t.name === 'users')) {
				return db
			}
		} catch {
			// Skip corrupted or non-app databases
		}
		db.close()
	}
	throw new Error(
		'Could not find D1 database with app tables. Is the preview server running?',
	)
}

/**
 * Looks up a user ID by email from the local D1 database.
 */
export function getUserIdByEmail(email: string): string {
	const db = openD1()
	try {
		const row = db
			.prepare('SELECT id FROM users WHERE email = ?')
			.get(email) as { id: string } | undefined
		if (!row) throw new Error(`User not found: ${email}`)
		return row.id
	} finally {
		db.close()
	}
}

/**
 * Creates a password-reset token in the local D1 database and returns
 * the raw token (suitable for `/reset-password?token=<raw>`).
 *
 * This mirrors the logic in `createPasswordResetToken()` but runs in
 * the test process so we can obtain the raw token directly.
 */
export function seedPasswordResetToken(userId: string): string {
	const rawToken = randomBytes(32).toString('base64url')
	const tokenHash = createHash('sha256').update(rawToken).digest('base64url')
	// Drizzle schema uses `mode: 'timestamp_ms'`, so D1 stores raw milliseconds
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

/**
 * Creates a magic-link token in the local D1 database and returns
 * the raw token (suitable for `/magic-link/verify?token=<raw>`).
 *
 * This mirrors the logic in the magic link creation flow but runs in
 * the test process so we can obtain the raw token directly.
 */
export function seedMagicLinkToken(userId: string): string {
	const rawToken = randomBytes(32).toString('base64url')
	const tokenHash = createHash('sha256').update(rawToken).digest('base64url')
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

/**
 * Creates an already-expired magic-link token in the local D1 database
 * and returns the raw token (for testing expiry handling).
 */
export function seedExpiredMagicLinkToken(userId: string): string {
	const rawToken = randomBytes(32).toString('base64url')
	const tokenHash = createHash('sha256').update(rawToken).digest('base64url')
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

/**
 * Marks a magic-link token as used by setting its `used_at` timestamp.
 * Accepts the raw token (not the hash).
 */
export function markMagicLinkTokenUsed(rawToken: string): void {
	const tokenHash = createHash('sha256').update(rawToken).digest('base64url')
	const db = openD1()
	try {
		db.prepare(
			'UPDATE magic_link_tokens SET used_at = ? WHERE token_hash = ?',
		).run(Date.now(), tokenHash)
	} finally {
		db.close()
	}
}
