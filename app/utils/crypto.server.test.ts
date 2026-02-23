import { describe, expect, test } from 'vitest'
import {
	hmacSha256,
	sha256Base64url,
	signToken,
	toBase64url,
	verifySignedToken,
} from './crypto.server'

// ── toBase64url ──────────────────────────────────────────────────────────────

describe('toBase64url', () => {
	test('produces URL-safe encoding with no padding', () => {
		const result = toBase64url(new Uint8Array([0xff, 0xfe, 0xfd]))
		expect(result).not.toMatch(/[+/=]/)
		expect(result.length).toBeGreaterThan(0)
	})

	test('encodes empty input as empty string', () => {
		expect(toBase64url(new Uint8Array([]))).toBe('')
	})
})

// ── sha256Base64url ──────────────────────────────────────────────────────────

describe('sha256Base64url', () => {
	test('produces consistent output for the same input', async () => {
		const a = await sha256Base64url('hello')
		const b = await sha256Base64url('hello')
		expect(a).toBe(b)
	})

	test('different inputs produce different hashes', async () => {
		const a = await sha256Base64url('hello')
		const b = await sha256Base64url('world')
		expect(a).not.toBe(b)
	})
})

// ── hmacSha256 ───────────────────────────────────────────────────────────────

describe('hmacSha256', () => {
	test('produces consistent output for the same data and secret', async () => {
		const a = await hmacSha256('data', 'secret')
		const b = await hmacSha256('data', 'secret')
		expect(a).toBe(b)
	})

	test('different secrets produce different signatures', async () => {
		const a = await hmacSha256('data', 'secret-1')
		const b = await hmacSha256('data', 'secret-2')
		expect(a).not.toBe(b)
	})

	test('different data produces different signatures', async () => {
		const a = await hmacSha256('data-1', 'secret')
		const b = await hmacSha256('data-2', 'secret')
		expect(a).not.toBe(b)
	})
})

// ── signToken / verifySignedToken ────────────────────────────────────────────

describe('signToken / verifySignedToken', () => {
	test('roundtrip: sign then verify returns the original token', async () => {
		const signed = await signToken('my-token', 'my-secret')
		const result = await verifySignedToken(signed, 'my-secret')
		expect(result).toBe('my-token')
	})

	test('wrong secret returns null', async () => {
		const signed = await signToken('my-token', 'my-secret')
		expect(await verifySignedToken(signed, 'wrong-secret')).toBeNull()
	})

	test('tampered token returns null', async () => {
		const signed = await signToken('my-token', 'my-secret')
		const tampered = 'tampered-token' + signed.slice(signed.indexOf('.'))
		expect(await verifySignedToken(tampered, 'my-secret')).toBeNull()
	})

	test('tampered signature returns null', async () => {
		const signed = await signToken('my-token', 'my-secret')
		const dotIdx = signed.lastIndexOf('.')
		const tampered = signed.slice(0, dotIdx) + '.badsignature'
		expect(await verifySignedToken(tampered, 'my-secret')).toBeNull()
	})

	test('string with no dot returns null', async () => {
		expect(await verifySignedToken('nodothere', 'my-secret')).toBeNull()
	})
})
