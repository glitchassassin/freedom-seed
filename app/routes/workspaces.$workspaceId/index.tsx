import { Link } from 'react-router'
import type { Route } from './+types/index'
import { Button } from '~/components/ui/button'
import { hasRole } from '~/utils/rbac.server'
import { requireWorkspaceMember } from '~/utils/workspace-context'

export async function loader({ context }: Route.LoaderArgs) {
	const member = requireWorkspaceMember(context)
	return {
		workspaceName: member.workspaceName,
		workspaceId: member.workspaceId,
		isPersonal: member.isPersonal,
		isAdminOrOwner: hasRole(member.role, 'admin'),
	}
}

export function meta({ data }: Route.MetaArgs) {
	return [
		{
			title: data?.workspaceName
				? `${data.workspaceName} — Dashboard`
				: 'Dashboard',
		},
	]
}

export default function WorkspaceDashboard({
	loaderData,
}: Route.ComponentProps) {
	const { workspaceName, workspaceId, isPersonal, isAdminOrOwner } = loaderData

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">{workspaceName}</h1>
			<p className="text-muted-foreground mt-2">
				{isPersonal
					? 'This is your personal workspace.'
					: 'Welcome to your workspace.'}
			</p>

			<div className="mt-6 flex gap-4">
				{!isPersonal && (
					<Button variant="outline" asChild>
						<Link to={`/workspaces/${workspaceId}/settings/members`}>
							Manage members
						</Link>
					</Button>
				)}
				{isAdminOrOwner && (
					<Button variant="outline" asChild>
						<Link to={`/workspaces/${workspaceId}/settings/general`}>
							Workspace settings
						</Link>
					</Button>
				)}
			</div>
		</main>
	)
}
