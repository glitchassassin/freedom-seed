import { describe, expect, test } from 'vitest'
import {
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE,
	generatePresignedDownloadUrl,
	generatePresignedUploadUrl,
} from './file-storage.server'

// ── ALLOWED_MIME_TYPES ───────────────────────────────────────────────────────

describe('ALLOWED_MIME_TYPES', () => {
	test('does not include image/svg+xml (XSS risk)', () => {
		expect(ALLOWED_MIME_TYPES).not.toContain('image/svg+xml')
	})

	test('includes common image and document types', () => {
		expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
		expect(ALLOWED_MIME_TYPES).toContain('image/png')
		expect(ALLOWED_MIME_TYPES).toContain('application/pdf')
	})
})

// ── MAX_FILE_SIZE ────────────────────────────────────────────────────────────

describe('MAX_FILE_SIZE', () => {
	test('is 50 MB', () => {
		expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
	})
})

// ── generatePresignedUploadUrl ───────────────────────────────────────────────

const r2Env = {
	R2_ACCOUNT_ID: 'testaccount',
	R2_BUCKET_NAME: 'test-bucket',
	R2_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
	R2_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
} as const

function makeEnv(overrides: Partial<typeof r2Env> = {}) {
	return { ...r2Env, ...overrides } as Parameters<
		typeof generatePresignedUploadUrl
	>[0]
}

describe('generatePresignedUploadUrl', () => {
	test('returns null when R2 credentials are not configured', async () => {
		const env = makeEnv({ R2_ACCESS_KEY_ID: '' })
		const url = await generatePresignedUploadUrl(env, 'uploads/user/file')
		expect(url).toBeNull()
	})

	test('returns a valid HTTPS URL for R2 when configured', async () => {
		const env = makeEnv()
		const url = await generatePresignedUploadUrl(env, 'uploads/user/file')
		expect(url).not.toBeNull()
		expect(url).toMatch(/^https:\/\/testaccount\.r2\.cloudflarestorage\.com\//)
	})

	test('includes required AWS Sig V4 query parameters', async () => {
		const env = makeEnv()
		const url = await generatePresignedUploadUrl(env, 'uploads/user/file')
		expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256')
		expect(url).toContain('X-Amz-Credential=')
		expect(url).toContain('X-Amz-Date=')
		expect(url).toContain('X-Amz-Expires=')
		expect(url).toContain('X-Amz-SignedHeaders=host')
		expect(url).toContain('X-Amz-Signature=')
	})

	test('URL contains the bucket and encoded key in the path', async () => {
		const env = makeEnv()
		const url = await generatePresignedUploadUrl(env, 'uploads/user/file')
		expect(url).toContain('/test-bucket/uploads/user/file')
	})

	test('encodes special characters in key path segments', async () => {
		const env = makeEnv()
		const url = await generatePresignedUploadUrl(
			env,
			'uploads/user/file with spaces',
		)
		expect(url).not.toBeNull()
		// Path segment "file with spaces" must be RFC 3986 encoded
		expect(url).toContain('file%20with%20spaces')
		expect(url).not.toContain('file with spaces')
	})

	test('produces different signatures for different keys', async () => {
		const env = makeEnv()
		const url1 = await generatePresignedUploadUrl(env, 'uploads/user/file1')
		const url2 = await generatePresignedUploadUrl(env, 'uploads/user/file2')
		expect(url1).not.toBe(url2)

		const sig1 = new URL(url1!).searchParams.get('X-Amz-Signature')
		const sig2 = new URL(url2!).searchParams.get('X-Amz-Signature')
		expect(sig1).not.toBe(sig2)
	})

	test('signature is lowercase hex', async () => {
		const env = makeEnv()
		const url = await generatePresignedUploadUrl(env, 'uploads/user/file')
		const sig = new URL(url!).searchParams.get('X-Amz-Signature')
		expect(sig).toMatch(/^[0-9a-f]{64}$/)
	})

	test('respects custom expiresIn', async () => {
		const env = makeEnv()
		const url = await generatePresignedUploadUrl(env, 'uploads/user/file', 900)
		expect(url).toContain('X-Amz-Expires=900')
	})
})

// ── generatePresignedDownloadUrl ─────────────────────────────────────────────

describe('generatePresignedDownloadUrl', () => {
	test('returns null when R2 credentials are not configured', async () => {
		const env = makeEnv({ R2_SECRET_ACCESS_KEY: '' })
		const url = await generatePresignedDownloadUrl(env, 'uploads/user/file')
		expect(url).toBeNull()
	})

	test('returns a valid HTTPS URL when configured', async () => {
		const env = makeEnv()
		const url = await generatePresignedDownloadUrl(env, 'uploads/user/file')
		expect(url).not.toBeNull()
		expect(url).toMatch(/^https:\/\/testaccount\.r2\.cloudflarestorage\.com\//)
	})

	test('upload and download URLs differ (different method in signature)', async () => {
		const env = makeEnv()
		const uploadUrl = await generatePresignedUploadUrl(env, 'uploads/user/file')
		const downloadUrl = await generatePresignedDownloadUrl(
			env,
			'uploads/user/file',
		)
		// Both point to the same path but their signatures differ because of
		// the different HTTP method used in the canonical request
		const uploadSig = new URL(uploadUrl!).searchParams.get('X-Amz-Signature')
		const downloadSig = new URL(downloadUrl!).searchParams.get(
			'X-Amz-Signature',
		)
		expect(uploadSig).not.toBe(downloadSig)
	})
})
