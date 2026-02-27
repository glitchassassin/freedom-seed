import { parseWithZod } from '@conform-to/zod/v4'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { z } from 'zod'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	clearChallengeCookie,
	readChallengeCookie,
	verifyAndAuthenticate,
} from '~/utils/passkeys.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { createSession } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'
import { getUserWorkspaces } from '~/utils/workspaces.server'

const authVerifySchema = z.object({ response: z.string().min(1) })

// POST: Verify authentication response and create session.
// Expects FormData with:
//   - csrf: CSRF token (validated by root middleware)
//   - response: JSON-stringified AuthenticationResponseJSON from startAuthentication()
export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	await requireRateLimit(env, request, {
		prefix: 'passkey-auth',
		limit: 5,
		windowSeconds: 300,
	})

	const challengeData = await readChallengeCookie(request, env)
	if (!challengeData) {
		return Response.json(
			{ error: 'Challenge expired or invalid' },
			{ status: 400 },
		)
	}

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: authVerifySchema })
	if (submission.status !== 'success') {
		return Response.json({ error: 'Missing response field' }, { status: 400 })
	}

	let parsedResponse: AuthenticationResponseJSON
	try {
		parsedResponse = JSON.parse(
			submission.value.response,
		) as AuthenticationResponseJSON
	} catch {
		return Response.json({ error: 'Invalid response JSON' }, { status: 400 })
	}

	try {
		const { user } = await verifyAndAuthenticate(
			env,
			parsedResponse,
			challengeData.challenge,
		)
		const { cookie } = await createSession(env, user.id, request)

		// Determine redirect destination
		const db = getDb(env)
		const userWorkspaces = await getUserWorkspaces(db, user.id)
		const redirectTo =
			userWorkspaces.length > 0 ? `/workspaces/${userWorkspaces[0].id}` : '/'

		return Response.json(
			{ verified: true, redirectTo },
			{
				headers: [
					['set-cookie', clearChallengeCookie(isSecure)],
					['set-cookie', cookie],
					[
						'set-cookie',
						setToast({ type: 'success', title: 'Welcome back' }, isSecure),
					],
				],
			},
		)
	} catch {
		return Response.json({ error: 'Authentication failed' }, { status: 400 })
	}
}
