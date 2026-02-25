import { data, Form, isRouteErrorResponse, Link, Outlet } from 'react-router'
import type { Route } from './+types/_layout'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	getLastTeamId,
	setLastTeamCookie,
} from '~/utils/last-team-cookie.server'
import { hasRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { requireTeamMember, teamMemberContext } from '~/utils/team-context'
import { getTeamById, getTeamMember, getUserTeams } from '~/utils/teams.server'

export const middleware: Route.MiddlewareFunction[] = [
	async ({ params, context }, next) => {
		const user = requireUser(context)
		const { env } = getCloudflare(context)
		const db = getDb(env)
		const teamId = params.teamId!
		const member = await getTeamMember(db, teamId, user.id)
		if (!member) throw new Response('Forbidden', { status: 403 })
		const team = await getTeamById(db, teamId)
		if (!team) throw new Response('Not Found', { status: 404 })
		context.set(teamMemberContext, {
			teamId: team.id,
			teamName: team.name,
			teamSlug: team.slug,
			isPersonal: !!team.isPersonal,
			role: member.role,
		})
		return next()
	},
]

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const teamId = params.teamId!
	const member = requireTeamMember(context)
	const userTeams = await getUserTeams(db, user.id)
	const currentTeam = userTeams.find((t) => t.id === teamId)

	const responseData = {
		team: currentTeam!,
		userTeams,
		user: { email: user.email, displayName: user.displayName },
		emailVerified: !!user.emailVerifiedAt,
		isAdminOrOwner: hasRole(member.role, 'admin'),
	}

	const lastTeamId = getLastTeamId(request)
	if (lastTeamId === teamId) {
		return responseData
	}

	const isSecure = env.ENVIRONMENT === 'production'
	return data(responseData, {
		headers: { 'set-cookie': setLastTeamCookie(teamId, isSecure) },
	})
}

export default function TeamLayout({ loaderData }: Route.ComponentProps) {
	const { team, userTeams, emailVerified, isAdminOrOwner } = loaderData

	return (
		<>
			<header className="border-b px-4 py-2">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<div className="flex items-center gap-4">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm">
									{team.name}
									<span className="text-muted-foreground ml-1 text-xs">▼</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuLabel>Teams</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{userTeams.map((t) => (
									<DropdownMenuItem key={t.id} asChild>
										<Link to={`/teams/${t.id}`}>
											{t.name}
											{t.isPersonal && (
												<span className="text-muted-foreground ml-2 text-xs">
													Personal
												</span>
											)}
										</Link>
									</DropdownMenuItem>
								))}
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link to="/teams/new">Create team</Link>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="flex items-center gap-2">
						{!team.isPersonal && (
							<Button variant="ghost" size="sm" asChild>
								<Link to={`/teams/${team.id}/settings/members`}>Members</Link>
							</Button>
						)}
						{isAdminOrOwner && (
							<Button variant="ghost" size="sm" asChild>
								<Link to={`/teams/${team.id}/settings/general`}>Settings</Link>
							</Button>
						)}
						<Form method="POST" action="/resources/logout">
							<CsrfInput />
							<Button variant="ghost" size="sm">
								Sign out
							</Button>
						</Form>
					</div>
				</div>
			</header>
			{!emailVerified && (
				<section
					aria-label="Email verification notice"
					className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30"
				>
					<div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
						<p className="text-sm text-amber-800 dark:text-amber-200">
							Please verify your email address to access all features.
						</p>
						<Form method="POST" action="/resources/resend-verification">
							<CsrfInput />
							<Button variant="outline" size="sm">
								Resend verification email
							</Button>
						</Form>
					</div>
				</section>
			)}
			<Outlet />
		</>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	if (isRouteErrorResponse(error) && error.status === 403) {
		return (
			<main className="mx-auto max-w-4xl p-6">
				<h1 className="text-2xl font-semibold">Access Denied</h1>
				<p className="text-muted-foreground mt-2">
					You don&apos;t have permission to view this page.
				</p>
				<Button asChild className="mt-4" variant="outline">
					<Link to="/">Back to home</Link>
				</Button>
			</main>
		)
	}

	if (isRouteErrorResponse(error)) {
		return (
			<main className="mx-auto max-w-4xl p-6">
				<h1 className="text-2xl font-semibold">
					{error.status === 404 ? '404' : 'Error'}
				</h1>
				<p className="text-muted-foreground mt-2">
					{error.status === 404
						? 'The requested page could not be found.'
						: error.statusText || 'An unexpected error occurred.'}
				</p>
			</main>
		)
	}

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">Error</h1>
			<p className="text-muted-foreground mt-2">
				{import.meta.env.DEV && error instanceof Error
					? error.message
					: 'An unexpected error occurred.'}
			</p>
			{import.meta.env.DEV && error instanceof Error && error.stack && (
				<pre className="mt-4 w-full overflow-x-auto p-4">
					<code>{error.stack}</code>
				</pre>
			)}
		</main>
	)
}
