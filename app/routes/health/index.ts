import { sql } from 'drizzle-orm'

import type { Route } from './+types/index'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'

export async function loader({ context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const db = getDb(env)

	let dbStatus: 'ok' | 'unreachable' = 'ok'
	try {
		await db.run(sql`SELECT 1`)
	} catch {
		dbStatus = 'unreachable'
	}

	const status = dbStatus === 'ok' ? 'healthy' : 'degraded'
	return new Response(
		JSON.stringify({
			status,
			checks: { database: dbStatus },
			timestamp: new Date().toISOString(),
		}),
		{
			status: status === 'healthy' ? 200 : 503,
			headers: {
				'content-type': 'application/json',
				'cache-control': 'no-store',
			},
		},
	)
}
