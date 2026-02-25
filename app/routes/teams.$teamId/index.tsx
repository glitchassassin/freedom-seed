import { Link } from 'react-router'
import type { Route } from './+types/index'
import { Button } from '~/components/ui/button'
import { requireTeamMember } from '~/utils/team-context'

export async function loader({ context }: Route.LoaderArgs) {
	const member = requireTeamMember(context)
	return {
		teamName: member.teamName,
		teamId: member.teamId,
		isPersonal: member.isPersonal,
	}
}

export function meta({ data }: Route.MetaArgs) {
	return [
		{ title: data?.teamName ? `${data.teamName} — Dashboard` : 'Dashboard' },
	]
}

export default function TeamDashboard({ loaderData }: Route.ComponentProps) {
	const { teamName, teamId, isPersonal } = loaderData

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">{teamName}</h1>
			<p className="text-muted-foreground mt-2">
				{isPersonal
					? 'This is your personal workspace.'
					: 'Welcome to your team workspace.'}
			</p>

			<div className="mt-6 flex gap-4">
				{!isPersonal && (
					<Button variant="outline" asChild>
						<Link to={`/teams/${teamId}/settings/members`}>Manage members</Link>
					</Button>
				)}
				<Button variant="outline" asChild>
					<Link to={`/teams/${teamId}/settings/general`}>Team settings</Link>
				</Button>
			</div>
		</main>
	)
}
