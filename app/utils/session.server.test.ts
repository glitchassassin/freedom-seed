import { describe, expect, test } from 'vitest'
import { clearSessionCookie, makeSessionCookie } from './session.server'

// ── makeSessionCookie ────────────────────────────────────────────────────────

describe('makeSessionCookie', () => {
	test('includes correct cookie name and attributes', () => {
		const cookie = makeSessionCookie('signed-token-value')
		expect(cookie).toContain('en_session=signed-token-value')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('Max-Age=604800')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).toContain('Secure')
		expect(cookie).toContain('SameSite=Lax')
	})
})

// ── clearSessionCookie ───────────────────────────────────────────────────────

describe('clearSessionCookie', () => {
	test('sets Max-Age=0 and correct attributes', () => {
		const cookie = clearSessionCookie()
		expect(cookie).toContain('en_session=')
		expect(cookie).toContain('Max-Age=0')
		expect(cookie).toContain('Path=/')
		expect(cookie).toContain('HttpOnly')
		expect(cookie).toContain('Secure')
		expect(cookie).toContain('SameSite=Lax')
	})
})
