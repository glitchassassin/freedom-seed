// ── Base-encoding ────────────────────────────────────────────────────────────

/** Encodes raw bytes as a URL-safe Base64 string with no padding. */
export function toBase64url(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── Hashing / HMAC ──────────────────────────────────────────────────────────

/** Returns the SHA-256 hash of `data` as a URL-safe Base64 string. */
export async function sha256Base64url(data: string): Promise<string> {
	const hash = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(data),
	)
	return toBase64url(new Uint8Array(hash))
}

/** Signs `data` with `secret` using HMAC-SHA256, returns URL-safe Base64. */
export async function hmacSha256(
	data: string,
	secret: string,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const sigBuffer = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(data),
	)
	return toBase64url(new Uint8Array(sigBuffer))
}

// ── Token signing / verification ─────────────────────────────────────────────

/** Creates a signed token in the form `<token>.<hmac-signature>`. */
export async function signToken(
	token: string,
	secret: string,
): Promise<string> {
	const sig = await hmacSha256(token, secret)
	return `${token}.${sig}`
}

/**
 * Verifies the HMAC signature of a signed token.
 * Uses a constant-time comparison to prevent timing attacks.
 * Returns the raw token on success, null on failure.
 */
export async function verifySignedToken(
	signedToken: string,
	secret: string,
): Promise<string | null> {
	const dotIdx = signedToken.lastIndexOf('.')
	if (dotIdx === -1) return null
	const token = signedToken.slice(0, dotIdx)
	const sig = signedToken.slice(dotIdx + 1)
	const expectedSig = await hmacSha256(token, secret)
	// HMAC-SHA256 always produces 43 base64url chars, so a length mismatch
	// means a structurally invalid signature, not a timing-exploitable partial match.
	if (sig.length !== expectedSig.length) return null
	let diff = 0
	for (let i = 0; i < sig.length; i++) {
		diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
	}
	return diff === 0 ? token : null
}
