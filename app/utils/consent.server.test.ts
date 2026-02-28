import { describe, expect, test } from 'vitest'
import { getConsentState, setConsentCookie } from './consent.server'

function makeRequest(cookieHeader?: string): Request {
	return new Request('http://localhost/', {
		headers: cookieHeader ? { cookie: cookieHeader } : {},
	})
}

describe('getConsentState', () => {
	test('returns null when no cookie header is present', () => {
		const request = makeRequest()
		expect(getConsentState(request)).toBeNull()
	})

	test("returns 'granted' for a valid granted cookie value", () => {
		const request = makeRequest('en_consent=granted')
		expect(getConsentState(request)).toBe('granted')
	})

	test("returns 'denied' for a valid denied cookie value", () => {
		const request = makeRequest('en_consent=denied')
		expect(getConsentState(request)).toBe('denied')
	})

	test('returns null for an unrecognized/malformed cookie value', () => {
		expect(getConsentState(makeRequest('en_consent=yes'))).toBeNull()
		expect(getConsentState(makeRequest('en_consent='))).toBeNull()
		expect(getConsentState(makeRequest('en_consent=GRANTED'))).toBeNull()
		expect(getConsentState(makeRequest('other_cookie=granted'))).toBeNull()
	})
})

// ── setConsentCookie ──────────────────────────────────────────────────────────

describe('setConsentCookie', () => {
	test("returns a Set-Cookie header string when called with 'granted'", () => {
		const cookie = setConsentCookie('granted', false)
		expect(typeof cookie).toBe('string')
		expect(cookie).toContain('en_consent=granted')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).toContain('SameSite=Lax')
	})

	test("returns a Set-Cookie header string when called with 'denied'", () => {
		const cookie = setConsentCookie('denied', false)
		expect(typeof cookie).toBe('string')
		expect(cookie).toContain('en_consent=denied')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).toContain('SameSite=Lax')
	})

	test('parsing the Set-Cookie value back with getConsentState returns the same state', () => {
		for (const state of ['granted', 'denied'] as const) {
			const setCookieHeader = setConsentCookie(state, false)
			// Extract the cookie value portion (first name=value pair before any ';')
			const cookiePair = setCookieHeader.split(';')[0]
			const request = makeRequest(cookiePair)
			expect(getConsentState(request)).toBe(state)
		}
	})
})
