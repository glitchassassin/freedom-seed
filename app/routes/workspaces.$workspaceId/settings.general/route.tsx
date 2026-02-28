import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { logAuditEvent } from '~/db/audit-log.server'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'
import { requireWorkspaceMember } from '~/utils/workspace-context'
import {
	deleteWorkspace,
	getUserWorkspaces,
	renameWorkspace,
} from '~/utils/workspaces.server'

const renameSchema = z.object({
	name: z
		.string()
		.min(1, 'Workspace name is required')
		.max(50, 'Workspace name is too long'),
})

const deleteSchema = z.object({
	confirmName: z.string(),
})

export async function loader({ context }: Route.LoaderArgs) {
	requireRole(context, 'admin')
	const member = requireWorkspaceMember(context)
	return {
		workspaceId: member.workspaceId,
		workspaceName: member.workspaceName,
		isPersonal: member.isPersonal,
		role: member.role,
	}
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const member = requireWorkspaceMember(context)
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const db = getDb(env)
	const workspaceId = params.workspaceId!
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'rename') {
		requireRole(context, 'admin')
		const submission = parseWithZod(formData, { schema: renameSchema })
		if (submission.status !== 'success') return submission.reply()

		await renameWorkspace(db, workspaceId, submission.value.name)
		await logAuditEvent({
			db,
			workspaceId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'workspace.renamed',
			targetType: 'workspace',
			targetId: workspaceId,
			metadata: { from: member.workspaceName, to: submission.value.name },
		})

		return redirect(`/workspaces/${workspaceId}/settings/general`, {
			headers: {
				'set-cookie': setToast(
					{ type: 'success', title: 'Workspace renamed' },
					isSecure,
				),
			},
		})
	}

	if (intent === 'delete') {
		requireRole(context, 'owner')
		if (member.isPersonal) {
			throw new Response('Cannot delete personal workspace', { status: 400 })
		}

		const submission = parseWithZod(formData, { schema: deleteSchema })
		if (submission.status !== 'success') return submission.reply()

		if (submission.value.confirmName !== member.workspaceName) {
			return submission.reply({
				fieldErrors: {
					confirmName: ['Workspace name does not match'],
				},
			})
		}

		await logAuditEvent({
			db,
			workspaceId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'workspace.deleted',
			targetType: 'workspace',
			targetId: workspaceId,
			targetLabel: member.workspaceName,
		})

		await deleteWorkspace(db, workspaceId)

		// Redirect to personal workspace
		const userWorkspaces = await getUserWorkspaces(db, user.id)
		const personalWorkspace =
			userWorkspaces.find((t) => t.isPersonal) || userWorkspaces[0]

		return redirect(`/workspaces/${personalWorkspace.id}`, {
			headers: {
				'set-cookie': setToast(
					{ type: 'success', title: 'Workspace deleted' },
					isSecure,
				),
			},
		})
	}

	throw new Response('Unknown intent', { status: 400 })
}

export function meta() {
	return [{ title: 'Workspace Settings' }]
}

export default function WorkspaceSettingsGeneral({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { workspaceName, isPersonal, role } = loaderData

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
			<h1 className="text-2xl font-semibold">Workspace Settings</h1>

			<section className="mt-8">
				<h2 className="text-lg font-semibold">Workspace Name</h2>
				<Form
					method="POST"
					{...getFormProps(renameForm)}
					className="mt-4 flex items-end gap-4"
				>
					<input type="hidden" name="intent" value="rename" />
					<div className="flex-1 space-y-2">
						<Label htmlFor={renameFields.name.id}>Name</Label>
						<Input
							{...getInputProps(renameFields.name, { type: 'text' })}
							defaultValue={workspaceName}
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
						Delete Workspace
					</h2>
					<p className="text-muted-foreground mt-2 text-sm">
						This action is permanent. All workspace data, members, and
						invitations will be deleted.
					</p>
					<Form
						method="POST"
						{...getFormProps(deleteForm)}
						className="mt-4 space-y-4"
					>
						<input type="hidden" name="intent" value="delete" />
						<div className="space-y-2">
							<Label htmlFor={deleteFields.confirmName.id}>
								Type <strong>{workspaceName}</strong> to confirm
							</Label>
							<Input
								{...getInputProps(deleteFields.confirmName, { type: 'text' })}
								placeholder={workspaceName}
							/>
							{deleteFields.confirmName.errors && (
								<p className="text-destructive text-sm">
									{deleteFields.confirmName.errors[0]}
								</p>
							)}
						</div>
						<Button type="submit" variant="destructive">
							Delete workspace permanently
						</Button>
					</Form>
				</section>
			)}
		</main>
	)
}
