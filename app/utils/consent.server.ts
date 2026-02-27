import { secureSuffix } from '~/utils/cookie-flags.server'

const CONSENT_COOKIE = 'en_consent'
const CONSENT_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

export type ConsentState = 'granted' | 'denied'

/**
 * Reads the cookie consent state from the request.
 * Returns null if the user has not yet made a choice.
 */
export function getConsentState(request: Request): ConsentState | null {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return null

	for (const part of cookieHeader.split(';')) {
		const eqIdx = part.indexOf('=')
		if (eqIdx === -1) continue
		if (part.slice(0, eqIdx).trim() !== CONSENT_COOKIE) continue
		const val = part.slice(eqIdx + 1).trim()
		if (val === 'granted' || val === 'denied') return val
	}
	return null
}

/**
 * Returns a Set-Cookie header value that persists the user's consent choice
 * for one year.
 */
export function setConsentCookie(
	state: ConsentState,
	isSecure: boolean,
): string {
	return `${CONSENT_COOKIE}=${state}; Path=/; Max-Age=${CONSENT_MAX_AGE}; HttpOnly; SameSite=Lax${secureSuffix(isSecure)}`
}
