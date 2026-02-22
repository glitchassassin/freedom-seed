import { argon2id, argon2Verify } from 'hash-wasm'

/**
 * Hashes a plaintext password with Argon2id.
 * Parameters follow the OWASP recommended minimums for Argon2id.
 */
export async function hashPassword(plain: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16))
	return argon2id({
		password: plain,
		salt,
		parallelism: 1,
		iterations: 2,
		memorySize: 19456,
		hashLength: 32,
		outputType: 'encoded',
	})
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 */
export async function verifyPassword(
	plain: string,
	hash: string,
): Promise<boolean> {
	return argon2Verify({ password: plain, hash })
}
