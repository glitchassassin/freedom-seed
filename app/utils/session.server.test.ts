import { describe, expect, test } from 'vitest'
import { clearSessionCookie, makeSessionCookie } from './session.server'

// ── makeSessionCookie ────────────────────────────────────────────────────────

describe('makeSessionCookie', () => {
	test('includes Secure flag when isSecure is true', () => {
		const cookie = makeSessionCookie('signed-token-value', true)
		expect(cookie).toContain('en_session=signed-token-value')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('Max-Age=604800')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).toContain('Secure')
		expect(cookie).toContain('SameSite=Lax')
	})

	test('omits Secure flag when isSecure is false', () => {
		const cookie = makeSessionCookie('signed-token-value', false)
		expect(cookie).toContain('en_session=signed-token-value')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('Max-Age=604800')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).not.toContain('Secure')
		expect(cookie).toContain('SameSite=Lax')
	})
})

// ── clearSessionCookie ───────────────────────────────────────────────────────

describe('clearSessionCookie', () => {
	test('includes Secure flag when isSecure is true', () => {
		const cookie = clearSessionCookie(true)
		expect(cookie).toContain('en_session=')
		expect(cookie).toContain('Max-Age=0')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).toContain('Secure')
		expect(cookie).toContain('SameSite=Lax')
	})

	test('omits Secure flag when isSecure is false', () => {
		const cookie = clearSessionCookie(false)
		expect(cookie).toContain('en_session=')
		expect(cookie).toContain('Max-Age=0')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).not.toContain('Secure')
		expect(cookie).toContain('SameSite=Lax')
	})
})
