import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { Form, Link, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { passwordCredentials, teams, teamMembers, users } from '~/db/schema'
import { VerifyEmail } from '~/emails/verify-email'
import { getCloudflare } from '~/utils/cloudflare-context'
import { createEmailVerificationToken } from '~/utils/email-verification.server'
import { sendEmail } from '~/utils/email.server'
import { hashPassword } from '~/utils/password.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { createSession } from '~/utils/session.server'
import { generateSlug } from '~/utils/teams.server'
import { setToast } from '~/utils/toast.server'

const schema = z
	.object({
		email: z.string().email('Please enter a valid email address'),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	await requireRateLimit(env, request, {
		prefix: 'signup',
		limit: 3,
		windowSeconds: 300,
	})
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	const db = getDb(env)
	const { email, password } = submission.value

	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)
		.then((r) => r[0])

	if (existing) {
		return submission.reply({
			fieldErrors: { email: ['An account with that email already exists'] },
		})
	}

	const userId = crypto.randomUUID()
	const hash = await hashPassword(password)
	const teamId = crypto.randomUUID()
	const teamSlug = generateSlug('personal')

	// Use batch() so all inserts are atomic — a partial failure won't leave
	// an orphaned user row with no credential.
	await db.batch([
		db.insert(users).values({ id: userId, email: email.toLowerCase() }),
		db
			.insert(passwordCredentials)
			.values({ userId, hash, updatedAt: new Date() }),
		db.insert(teams).values({
			id: teamId,
			name: 'Personal',
			slug: teamSlug,
			isPersonal: true,
		}),
		db
			.insert(teamMembers)
			.values({ id: crypto.randomUUID(), teamId, userId, role: 'owner' }),
	])

	// Send email verification link — non-blocking; don't fail signup if email fails
	try {
		const token = await createEmailVerificationToken(env, userId)
		const verifyUrl = `${new URL(request.url).origin}/verify-email?token=${token}`
		await sendEmail(env, {
			to: email.toLowerCase(),
			subject: 'Verify your email — Seed Vault',
			react: VerifyEmail({ verifyUrl }),
		})
	} catch (err) {
		console.error('[signup] Failed to send verification email:', err)
	}

	const { cookie } = await createSession(env, userId, request)
	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirectTo')
	const destination =
		redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
			? redirectTo
			: `/teams/${teamId}`
	return redirect(destination, {
		headers: [
			[
				'set-cookie',
				setToast({ type: 'success', title: 'Account created' }, isSecure),
			],
			['set-cookie', cookie],
		],
	})
}

export function meta() {
	return [{ title: 'Create account' }]
}

export default function SignupPage({ actionData }: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Create an account
				</h1>
				<p className="text-muted-foreground text-sm">
					Enter your details below to get started.
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
					/>
					{fields.email.errors && (
						<p className="text-destructive text-sm">{fields.email.errors[0]}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor={fields.password.id}>Password</Label>
					<Input
						{...getInputProps(fields.password, { type: 'password' })}
						autoComplete="new-password"
					/>
					{fields.password.errors && (
						<p className="text-destructive text-sm">
							{fields.password.errors[0]}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor={fields.confirmPassword.id}>Confirm password</Label>
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
					Create account
				</Button>
			</Form>

			<p className="text-muted-foreground text-center text-sm">
				Already have an account?{' '}
				<Link
					to="/login"
					className="text-foreground underline underline-offset-4"
				>
					Sign in
				</Link>
			</p>
		</div>
	)
}
