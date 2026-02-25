import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { logAuditEvent } from '~/db/audit-log.server'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { requireTeamMember } from '~/utils/team-context'
import { deleteTeam, getUserTeams, renameTeam } from '~/utils/teams.server'
import { setToast } from '~/utils/toast.server'

const renameSchema = z.object({
	name: z
		.string()
		.min(1, 'Team name is required')
		.max(50, 'Team name is too long'),
})

const deleteSchema = z.object({
	confirmName: z.string(),
})

export async function loader({ context }: Route.LoaderArgs) {
	requireRole(context, 'admin')
	const member = requireTeamMember(context)
	return {
		teamId: member.teamId,
		teamName: member.teamName,
		isPersonal: member.isPersonal,
		role: member.role,
	}
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const member = requireTeamMember(context)
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const db = getDb(env)
	const teamId = params.teamId!
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'rename') {
		requireRole(context, 'admin')
		const submission = parseWithZod(formData, { schema: renameSchema })
		if (submission.status !== 'success') return submission.reply()

		await renameTeam(db, teamId, submission.value.name)
		await logAuditEvent({
			db,
			teamId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'team.renamed',
			targetType: 'team',
			targetId: teamId,
			metadata: { from: member.teamName, to: submission.value.name },
		})

		return redirect(`/teams/${teamId}/settings/general`, {
			headers: {
				'set-cookie': setToast(
					{ type: 'success', title: 'Team renamed' },
					isSecure,
				),
			},
		})
	}

	if (intent === 'delete') {
		requireRole(context, 'owner')
		if (member.isPersonal) {
			throw new Response('Cannot delete personal team', { status: 400 })
		}

		const submission = parseWithZod(formData, { schema: deleteSchema })
		if (submission.status !== 'success') return submission.reply()

		if (submission.value.confirmName !== member.teamName) {
			return submission.reply({
				fieldErrors: {
					confirmName: ['Team name does not match'],
				},
			})
		}

		await logAuditEvent({
			db,
			teamId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'team.deleted',
			targetType: 'team',
			targetId: teamId,
			targetLabel: member.teamName,
		})

		await deleteTeam(db, teamId)

		// Redirect to personal team
		const userTeams = await getUserTeams(db, user.id)
		const personalTeam = userTeams.find((t) => t.isPersonal) || userTeams[0]

		return redirect(`/teams/${personalTeam.id}`, {
			headers: {
				'set-cookie': setToast(
					{ type: 'success', title: 'Team deleted' },
					isSecure,
				),
			},
		})
	}

	throw new Response('Unknown intent', { status: 400 })
}

export function meta() {
	return [{ title: 'Team Settings' }]
}

export default function TeamSettingsGeneral({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { teamName, isPersonal, role } = loaderData

	const [renameForm, renameFields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: renameSchema })
		},
		shouldValidate: 'onBlur',
	})

	const [deleteForm, deleteFields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: deleteSchema })
		},
		shouldValidate: 'onBlur',
	})

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">Team Settings</h1>

			<section className="mt-8">
				<h2 className="text-lg font-semibold">Team Name</h2>
				<Form
					method="POST"
					{...getFormProps(renameForm)}
					className="mt-4 flex items-end gap-4"
				>
					<CsrfInput />
					<input type="hidden" name="intent" value="rename" />
					<div className="flex-1 space-y-2">
						<Label htmlFor={renameFields.name.id}>Name</Label>
						<Input
							{...getInputProps(renameFields.name, { type: 'text' })}
							defaultValue={teamName}
						/>
						{renameFields.name.errors && (
							<p className="text-destructive text-sm">
								{renameFields.name.errors[0]}
							</p>
						)}
					</div>
					<Button type="submit">Rename</Button>
				</Form>
			</section>

			{!isPersonal && role === 'owner' && (
				<section className="mt-12 rounded-lg border border-red-200 p-6 dark:border-red-900">
					<h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
						Delete Team
					</h2>
					<p className="text-muted-foreground mt-2 text-sm">
						This action is permanent. All team data, members, and invitations
						will be deleted.
					</p>
					<Form
						method="POST"
						{...getFormProps(deleteForm)}
						className="mt-4 space-y-4"
					>
						<CsrfInput />
						<input type="hidden" name="intent" value="delete" />
						<div className="space-y-2">
							<Label htmlFor={deleteFields.confirmName.id}>
								Type <strong>{teamName}</strong> to confirm
							</Label>
							<Input
								{...getInputProps(deleteFields.confirmName, { type: 'text' })}
								placeholder={teamName}
							/>
							{deleteFields.confirmName.errors && (
								<p className="text-destructive text-sm">
									{deleteFields.confirmName.errors[0]}
								</p>
							)}
						</div>
						<Button type="submit" variant="destructive">
							Delete team permanently
						</Button>
					</Form>
				</section>
			)}
		</main>
	)
}
