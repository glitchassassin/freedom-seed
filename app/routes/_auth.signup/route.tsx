import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { Form, Link, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ProviderIcon } from '~/components/ui/provider-icon'
import { getDb } from '~/db/client.server'
import {
	passwordCredentials,
	workspaces,
	workspaceMembers,
	users,
} from '~/db/schema'
import { VerifyEmail } from '~/emails/verify-email'
import { getCloudflare } from '~/utils/cloudflare-context'
import { createEmailVerificationToken } from '~/utils/email-verification.server'
import { sendEmail } from '~/utils/email.server'
import { hashPassword } from '~/utils/password.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { safeRedirect } from '~/utils/safe-redirect'
import { createSession } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'
import { generateSlug } from '~/utils/workspaces.server'

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
	const workspaceId = crypto.randomUUID()
	const workspaceSlug = generateSlug('personal')

	// Use batch() so all inserts are atomic — a partial failure won't leave
	// an orphaned user row with no credential.
	await db.batch([
		db.insert(users).values({ id: userId, email: email.toLowerCase() }),
		db
			.insert(passwordCredentials)
			.values({ userId, hash, updatedAt: new Date() }),
		db.insert(workspaces).values({
			id: workspaceId,
			name: 'Personal',
			slug: workspaceSlug,
			isPersonal: true,
		}),
		db
			.insert(workspaceMembers)
			.values({ id: crypto.randomUUID(), workspaceId, userId, role: 'owner' }),
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
	const destination = safeRedirect(
		url.searchParams.get('redirectTo'),
		`/workspaces/${workspaceId}`,
	)
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

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background text-muted-foreground px-2">
						Or sign up with
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<a
					href="/social/google"
					className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
				>
					<ProviderIcon provider="google" size={18} />
					Sign up with Google
				</a>
				<a
					href="/social/github"
					className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
				>
					<ProviderIcon provider="github" size={18} />
					Sign up with GitHub
				</a>
			</div>

			<p className="text-muted-foreground text-center text-sm">
				Already have an account?{' '}
				<Link
					to="/login"
					className="text-foreground underline underline-offset-4"
				>
					Sign in
				</Link>
			</p>

			<p className="text-muted-foreground text-center text-xs">
				By creating an account you agree to our{' '}
				<Link
					to="/terms"
					className="text-foreground underline underline-offset-4"
				>
					Terms of Service
				</Link>{' '}
				and{' '}
				<Link
					to="/privacy"
					className="text-foreground underline underline-offset-4"
				>
					Privacy Policy
				</Link>
				.
			</p>
		</div>
	)
}
