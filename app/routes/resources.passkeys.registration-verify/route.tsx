import { parseWithZod } from '@conform-to/zod/v4'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { z } from 'zod'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	clearChallengeCookie,
	readChallengeCookie,
	verifyAndSaveRegistration,
} from '~/utils/passkeys.server'
import { requireUser } from '~/utils/session-context'

const regVerifySchema = z.object({
	response: z.string().min(1),
	name: z.string().min(1).optional(),
})

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
	if (!challengeData?.context) {
		return Response.json(
			{ error: 'Challenge expired or invalid' },
			{ status: 400 },
		)
	}

	// Parse context: "userId:webauthnUserId"
	const [contextUserId, webauthnUserId] = challengeData.context.split(':')
	if (contextUserId !== user.id || !webauthnUserId) {
		return Response.json(
			{ error: 'Challenge expired or invalid' },
			{ status: 400 },
		)
	}

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: regVerifySchema })
	if (submission.status !== 'success') {
		return Response.json({ error: 'Missing response field' }, { status: 400 })
	}

	let parsedResponse: RegistrationResponseJSON
	try {
		parsedResponse = JSON.parse(
			submission.value.response,
		) as RegistrationResponseJSON
	} catch {
		return Response.json({ error: 'Invalid response JSON' }, { status: 400 })
	}

	try {
		await verifyAndSaveRegistration(
			env,
			user.id,
			parsedResponse,
			challengeData.challenge,
			submission.value.name ?? 'Passkey',
			webauthnUserId,
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
