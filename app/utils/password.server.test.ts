import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword } from './password.server'

describe('hashPassword', () => {
	test('returns an encoded Argon2id string', async () => {
		const hash = await hashPassword('test-password')
		expect(hash).toMatch(/^\$argon2id\$/)
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
})
