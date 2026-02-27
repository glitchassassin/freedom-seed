import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { passwordCredentials } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import { hashPassword, verifyPassword } from '~/utils/password.server'
import { requireUser } from '~/utils/session-context'
import { createSession, deleteAllSessions } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

const schema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string(),
	})
	.refine((d) => d.newPassword === d.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const user = requireUser(context)

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	const db = getDb(env)
	const cred = await db
		.select()
		.from(passwordCredentials)
		.where(eq(passwordCredentials.userId, user.id))
		.limit(1)
		.then((r) => r[0])

	const valid = cred
		? await verifyPassword(submission.value.currentPassword, cred.hash)
		: false

	if (!valid) {
		return submission.reply({
			fieldErrors: { currentPassword: ['Current password is incorrect'] },
		})
	}

	const hash = await hashPassword(submission.value.newPassword)
	await db
		.update(passwordCredentials)
		.set({ hash, updatedAt: new Date() })
		.where(eq(passwordCredentials.userId, user.id))

	await deleteAllSessions(env, user.id)
	const { cookie } = await createSession(env, user.id, request)

	return redirect('/settings/change-password', {
		headers: [
			[
				'set-cookie',
				setToast({ type: 'success', title: 'Password changed' }, isSecure),
			],
			['set-cookie', cookie],
		],
	})
}

export function meta() {
	return [{ title: 'Change password' }]
}

export default function ChangePasswordPage({
	actionData,
}: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Change password
					</h1>
					<p className="text-muted-foreground text-sm">
						Enter your current password and choose a new one.
					</p>
				</div>

				<Form method="POST" {...getFormProps(form)} className="space-y-4">
					{form.errors && (
						<p className="text-destructive text-sm">{form.errors[0]}</p>
					)}

					<div className="space-y-2">
						<Label htmlFor={fields.currentPassword.id}>Current password</Label>
						<Input
							{...getInputProps(fields.currentPassword, { type: 'password' })}
							autoComplete="current-password"
						/>
						{fields.currentPassword.errors && (
							<p className="text-destructive text-sm">
								{fields.currentPassword.errors[0]}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor={fields.newPassword.id}>New password</Label>
						<Input
							{...getInputProps(fields.newPassword, { type: 'password' })}
							autoComplete="new-password"
						/>
						{fields.newPassword.errors && (
							<p className="text-destructive text-sm">
								{fields.newPassword.errors[0]}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor={fields.confirmPassword.id}>
							Confirm new password
						</Label>
						<Input
							{...getInputProps(fields.confirmPassword, { type: 'password' })}
							autoComplete="new-password"
						/>
						{fields.confirmPassword.errors && (
							<p className="text-destructive text-sm">
								{fields.confirmPassword.errors[0]}
							</p>
						)}
					</div>

					<Button type="submit" className="w-full">
						Change password
					</Button>
				</Form>
			</div>
		</main>
	)
}
