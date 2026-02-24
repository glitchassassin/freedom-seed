import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { Form, Link } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { users } from '~/db/schema'
import { MagicLinkEmail } from '~/emails/magic-link'
import { getCloudflare } from '~/utils/cloudflare-context'
import { sendEmail } from '~/utils/email.server'
import { createMagicLinkToken } from '~/utils/magic-link.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'

const schema = z.object({
	email: z.string().email('Please enter a valid email address'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	await requireRateLimit(env, request, {
		prefix: 'magic-link',
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
		const token = await createMagicLinkToken(env, user.id)
		const origin = new URL(request.url).origin
		const loginUrl = `${origin}/magic-link/verify?token=${token}`

		await sendEmail(env, {
			to: email.toLowerCase(),
			subject: 'Your sign-in link for Seed Vault',
			react: <MagicLinkEmail loginUrl={loginUrl} />,
		})
	}

	// Always return success to prevent email enumeration
	return submission.reply()
}

export function meta() {
	return [{ title: 'Sign in with email' }]
}

export default function MagicLinkPage({ actionData }: Route.ComponentProps) {
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
					If an account with that email exists, we&apos;ve sent a sign-in link.
				</p>
				<p className="text-muted-foreground text-center text-sm">
					<Link
						to="/login"
						className="text-foreground underline underline-offset-4"
					>
						Back to sign in
					</Link>
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Sign in with email
				</h1>
				<p className="text-muted-foreground text-sm">
					Enter your email and we&apos;ll send you a sign-in link.
				</p>
			</div>

			<Form method="POST" {...getFormProps(form)} className="space-y-4">
				<CsrfInput />
				{form.errors && (
					<p className="text-destructive text-sm">{form.errors[0]}</p>
				)}

				<div className="space-y-2">
					<Label htmlFor={fields.email.id}>Email</Label>
					<Input
						{...getInputProps(fields.email, { type: 'email' })}
						autoComplete="email"
						aria-invalid={!!fields.email.errors}
					/>
					{fields.email.errors && (
						<p className="text-destructive text-sm">{fields.email.errors[0]}</p>
					)}
				</div>

				<Button type="submit" className="w-full">
					Send sign-in link
				</Button>
			</Form>

			<p className="text-muted-foreground text-center text-sm">
				<Link
					to="/login"
					className="text-foreground underline underline-offset-4"
				>
					Sign in with password
				</Link>
				{' \u00B7 '}
				<Link
					to="/signup"
					className="text-foreground underline underline-offset-4"
				>
					Create an account
				</Link>
			</p>
		</div>
	)
}
