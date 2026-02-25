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
import { createTeam, generateSlug } from '~/utils/teams.server'
import { setToast } from '~/utils/toast.server'

const schema = z.object({
	name: z
		.string()
		.min(1, 'Team name is required')
		.max(50, 'Team name is too long'),
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
		prefix: 'create-team',
		limit: 5,
		windowSeconds: 300,
	})

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	const db = getDb(env)
	const { name } = submission.value
	const slug = generateSlug(name)
	const { teamId } = await createTeam(db, {
		name,
		slug,
		ownerId: user.id,
	})

	await logAuditEvent({
		db,
		teamId,
		actorId: user.id,
		actorEmail: user.email,
		action: 'team.created',
		targetType: 'team',
		targetId: teamId,
		targetLabel: name,
	})

	return redirect(`/teams/${teamId}`, {
		headers: {
			'set-cookie': setToast(
				{ type: 'success', title: 'Team created' },
				isSecure,
			),
		},
	})
}

export function meta() {
	return [{ title: 'Create a Team' }]
}

export default function CreateTeamPage({ actionData }: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
	})

	return (
		<main className="mx-auto max-w-md p-6">
			<h1 className="text-2xl font-semibold">Create a Team</h1>
			<p className="text-muted-foreground mt-2">
				Teams let you collaborate with others on shared projects.
			</p>

			<Form method="POST" {...getFormProps(form)} className="mt-6 space-y-4">
				<CsrfInput />
				{form.errors && (
					<p className="text-destructive text-sm">{form.errors[0]}</p>
				)}
				<div className="space-y-2">
					<Label htmlFor={fields.name.id}>Team name</Label>
					<Input
						{...getInputProps(fields.name, { type: 'text' })}
						placeholder="My Awesome Team"
						autoFocus
					/>
					{fields.name.errors && (
						<p className="text-destructive text-sm">{fields.name.errors[0]}</p>
					)}
				</div>
				<Button type="submit" className="w-full">
					Create team
				</Button>
			</Form>
		</main>
	)
}
