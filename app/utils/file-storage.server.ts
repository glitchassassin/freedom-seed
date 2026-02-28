import { and, eq } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import { files } from '~/db/schema'

// ── Configuration ─────────────────────────────────────────────────────────────

/** Maximum file size in bytes (default: 50 MB). */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * MIME types accepted by the presign endpoint.
 * Note: image/svg+xml is intentionally excluded — SVGs can contain embedded
 * JavaScript and become XSS vectors when served with their original content type.
 */
export const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/plain',
	'text/csv',
	'application/zip',
	'application/x-zip-compressed',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// ── Presigned URL generation ──────────────────────────────────────────────────

/**
 * Generates an AWS Signature V4 presigned PUT URL for Cloudflare R2.
 * The browser can use this URL to upload directly to R2 without proxying
 * through the Worker. Returns null if R2 credentials are not configured.
 */
export async function generatePresignedUploadUrl(
	env: ValidatedEnv,
	key: string,
	expiresIn = 3600,
): Promise<string | null> {
	if (!isR2Configured(env)) return null
	return buildPresignedUrl({
		method: 'PUT',
		accountId: env.R2_ACCOUNT_ID,
		bucket: env.R2_BUCKET_NAME,
		key,
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		expiresIn,
	})
}

/**
 * Generates a presigned GET URL for reading a file from R2.
 * Returns null if R2 credentials are not configured.
 */
export async function generatePresignedDownloadUrl(
	env: ValidatedEnv,
	key: string,
	expiresIn = 3600,
): Promise<string | null> {
	if (!isR2Configured(env)) return null
	return buildPresignedUrl({
		method: 'GET',
		accountId: env.R2_ACCOUNT_ID,
		bucket: env.R2_BUCKET_NAME,
		key,
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		expiresIn,
	})
}

// ── File metadata CRUD ────────────────────────────────────────────────────────

/** Creates a pending file record in D1 and returns a presigned PUT URL. */
export async function createPendingFile(
	env: ValidatedEnv,
	{
		ownerId,
		filename,
		contentType,
		size,
	}: {
		ownerId: string
		filename: string
		contentType: string
		size: number
	},
): Promise<{ fileId: string; uploadUrl: string }> {
	if (!isR2Configured(env)) {
		throw new Error(
			'File storage is not configured. Set R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
		)
	}

	const db = getDb(env)
	const fileId = crypto.randomUUID()
	const key = `uploads/${ownerId}/${fileId}`

	await db.insert(files).values({
		id: fileId,
		ownerId,
		key,
		filename,
		contentType,
		size,
		status: 'pending',
	})

	// Non-null: isR2Configured() checked above
	const uploadUrl = (await generatePresignedUploadUrl(env, key))!
	return { fileId, uploadUrl }
}

/**
 * Marks a pending file as complete after a successful direct upload.
 * Returns true if the file was found and updated, false if it was not found
 * (invalid ID, wrong owner, or already confirmed/deleted).
 */
export async function confirmFileUpload(
	env: ValidatedEnv,
	fileId: string,
	ownerId: string,
): Promise<boolean> {
	const db = getDb(env)

	// Check existence first so we can report 404 vs silent no-op
	const existing = await db
		.select({ id: files.id })
		.from(files)
		.where(
			and(
				eq(files.id, fileId),
				eq(files.ownerId, ownerId),
				eq(files.status, 'pending'),
			),
		)
		.limit(1)
		.then((r) => r[0])

	if (!existing) return false

	await db
		.update(files)
		.set({ status: 'complete', updatedAt: new Date() })
		.where(eq(files.id, fileId))

	return true
}

/**
 * Deletes a file from R2 (via binding) and removes its D1 record.
 * R2 is deleted before D1: an orphaned D1 row is recoverable, but an
 * orphaned R2 object with no metadata row is not.
 */
