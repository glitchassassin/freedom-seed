import { describe, expect, test } from 'vitest'
import { getConsentState } from './consent.server'

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
