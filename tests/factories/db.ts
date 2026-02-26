/**
 * Shared database access and crypto primitives for test factories.
 *
 * Runs inside the Node test process — uses `node:sqlite` to access the
 * miniflare D1 SQLite file directly.  No Drizzle (needs a D1 binding).
 */
import { createHash, createHmac, randomBytes, scrypt } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MINIFLARE_D1_DIR = join(
	process.cwd(),
	'.wrangler/state/v3/d1/miniflare-D1DatabaseObject',
)

let cachedDbPath: string | undefined

function resolveD1Path(): string {
	if (cachedDbPath) return cachedDbPath
	const files = readdirSync(MINIFLARE_D1_DIR).filter((f) =>
		f.endsWith('.sqlite'),
	)
	for (const file of files) {
		const fullPath = join(MINIFLARE_D1_DIR, file)
		const db = new DatabaseSync(fullPath)
		try {
			const tables = db
				.prepare("SELECT name FROM sqlite_master WHERE type='table'")
				.all() as Array<{ name: string }>
			if (tables.some((t) => t.name === 'users')) {
				db.close()
				cachedDbPath = fullPath
				return fullPath
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

/** Opens the miniflare D1 SQLite database containing app tables. */
export function openD1(): InstanceType<typeof DatabaseSync> {
	const db = new DatabaseSync(resolveD1Path())
	db.exec('PRAGMA busy_timeout = 5000')
	return db
}

/** Generates a new UUID v4 identifier. */
export function generateId(): string {
	return crypto.randomUUID()
}

/** Converts a name to a URL-safe slug with a unique suffix (matches production). */
export function generateSlug(name: string): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'workspace'
	return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

/** Generates a 32-byte random token as base64url string. */
export function generateRawToken(): string {
	return randomBytes(32).toString('base64url')
}

/** Returns the SHA-256 hash of a string as base64url. */
export function hashToken(raw: string): string {
	return createHash('sha256').update(raw).digest('base64url')
}

/**
 * Hashes a password using scrypt with the same params as
 * `app/utils/password.server.ts`: N=16384 (ln=14), r=8, p=5,
 * salt=16 bytes, key=32 bytes.
 *
 * Output format: $scrypt$ln=14,r=8,p=5$<base64url_salt>$<base64url_hash>
 */
export async function hashPassword(plain: string): Promise<string> {
	const salt = randomBytes(16)
	const derived = await new Promise<Buffer>((resolve, reject) => {
		scrypt(plain, salt, 32, { N: 16384, r: 8, p: 5 }, (err, key) => {
			if (err) reject(err)
			else resolve(key)
		})
	})
	return `$scrypt$ln=14,r=8,p=5$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

/**
 * Signs a session token with HMAC-SHA256 using SESSION_SECRET from `.dev.vars`
 * (falls back to `.dev.vars.test` in CI).
 * Returns `rawToken.signature` — the format stored in the `en_session` cookie.
 */
export function signSessionToken(rawToken: string): string {
	const secret = readSessionSecret()
	const sig = createHmac('sha256', secret).update(rawToken).digest('base64url')
	return `${rawToken}.${sig}`
}

let cachedSecret: string | undefined
function readSessionSecret(): string {
	if (cachedSecret) return cachedSecret
	const cwd = process.cwd()
	let content: string
	try {
		content = readFileSync(join(cwd, '.dev.vars'), 'utf-8')
	} catch {
		content = readFileSync(join(cwd, '.dev.vars.test'), 'utf-8')
	}
	const match = content.match(/^SESSION_SECRET\s*=\s*"?(.+?)"?\s*$/m)
	if (!match)
		throw new Error('SESSION_SECRET not found in .dev.vars or .dev.vars.test')
	cachedSecret = match[1]
	return cachedSecret
}
