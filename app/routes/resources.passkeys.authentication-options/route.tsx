import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	createChallengeCookie,
	getAuthenticationOptions,
} from '~/utils/passkeys.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'

// POST: Generate authentication options (no auth required — this is for login).
// The client must include the CSRF token as a FormData field so the root
// middleware can validate it before this action runs.
export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	await requireRateLimit(env, request, {
		prefix: 'passkey-auth',
		limit: 5,
		windowSeconds: 300,
	})

	const options = await getAuthenticationOptions(env)
	const challengeCookie = await createChallengeCookie(env, options.challenge)

	return Response.json(options, {
		headers: { 'set-cookie': challengeCookie },
	})
}
