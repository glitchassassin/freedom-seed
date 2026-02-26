/**
 * User factory — creates a user with password credentials and personal workspace.
 */
import { generateId, hashPassword, openD1 } from './db'

export interface CreateUserOptions {
	email?: string
	password?: string
	displayName?: string
	emailVerifiedAt?: number | null
}

export interface CreateUserResult {
	user: { id: string; email: string; displayName: string | null }
	password: string
	personalWorkspace: { id: string; name: string; slug: string }
}

/**
 * Creates a fully-formed user: user row, password_credentials,
 * personal workspace, and owner membership.
 */
export async function createUser(
	overrides?: CreateUserOptions,
): Promise<CreateUserResult> {
	const userId = generateId()
	const now = Date.now()
	const rand = Math.random().toString(36).slice(2, 8)
	const email = overrides?.email ?? `factory+${now}-${rand}@example.com`
	const plainPassword = overrides?.password ?? 'TestPass1!'
	const displayName = overrides?.displayName ?? null
	const emailVerifiedAt = overrides?.emailVerifiedAt ?? null
	const hash = await hashPassword(plainPassword)

	const wsId = generateId()
	const wsName = 'Personal'
	const wsSlug = `personal-${userId.slice(0, 8)}`
	const memberId = generateId()

	const db = openD1()
	try {
		db.exec('BEGIN')
		db.prepare(
			`INSERT INTO users (id, email, display_name, email_verified_at, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		).run(userId, email, displayName, emailVerifiedAt, now, now)

		db.prepare(
			`INSERT INTO password_credentials (user_id, hash, updated_at)
			 VALUES (?, ?, ?)`,
		).run(userId, hash, now)

		db.prepare(
			`INSERT INTO workspaces (id, name, slug, is_personal, created_at, updated_at)
			 VALUES (?, ?, ?, 1, ?, ?)`,
		).run(wsId, wsName, wsSlug, now, now)

		db.prepare(
			`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
			 VALUES (?, ?, ?, 'owner', ?)`,
		).run(memberId, wsId, userId, now)

		db.exec('COMMIT')
	} catch (err) {
		db.exec('ROLLBACK')
		throw err
	} finally {
		db.close()
	}

	return {
		user: { id: userId, email, displayName },
		password: plainPassword,
		personalWorkspace: { id: wsId, name: wsName, slug: wsSlug },
	}
}

/** Looks up a user ID by email from the local D1 database. */
export function getUserIdByEmail(email: string): string {
	const db = openD1()
	try {
		const row = db
			.prepare('SELECT id FROM users WHERE email = ?')
			.get(email) as { id: string } | undefined
		if (!row) throw new Error(`User not found: ${email}`)
		return row.id
	} finally {
		db.close()
	}
}
