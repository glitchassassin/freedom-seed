import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	clearChallengeCookie,
	readChallengeCookie,
	verifyAndSaveRegistration,
} from '~/utils/passkeys.server'
import { requireUser } from '~/utils/session-context'

// POST: Verify the registration response from the browser.
// Expects FormData with:
//   - csrf: CSRF token (validated by root middleware)
//   - response: JSON-stringified RegistrationResponseJSON from startRegistration()
//   - name: optional friendly name for the passkey
export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const user = requireUser(context)

	const challengeData = await readChallengeCookie(request, env)
	if (!challengeData || challengeData.context !== user.id) {
		return Response.json(
			{ error: 'Challenge expired or invalid' },
			{ status: 400 },
		)
	}

	const formData = await request.formData()
	const responseRaw = formData.get('response')
	const name = formData.get('name')

	if (typeof responseRaw !== 'string') {
		return Response.json({ error: 'Missing response field' }, { status: 400 })
	}

	let parsedResponse: RegistrationResponseJSON
	try {
		parsedResponse = JSON.parse(responseRaw) as RegistrationResponseJSON
	} catch {
		return Response.json({ error: 'Invalid response JSON' }, { status: 400 })
	}

	try {
		await verifyAndSaveRegistration(
			env,
			user.id,
			parsedResponse,
			challengeData.challenge,
			typeof name === 'string' ? name : 'Passkey',
		)
		return Response.json(
			{ verified: true },
			{
				headers: { 'set-cookie': clearChallengeCookie(isSecure) },
			},
		)
	} catch {
		return Response.json({ error: 'Verification failed' }, { status: 400 })
	}
}
