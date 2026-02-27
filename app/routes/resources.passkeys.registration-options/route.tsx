import { eq } from 'drizzle-orm'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { passkeyCredentials } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	createChallengeCookie,
	getRegistrationOptions,
} from '~/utils/passkeys.server'
import { requireUser } from '~/utils/session-context'

// POST: Generate registration options for the authenticated user.
// Returns JSON with registration options to pass to @simplewebauthn/browser.
export async function action({ request: _request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const user = requireUser(context)

	// Reuse the webauthnUserId from an existing passkey, or generate a new one
	const db = getDb(env)
	const existingPasskey = await db
		.select({ webauthnUserId: passkeyCredentials.webauthnUserId })
		.from(passkeyCredentials)
		.where(eq(passkeyCredentials.userId, user.id))
		.limit(1)
		.then((r) => r[0])

	const webauthnUserId = existingPasskey?.webauthnUserId ?? crypto.randomUUID()

	const options = await getRegistrationOptions(
		env,
		user.id,
		user.email,
		webauthnUserId,
	)
	const challengeCookie = await createChallengeCookie(
		env,
		options.challenge,
		`${user.id}:${webauthnUserId}`,
	)

	return Response.json(options, {
		headers: { 'set-cookie': challengeCookie },
	})
}
