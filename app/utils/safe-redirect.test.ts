import { describe, expect, test } from 'vitest'
import { safeRedirect } from './safe-redirect'

describe('safeRedirect', () => {
	test('returns a valid relative path unchanged', () => {
		expect(safeRedirect('/dashboard')).toBe('/dashboard')
		expect(safeRedirect('/settings/profile')).toBe('/settings/profile')
		expect(safeRedirect('/')).toBe('/')
	})

	test('returns default for null/undefined/empty', () => {
		expect(safeRedirect(null)).toBe('/')
		expect(safeRedirect(undefined)).toBe('/')
		expect(safeRedirect('')).toBe('/')
	})

	test('rejects protocol-relative URLs (//)', () => {
		expect(safeRedirect('//evil.com')).toBe('/')
		expect(safeRedirect('//evil.com/path')).toBe('/')
	})

	test('rejects backslash protocol-relative URLs (/\\)', () => {
		expect(safeRedirect('/\\evil.com')).toBe('/')
	})

	test('rejects absolute URLs', () => {
		expect(safeRedirect('http://evil.com')).toBe('/')
		expect(safeRedirect('https://evil.com')).toBe('/')
	})

	test('rejects non-path strings', () => {
		expect(safeRedirect('not-a-path')).toBe('/')
		expect(safeRedirect('javascript:alert(1)')).toBe('/')
	})

	test('uses custom default when provided', () => {
		expect(safeRedirect(null, '/home')).toBe('/home')
		expect(safeRedirect('//evil.com', '/fallback')).toBe('/fallback')
	})

	test('returns empty string default when explicitly set', () => {
		expect(safeRedirect(null, '')).toBe('')
		expect(safeRedirect('//evil.com', '')).toBe('')
	})
})
