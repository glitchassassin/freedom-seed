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
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="18"
						height="18"
						aria-hidden="true"
					>
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					Sign up with Google
				</a>
				<a
					href="/social/github"
					className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="18"
						height="18"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
					</svg>
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
