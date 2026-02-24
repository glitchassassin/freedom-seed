import { csrfCookieName, secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'
import {
	signToken,
	toBase64url,
	verifySignedToken,
} from '~/utils/crypto.server'
import { CSRF_FIELD_NAME } from '~/utils/csrf-constants'

export { CSRF_FIELD_NAME } from '~/utils/csrf-constants'

/**
 * Generates a random 32-byte CSRF token, signs it with HMAC-SHA256,
 * and returns both the raw token (for the form hidden field) and the
 * signed value (for the cookie).
 */
export async function generateCsrfToken(
	secret: string,
): Promise<{ token: string; signedCookie: string }> {
	const bytes = crypto.getRandomValues(new Uint8Array(32))
	const token = toBase64url(bytes)
	const signedCookie = await signToken(token, secret)
	return { token, signedCookie }
}

/**
 * Builds a Set-Cookie header value for the CSRF cookie.
 * Uses __Host- prefix in production to prevent subdomain cookie injection.
 * Session cookie (no Max-Age) — dies when the browser closes.
 */
export function makeCsrfCookie(
	signedToken: string,
	isSecure: boolean,
): string {
	return `${csrfCookieName(isSecure)}=${signedToken}; Path=/; SameSite=Lax; HttpOnly${secureSuffix(isSecure)}`
}

/**
 * Validates the CSRF token by comparing the cookie value against the
 * form field value. Clones the request internally to read formData
 * without consuming the original body.
 *
 * Throws a 403 Response if the token is missing or invalid.
 */
export async function validateCsrfToken(
	request: Request,
	secret: string,
	isSecure: boolean,
): Promise<void> {
	const cookieValue = readCookie(request, csrfCookieName(isSecure))
	if (!cookieValue) {
		throw new Response('Missing CSRF cookie', { status: 403 })
	}

	// Verify the cookie signature and extract the raw token
	const cookieToken = await verifySignedToken(cookieValue, secret)
	if (!cookieToken) {
		throw new Response('Invalid CSRF cookie signature', { status: 403 })
	}

	// Clone the request to read formData without consuming the original body
	const clonedRequest = request.clone()
	let formToken: string | null = null
	try {
		const formData = await clonedRequest.formData()
		const value = formData.get(CSRF_FIELD_NAME)
		formToken = typeof value === 'string' ? value : null
	} catch {
		throw new Response('Unable to read CSRF form field', { status: 403 })
	}

	if (!formToken) {
		throw new Response('Missing CSRF form field', { status: 403 })
	}

	// Compare the raw token from the cookie with the form field value
	if (formToken !== cookieToken) {
		throw new Response('CSRF token mismatch', { status: 403 })
	}
}