export async function deleteFile(
	env: ValidatedEnv,
	fileId: string,
	ownerId: string,
): Promise<void> {
	const db = getDb(env)

	const row = await db
		.select({ key: files.key })
		.from(files)
		.where(and(eq(files.id, fileId), eq(files.ownerId, ownerId)))
		.limit(1)
		.then((r) => r[0])

	if (!row) return

	if (env.FILE_BUCKET) {
		await env.FILE_BUCKET.delete(row.key)
	}

	await db
		.delete(files)
		.where(and(eq(files.id, fileId), eq(files.ownerId, ownerId)))
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function isR2Configured(env: ValidatedEnv): boolean {
	return !!(
		env.R2_ACCOUNT_ID &&
		env.R2_BUCKET_NAME &&
		env.R2_ACCESS_KEY_ID &&
		env.R2_SECRET_ACCESS_KEY
	)
}

/**
 * Core AWS Signature V4 presigned URL builder for Cloudflare R2 (S3-compatible).
 * Each path segment is individually RFC 3986-encoded so the canonical URI is
 * correct for keys containing reserved characters.
 */
async function buildPresignedUrl({
	method,
	accountId,
	bucket,
	key,
	accessKeyId,
	secretAccessKey,
	expiresIn,
}: {
	method: 'GET' | 'PUT'
	accountId: string
	bucket: string
	key: string
	accessKeyId: string
	secretAccessKey: string
	expiresIn: number
}): Promise<string> {
	const region = 'auto'
	const service = 's3'
	const host = `${accountId}.r2.cloudflarestorage.com`

	const now = new Date()
	const amzDate = now
		.toISOString()
		.replace(/[:-]/g, '')
		.replace(/\.\d{3}Z$/, 'Z')
	const dateStamp = amzDate.slice(0, 8)

	const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
	const credential = `${accessKeyId}/${credentialScope}`
	const signedHeaders = 'host'

	// Build canonical query string (must be sorted by parameter name)
	const params: [string, string][] = [
		['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
		['X-Amz-Credential', credential],
		['X-Amz-Date', amzDate],
		['X-Amz-Expires', String(expiresIn)],
		['X-Amz-SignedHeaders', signedHeaders],
	]
	params.sort(([a], [b]) => a.localeCompare(b))
	const canonicalQueryString = params
		.map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
		.join('&')

	// Encode each path segment individually (AWS Sig V4 canonical URI requirement)
	const encodedPath =
		'/' + [bucket, ...key.split('/')].map(encodeRfc3986).join('/')
	const canonicalHeaders = `host:${host}\n`

	const canonicalRequest = [
		method,
		encodedPath,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		'UNSIGNED-PAYLOAD',
	].join('\n')

	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		await sha256Hex(canonicalRequest),
	].join('\n')

	const signingKey = await deriveSigningKey(
		secretAccessKey,
		dateStamp,
		region,
		service,
	)
	const signature = await hmacHex(signingKey, stringToSign)

	return `https://${host}${encodedPath}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}

// ── AWS Signature V4 low-level helpers ───────────────────────────────────────

function encodeRfc3986(value: string): string {
	return encodeURIComponent(value).replace(
		/[!'()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	)
}

async function sha256Hex(data: string): Promise<string> {
	const hash = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(data),
	)
	return bufToHex(hash)
}

async function hmacRaw(
	key: ArrayBuffer | Uint8Array,
	data: string,
): Promise<ArrayBuffer> {
	// Normalize to ArrayBuffer so TypeScript is satisfied with crypto.subtle APIs
	const keyBuf: ArrayBuffer =
		key instanceof Uint8Array
			? (key.buffer.slice(
					key.byteOffset,
					key.byteOffset + key.byteLength,
				) as ArrayBuffer)
			: key
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyBuf,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
	const sig = await hmacRaw(key, data)
	return bufToHex(sig)
}

async function deriveSigningKey(
	secretAccessKey: string,
	dateStamp: string,
	region: string,
	service: string,
): Promise<ArrayBuffer> {
	const kDate = await hmacRaw(
		new TextEncoder().encode(`AWS4${secretAccessKey}`),
		dateStamp,
	)
	const kRegion = await hmacRaw(kDate, region)
	const kService = await hmacRaw(kRegion, service)
	return hmacRaw(kService, 'aws4_request')
}

function bufToHex(buf: ArrayBuffer): string {
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}
