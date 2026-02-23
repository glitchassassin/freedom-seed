import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword } from './password.server'

describe('hashPassword', () => {
	test('returns an encoded scrypt string', async () => {
		const hash = await hashPassword('test-password')
		expect(hash).toMatch(
			/^\$scrypt\$ln=\d+,r=\d+,p=\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/,
		)
	})

	test('each hash is unique (random salt)', async () => {
		const a = await hashPassword('same-password')
		const b = await hashPassword('same-password')
		expect(a).not.toBe(b)
	})
})

describe('verifyPassword', () => {
	test('returns true for the correct password', async () => {
		const hash = await hashPassword('correct-password')
		expect(await verifyPassword('correct-password', hash)).toBe(true)
	})

	test('returns false for a wrong password', async () => {
		const hash = await hashPassword('correct-password')
		expect(await verifyPassword('wrong-password', hash)).toBe(false)
	})

	test('returns false for a malformed hash', async () => {
		expect(await verifyPassword('any-password', 'not-a-valid-hash')).toBe(false)
		expect(await verifyPassword('any-password', '$unknown$garbage')).toBe(false)
		expect(await verifyPassword('any-password', '')).toBe(false)
	})

	test('returns false for non-numeric parameters', async () => {
		expect(
			await verifyPassword('any-password', '$scrypt$ln=abc,r=8,p=5$AAAA$BBBB'),
		).toBe(false)
	})
})
