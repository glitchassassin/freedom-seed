import { tz } from '@date-fns/tz'
import { format } from 'date-fns'
import { desc, eq, sql } from 'drizzle-orm'
import { Link } from 'react-router'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { auditLog } from '~/db/schema'
import { getHints } from '~/utils/client-hints'
import { getCloudflare } from '~/utils/cloudflare-context'

const PAGE_SIZE = 50

export async function loader({ request, params, context }: Route.LoaderArgs) {
	// TODO: replace with real session + RBAC check once auth-sessions and rbac
	// facets are implemented:
	//   const session = await requireSession(request, context)
	//   const member = await getTeamMember(db, teamId, session.userId)
	//   if (!can(member, 'audit_log:read')) throw forbidden()

	const { env } = getCloudflare(context)
	const db = getDb(env)
	 
	const teamId = params.teamId!
	const { timeZone } = getHints(request)

	const url = new URL(request.url)
	const parsed = parseInt(url.searchParams.get('page') ?? '0', 10)
	const page = Math.max(0, Number.isNaN(parsed) ? 0 : parsed)
	const offset = page * PAGE_SIZE

	const [entries, countResult] = await Promise.all([
		db
			.select()
			.from(auditLog)
			.where(eq(auditLog.teamId, teamId))
			.orderBy(desc(auditLog.createdAt))
			.limit(PAGE_SIZE)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(auditLog)
			.where(eq(auditLog.teamId, teamId)),
	])

	const count = countResult[0]?.count ?? 0
	const totalPages = Math.ceil(count / PAGE_SIZE)

	return {
		entries: entries.map((e) => ({
			...e,
			// ISO string for the <time datetime> attribute (machine-readable)
			createdAt: e.createdAt.toISOString(),
			// Formatted in the user's timezone on the server — no hydration mismatch
			createdAtFormatted: format(e.createdAt, 'MMM d, yyyy, h:mm a zzz', {
				in: tz(timeZone),
			}),
		})),
		page,
		totalPages,
		teamId,
	}
}

export function meta() {
	return [{ title: 'Audit Log' }]
}

export default function AuditLogPage({ loaderData }: Route.ComponentProps) {
	const { entries, page, totalPages } = loaderData

	return (
		<main className="container mx-auto p-6">
			<h1 className="mb-6 text-2xl font-semibold">Audit Log</h1>

			{entries.length === 0 ? (
				<p className="text-gray-500">No audit log entries yet.</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b text-left text-gray-500">
								<th className="pr-4 pb-2 font-medium">When</th>
								<th className="pr-4 pb-2 font-medium">Who</th>
								<th className="pr-4 pb-2 font-medium">Action</th>
								<th className="pb-2 font-medium">Target</th>
							</tr>
						</thead>
						<tbody>
							{entries.map((entry) => (
								<tr key={entry.id} className="border-b last:border-0">
									<td className="py-3 pr-4 text-gray-600">
										<time dateTime={entry.createdAt}>
											{entry.createdAtFormatted}
										</time>
									</td>
									<td className="py-3 pr-4">{entry.actorEmail}</td>
									<td className="py-3 pr-4">
										<code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
											{entry.action}
										</code>
									</td>
									<td className="py-3">
										{entry.targetLabel ?? entry.targetId ?? (
											<span className="text-gray-400">—</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{totalPages > 1 && (
				<div className="mt-6 flex items-center gap-4">
					{page > 0 && (
						<Link
							to={`?page=${page - 1}`}
							className="text-blue-600 hover:underline"
						>
							Previous
						</Link>
					)}
					<span className="text-sm text-gray-500">
						Page {page + 1} of {totalPages}
					</span>
					{page < totalPages - 1 && (
						<Link
							to={`?page=${page + 1}`}
							className="text-blue-600 hover:underline"
						>
							Next
						</Link>
					)}
				</div>
			)}
		</main>
	)
}
