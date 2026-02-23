/// <reference types="node" />
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'

const DEFAULT_LN = 14 // N = 2^14 = 16384
const DEFAULT_R = 8
const DEFAULT_P = 5 // OWASP equivalent config: N=2^14, r=8, p=5 (~16 MiB)
const SALT_LENGTH = 16
const KEY_LENGTH = 32

function scryptAsync(
	password: string,
	salt: Buffer,
	keylen: number,
	options: { N: number; r: number; p: number },
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(password, salt, keylen, options, (err, derived) => {
			if (err) reject(err)
			else resolve(derived)
		})
	})
}

function toBase64Url(buf: Buffer): string {
	return buf.toString('base64url')
}

function fromBase64Url(str: string): Buffer {
	return Buffer.from(str, 'base64url')
}

/**
 * Hashes a plaintext password with scrypt.
 * Output format: $scrypt$ln=14,r=8,p=5$<base64url_salt>$<base64url_hash>
 */
export async function hashPassword(plain: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH)
	const N = 2 ** DEFAULT_LN
	const derived = await scryptAsync(plain, salt, KEY_LENGTH, {
		N,
		r: DEFAULT_R,
		p: DEFAULT_P,
	})

	return `$scrypt$ln=${DEFAULT_LN},r=${DEFAULT_R},p=${DEFAULT_P}$${toBase64Url(salt)}$${toBase64Url(derived)}`
}

/**
 * Verifies a plaintext password against a stored scrypt hash.
 * Parses parameters from the stored hash (future-proof for parameter bumps).
 */
export async function verifyPassword(
	plain: string,
	hash: string,
): Promise<boolean> {
	const parts = hash.split('$')
	// Expected: ['', 'scrypt', 'ln=14,r=8,p=5', '<salt>', '<hash>']
	if (parts.length !== 5 || parts[1] !== 'scrypt') return false

	const params = Object.fromEntries(
		parts[2].split(',').map((kv) => {
			const [k, v] = kv.split('=')
			return [k, Number(v)]
		}),
	)

	const ln = params.ln
	const r = params.r
	const p = params.p
	if (!(ln >= 1 && ln <= 20 && r >= 1 && r <= 16 && p >= 1 && p <= 16))
		return false

	const salt = fromBase64Url(parts[3])
	const stored = fromBase64Url(parts[4])

	const derived = await scryptAsync(plain, salt, stored.length, {
		N: 2 ** ln,
		r,
		p,
	})

	if (stored.length !== derived.length) return false
	return timingSafeEqual(stored, derived)
}
