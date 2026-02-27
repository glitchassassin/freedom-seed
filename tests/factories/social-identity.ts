/**
 * Social identity factory for E2E tests.
 */
import { openD1, generateId } from './db'

export interface CreateSocialIdentityOptions {
	userId: string
	provider: 'google' | 'github'
	providerUserId?: string
	email?: string
	displayName?: string
}

export interface CreateSocialIdentityResult {
	id: string
	provider: string
	email: string | null
}

export function createSocialIdentity(
	options: CreateSocialIdentityOptions,
): CreateSocialIdentityResult {
	const id = generateId()
	const providerUserId =
		options.providerUserId ?? `${options.provider}-${generateId()}`
	const email = options.email ?? null
	const now = Date.now()

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO social_identities (id, user_id, provider, provider_user_id, email, display_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		).run(
			id,
			options.userId,
			options.provider,
			providerUserId,
			email,
			options.displayName ?? null,
			now,
		)
	} finally {
		db.close()
	}

	return { id, provider: options.provider, email }
}
