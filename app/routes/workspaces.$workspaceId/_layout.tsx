import { data, Form, Link, Outlet } from 'react-router'
import type { Route } from './+types/_layout'
import { CsrfInput } from '~/components/csrf-input'
import { GeneralErrorBoundary } from '~/components/error-boundary'
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
	getLastWorkspaceId,
	setLastWorkspaceCookie,
} from '~/utils/last-workspace-cookie.server'
import { hasRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import {
	requireWorkspaceMember,
	workspaceMemberContext,
} from '~/utils/workspace-context'
import {
	getWorkspaceById,
	getWorkspaceMember,
	getUserWorkspaces,
} from '~/utils/workspaces.server'

export const middleware: Route.MiddlewareFunction[] = [
	async ({ params, context }, next) => {
		const user = requireUser(context)
		const { env } = getCloudflare(context)
		const db = getDb(env)
		const workspaceId = params.workspaceId!
		const member = await getWorkspaceMember(db, workspaceId, user.id)
		if (!member) throw new Response('Forbidden', { status: 403 })
		const workspace = await getWorkspaceById(db, workspaceId)
		if (!workspace) throw new Response('Not Found', { status: 404 })
		context.set(workspaceMemberContext, {
			workspaceId: workspace.id,
			workspaceName: workspace.name,
			workspaceSlug: workspace.slug,
			isPersonal: !!workspace.isPersonal,
			role: member.role,
		})
		return next()
	},
]

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const workspaceId = params.workspaceId!
	const member = requireWorkspaceMember(context)
	const userWorkspaces = await getUserWorkspaces(db, user.id)
	const currentWorkspace = userWorkspaces.find((t) => t.id === workspaceId)

	const responseData = {
		workspace: currentWorkspace!,
		userWorkspaces,
		user: { email: user.email, displayName: user.displayName },
		emailVerified: !!user.emailVerifiedAt,
		isAdminOrOwner: hasRole(member.role, 'admin'),
	}

	const lastWorkspaceId = getLastWorkspaceId(request)
	if (lastWorkspaceId === workspaceId) {
		return responseData
	}

	const isSecure = env.ENVIRONMENT === 'production'
	return data(responseData, {
		headers: { 'set-cookie': setLastWorkspaceCookie(workspaceId, isSecure) },
	})
}

export default function WorkspaceLayout({ loaderData }: Route.ComponentProps) {
	const { workspace, userWorkspaces, emailVerified, isAdminOrOwner } =
		loaderData

	return (
		<>
			<header className="border-b px-4 py-2">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<div className="flex items-center gap-4">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm">
									{workspace.name}
									<span className="text-muted-foreground ml-1 text-xs">▼</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuLabel>Workspaces</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{userWorkspaces.map((t) => (
									<DropdownMenuItem key={t.id} asChild>
										<Link to={`/workspaces/${t.id}`}>
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
									<Link to="/workspaces/new">Create workspace</Link>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="flex items-center gap-2">
						{!workspace.isPersonal && (
							<Button variant="ghost" size="sm" asChild>
								<Link to={`/workspaces/${workspace.id}/settings/members`}>
									Members
								</Link>
							</Button>
						)}
						{isAdminOrOwner && (
							<Button variant="ghost" size="sm" asChild>
								<Link to={`/workspaces/${workspace.id}/settings/general`}>
									Settings
								</Link>
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
	return <GeneralErrorBoundary error={error} />
}
