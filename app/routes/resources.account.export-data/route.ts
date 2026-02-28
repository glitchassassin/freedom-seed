import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import { exportUserData } from '~/utils/gdpr.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { requireUser } from '~/utils/session-context'

/**
 * GET /resources/account/export-data
 *
 * Returns a JSON file containing all personal data stored for the
 * authenticated user. The download includes profile info, sessions,
 * workspace memberships, and connected accounts. Sensitive secrets
 * (password hashes, TOTP keys) are excluded.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	await requireRateLimit(env, request, {
		prefix: 'export-data',
		limit: 5,
		windowSeconds: 3600,
	})
	const user = requireUser(context)

	const data = await exportUserData(env, user.id)
	const json = JSON.stringify(data, null, 2)

	return new Response(json, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': 'attachment; filename="my-data.json"',
		},
	})
}
