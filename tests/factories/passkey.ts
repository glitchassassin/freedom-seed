/**
 * Passkey credential factory for E2E tests.
 */
import { openD1, generateId } from './db'

export interface CreatePasskeyOptions {
	userId: string
	name?: string
	credentialId?: string
	deviceType?: string
	backedUp?: boolean
}

export interface CreatePasskeyResult {
	id: string
	credentialId: string
	name: string
}

/**
 * Inserts a passkey credential row for testing passkey management UI.
 * The credential won't work for actual WebAuthn auth, but is sufficient
 * for testing the settings page (list, rename, delete).
 */
export function createPasskey(
	options: CreatePasskeyOptions,
): CreatePasskeyResult {
	const id = generateId()
	const credentialId = options.credentialId ?? `cred-${generateId()}`
	const name = options.name ?? 'Test Passkey'
	const now = Date.now()

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_type, backed_up, transports, name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			id,
			options.userId,
			credentialId,
			'dGVzdC1wdWJsaWMta2V5', // base64url dummy public key
			0,
			options.deviceType ?? 'multiDevice',
			options.backedUp ? 1 : 0,
			'[]', // JSON array
			name,
			now,
		)
	} finally {
		db.close()
	}

	return { id, credentialId, name }
}
