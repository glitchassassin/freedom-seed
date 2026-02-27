import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	createChallengeCookie,
	getRegistrationOptions,
} from '~/utils/passkeys.server'
import { requireUser } from '~/utils/session-context'

// POST: Generate registration options for the authenticated user.
// Returns JSON with registration options to pass to @simplewebauthn/browser.
// The client must include the CSRF token as a FormData field so the root
// middleware can validate it before this action runs.
export async function action({ request: _request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const user = requireUser(context)

	const options = await getRegistrationOptions(env, user.id, user.email)
	const challengeCookie = await createChallengeCookie(
		env,
		options.challenge,
		user.id,
	)

	return Response.json(options, {
		headers: { 'set-cookie': challengeCookie },
	})
}
