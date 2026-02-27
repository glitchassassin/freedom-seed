import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import { exportUserData } from '~/utils/gdpr.server'
import { requireUser } from '~/utils/session-context'

/**
 * GET /resources/account/export-data
 *
 * Returns a JSON file containing all personal data stored for the
 * authenticated user. The download includes profile info, sessions,
 * workspace memberships, and connected accounts. Sensitive secrets
 * (password hashes, TOTP keys) are excluded.
 */
export async function loader({ context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
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
