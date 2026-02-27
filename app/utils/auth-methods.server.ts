import { count, eq } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import {
	passkeyCredentials,
	passwordCredentials,
	socialIdentities,
} from '~/db/schema'

/**
 * Counts the total number of authentication methods a user has
 * (password + passkeys + social connections).
 */
export async function countUserAuthMethods(env: ValidatedEnv, userId: string) {
	const db = getDb(env)
	const [passwordResult, passkeyResult, socialResult] = await db.batch([
		db
			.select({ count: count() })
			.from(passwordCredentials)
			.where(eq(passwordCredentials.userId, userId)),
		db
			.select({ count: count() })
			.from(passkeyCredentials)
			.where(eq(passkeyCredentials.userId, userId)),
		db
			.select({ count: count() })
			.from(socialIdentities)
			.where(eq(socialIdentities.userId, userId)),
	])
	return {
		password: passwordResult[0].count,
		passkeys: passkeyResult[0].count,
		social: socialResult[0].count,
		total:
			passwordResult[0].count + passkeyResult[0].count + socialResult[0].count,
	}
}
