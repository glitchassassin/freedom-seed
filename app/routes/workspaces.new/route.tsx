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
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { requireUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'
import { createWorkspace, generateSlug } from '~/utils/workspaces.server'

const schema = z.object({
	name: z
		.string()
		.min(1, 'Workspace name is required')
		.max(50, 'Workspace name is too long'),
})

export async function loader({ context }: Route.LoaderArgs) {
	requireUser(context)
	return {}
}

export async function action({ request, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	await requireRateLimit(env, request, {
		prefix: 'create-workspace',
		limit: 5,
		windowSeconds: 300,
	})

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	const db = getDb(env)
	const { name } = submission.value
	const slug = generateSlug(name)
	const { workspaceId } = await createWorkspace(db, {
		name,
		slug,
		ownerId: user.id,
	})

	await logAuditEvent({
		db,
		workspaceId,
		actorId: user.id,
		actorEmail: user.email,
		action: 'workspace.created',
		targetType: 'workspace',
		targetId: workspaceId,
		targetLabel: name,
	})

	return redirect(`/workspaces/${workspaceId}`, {
		headers: {
			'set-cookie': setToast(
				{ type: 'success', title: 'Workspace created' },
				isSecure,
			),
		},
	})
}

export function meta() {
	return [{ title: 'Create a Workspace' }]
}

export default function CreateWorkspacePage({
	actionData,
}: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
	})

	return (
		<main className="mx-auto max-w-md p-6">
			<h1 className="text-2xl font-semibold">Create a Workspace</h1>
			<p className="text-muted-foreground mt-2">
				Workspaces let you collaborate with others on shared projects.
			</p>

			<Form method="POST" {...getFormProps(form)} className="mt-6 space-y-4">
				<CsrfInput />
				{form.errors && (
					<p className="text-destructive text-sm">{form.errors[0]}</p>
				)}
				<div className="space-y-2">
					<Label htmlFor={fields.name.id}>Workspace name</Label>
					<Input
						{...getInputProps(fields.name, { type: 'text' })}
						placeholder="My Awesome Workspace"
						autoFocus
					/>
					{fields.name.errors && (
						<p className="text-destructive text-sm">{fields.name.errors[0]}</p>
					)}
				</div>
				<Button type="submit" className="w-full">
					Create workspace
				</Button>
			</Form>
		</main>
	)
}
