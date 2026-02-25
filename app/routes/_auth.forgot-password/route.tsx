import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { Form } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { users } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { createPasswordResetToken } from '~/utils/session.server'

const schema = z.object({
	email: z.string().email('Please enter a valid email address'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	await requireRateLimit(env, request, {
		prefix: 'forgot-pw',
		limit: 3,
		windowSeconds: 300,
	})
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	const db = getDb(env)
	const { email } = submission.value

	const user = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)
		.then((r) => r[0])

	if (user) {
		const token = await createPasswordResetToken(env, user.id)
		// TODO: send email via email facet
		console.log(`[dev] Password reset link: /reset-password?token=${token}`)
	}

	// Always return success to prevent email enumeration
	return submission.reply()
}

export function meta() {
	return [{ title: 'Forgot password' }]
}

export default function ForgotPasswordPage({
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

	if (form.status === 'success') {
		return (
			<div className="space-y-4 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Check your email
				</h1>
				<p className="text-muted-foreground text-sm">
					If that email is registered, you&apos;ll receive a reset link shortly.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Forgot password
				</h1>
				<p className="text-muted-foreground text-sm">
					Enter your email and we&apos;ll send a reset link.
				</p>
			</div>

			<Form method="POST" {...getFormProps(form)} className="space-y-4">
				<CsrfInput />
				<div className="space-y-2">
					<Label htmlFor={fields.email.id}>Email</Label>
					<Input
						{...getInputProps(fields.email, { type: 'email' })}
						autoComplete="email"
					/>
					{fields.email.errors && (
						<p className="text-destructive text-sm">{fields.email.errors[0]}</p>
					)}
				</div>

				<Button type="submit" className="w-full">
					Send reset link
				</Button>
			</Form>
		</div>
	)
}
