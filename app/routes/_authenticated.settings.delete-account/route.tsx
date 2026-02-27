import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { AccountDeletionEmail } from '~/emails/account-deletion'
import { getCloudflare } from '~/utils/cloudflare-context'
import { sendEmail } from '~/utils/email.server'
import { softDeleteUser } from '~/utils/gdpr.server'
import { requireUser } from '~/utils/session-context'
import { deleteAllSessions, clearSessionCookie } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

const schema = z.object({
	confirmEmail: z.string().min(1, 'Email confirmation is required'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const user = requireUser(context)

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	if (submission.value.confirmEmail !== user.email) {
		return submission.reply({
			fieldErrors: { confirmEmail: ['Email address does not match'] },
		})
	}

	const scheduledForDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

	// Send confirmation email before anonymising PII
	await sendEmail(env, {
		to: user.email,
		subject: 'Your account deletion request',
		react: (
			<AccountDeletionEmail
				displayName={user.displayName ?? user.email}
				scheduledForDeletionAt={scheduledForDeletionAt}
			/>
		),
	})

	await softDeleteUser(env, user.id)
	await deleteAllSessions(env, user.id)

	return redirect('/', {
		headers: [
			['set-cookie', clearSessionCookie(isSecure)],
			[
				'set-cookie',
				setToast(
					{
						type: 'success',
						title: 'Account deleted',
						description:
							'Your personal data has been removed. Remaining data will be deleted after 30 days.',
					},
					isSecure,
				),
			],
		],
	})
}

export function meta() {
	return [{ title: 'Delete account' }]
}

export default function DeleteAccountPage({
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
						Delete account
					</h1>
					<p className="text-muted-foreground text-sm">
						This will immediately remove your personal information. Any
						remaining data will be permanently deleted after a 30-day grace
						period.
					</p>
				</div>

				<div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
					<p className="text-sm font-medium text-red-800 dark:text-red-200">
						This action cannot be undone.
					</p>
				</div>

				<Form method="POST" {...getFormProps(form)} className="space-y-4">
					<CsrfInput />
					{form.errors && (
						<p className="text-destructive text-sm">{form.errors[0]}</p>
					)}

					<div className="space-y-2">
						<Label htmlFor={fields.confirmEmail.id}>
							Confirm your email address
						</Label>
						<Input
							{...getInputProps(fields.confirmEmail, { type: 'email' })}
							placeholder="you@example.com"
							autoComplete="email"
						/>
						{fields.confirmEmail.errors && (
							<p className="text-destructive text-sm">
								{fields.confirmEmail.errors[0]}
							</p>
						)}
					</div>

					<Button type="submit" variant="destructive" className="w-full">
						Permanently delete my account
					</Button>
				</Form>
			</div>
		</main>
	)
}
