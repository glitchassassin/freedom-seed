import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { passwordCredentials } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import { hashPassword } from '~/utils/password.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import {
	createSession,
	deleteAllSessions,
	findPasswordResetToken,
	invalidatePasswordResetTokens,
} from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

const schema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const url = new URL(request.url)
	const token = url.searchParams.get('token')
	if (!token) return { valid: false as const }

	const row = await findPasswordResetToken(env, token)
	return { valid: row !== null ? (true as const) : (false as const) }
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	await requireRateLimit(env, request, {
		prefix: 'reset-pw',
		limit: 5,
		windowSeconds: 300,
	})
	const url = new URL(request.url)
	const tokenParam = url.searchParams.get('token')

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	if (!tokenParam) {
		return submission.reply({ formErrors: ['Invalid or expired reset link'] })
	}

	// Re-validate token in the action (re-verify; never trust the loader result)
	const row = await findPasswordResetToken(env, tokenParam)
	if (!row) {
		return submission.reply({ formErrors: ['Invalid or expired reset link'] })
	}

	const hash = await hashPassword(submission.value.password)
	const db = getDb(env)

	await db
		.insert(passwordCredentials)
		.values({ userId: row.userId, hash, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: passwordCredentials.userId,
			set: { hash, updatedAt: new Date() },
		})

	// Invalidate ALL pending reset tokens for this user (not just this one)
	await invalidatePasswordResetTokens(env, row.userId)

	await deleteAllSessions(env, row.userId)
	const { cookie } = await createSession(env, row.userId, request)

	return redirect('/', {
		headers: [
			['set-cookie', setToast({ type: 'success', title: 'Password updated' })],
			['set-cookie', cookie],
		],
	})
}

export function meta() {
	return [{ title: 'Reset password' }]
}

export default function ResetPasswordPage({
	loaderData,
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

	if (!loaderData.valid) {
		return (
			<div className="space-y-4 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Invalid reset link
				</h1>
				<p className="text-muted-foreground text-sm">
					This reset link has expired or already been used. Please request a new
					one.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Reset your password
				</h1>
				<p className="text-muted-foreground text-sm">
					Enter a new password for your account.
				</p>
			</div>

			<Form method="POST" {...getFormProps(form)} className="space-y-4">
				<CsrfInput />
				{form.errors && (
					<p className="text-destructive text-sm">{form.errors[0]}</p>
				)}

				<div className="space-y-2">
					<Label htmlFor={fields.password.id}>New password</Label>
					<Input
						{...getInputProps(fields.password, { type: 'password' })}
						autoComplete="new-password"
						aria-invalid={!!fields.password.errors}
					/>
					{fields.password.errors && (
						<p className="text-destructive text-sm">
							{fields.password.errors[0]}
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
						aria-invalid={!!fields.confirmPassword.errors}
					/>
					{fields.confirmPassword.errors && (
						<p className="text-destructive text-sm">
							{fields.confirmPassword.errors[0]}
						</p>
					)}
				</div>

				<Button type="submit" className="w-full">
					Reset password
				</Button>
			</Form>
		</div>
	)
}
