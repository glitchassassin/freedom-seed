import { Form, Link, Outlet, redirect } from 'react-router'
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
import { requireUser } from '~/utils/session-context'
import { teamMemberContext } from '~/utils/team-context'
import { getTeamMember, getUserTeams } from '~/utils/teams.server'

export const middleware: Route.MiddlewareFunction[] = [
	async ({ params, context }, next) => {
		const user = requireUser(context)
		const { env } = getCloudflare(context)
		const db = getDb(env)
		const teamId = params.teamId!
		const member = await getTeamMember(db, teamId, user.id)
		if (!member) throw new Response('Forbidden', { status: 403 })
		const team = await db.query.teams.findFirst({
			where: (t, { eq }) => eq(t.id, teamId),
		})
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

export async function loader({ params, context }: Route.LoaderArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const teamId = params.teamId!
	const userTeams = await getUserTeams(db, user.id)
	const currentTeam = userTeams.find((t) => t.id === teamId)
	return {
		team: currentTeam!,
		userTeams,
		user: { email: user.email, displayName: user.displayName },
		emailVerified: !!user.emailVerifiedAt,
	}
}

export default function TeamLayout({ loaderData }: Route.ComponentProps) {
	const { team, userTeams, user, emailVerified } = loaderData

	return (
		<>
			<header className="border-b px-4 py-2">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<div className="flex items-center gap-4">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm">
									{team.name}
									<span className="ml-1 text-xs opacity-50">▼</span>
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
						<Button variant="ghost" size="sm" asChild>
							<Link to={`/teams/${team.id}/settings/general`}>Settings</Link>
						</Button>
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
