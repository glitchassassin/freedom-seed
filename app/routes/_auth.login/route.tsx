import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { useState } from 'react'
import { Form, Link, redirect, useRouteLoaderData } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ProviderIcon } from '~/components/ui/provider-icon'
import { getDb } from '~/db/client.server'
import { mfaCredentials, passwordCredentials, users } from '~/db/schema'
import type { loader as rootLoader } from '~/root'
import { getCloudflare } from '~/utils/cloudflare-context'
import { CSRF_FIELD_NAME } from '~/utils/csrf-constants'
import { createMfaPendingCookie } from '~/utils/mfa.server'
import { hashPassword, verifyPassword } from '~/utils/password.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { safeRedirect } from '~/utils/safe-redirect'
import { createSession } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'
import { getUserWorkspaces } from '~/utils/workspaces.server'

// Pre-computed dummy hash used to normalize response time when the email does
// not exist. Without this, missing users return ~instantly while valid users
// wait for scrypt, leaking email existence via timing.
let DUMMY_HASH: string | null = null
async function getDummyHash() {
	if (!DUMMY_HASH) DUMMY_HASH = await hashPassword('dummy-timing-normalizer')
	return DUMMY_HASH
}

const schema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	await requireRateLimit(env, request, {
		prefix: 'login',
		limit: 5,
		windowSeconds: 300,
	})
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()

	const db = getDb(env)
	const { email, password } = submission.value

	const user = await db
		.select()
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)
		.then((r) => r[0])

	const cred = user
		? await db
				.select()
				.from(passwordCredentials)
				.where(eq(passwordCredentials.userId, user.id))
				.limit(1)
				.then((r) => r[0])
		: null

	// Always run verifyPassword to normalize response time and prevent
	// email enumeration via timing side-channel.
	const valid = await verifyPassword(
		password,
		cred?.hash ?? (await getDummyHash()),
	)

	if (!user || !cred || !valid) {
		return submission.reply({
			formErrors: ['Invalid email or password'],
		})
	}

	// Check if user has MFA enabled
	const mfaCred = await db
		.select()
		.from(mfaCredentials)
		.where(eq(mfaCredentials.userId, user.id))
		.limit(1)
		.then((r) => r[0])

	if (mfaCred?.verifiedAt) {
		// MFA is enabled — redirect to challenge instead of creating a session
		const mfaCookie = await createMfaPendingCookie(env, user.id)
		const url = new URL(request.url)
		const redirectTo = url.searchParams.get('redirectTo')
		const mfaUrl = redirectTo
			? `/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}`
			: '/login/mfa'
		return redirect(mfaUrl, {
			headers: { 'set-cookie': mfaCookie },
		})
	}

	const { cookie } = await createSession(env, user.id, request)

	// Default to user's first workspace if no explicit redirectTo
	const url = new URL(request.url)
	let defaultRedirect = '/'
	if (!url.searchParams.get('redirectTo')) {
		const userWorkspaces = await getUserWorkspaces(db, user.id)
		if (userWorkspaces.length > 0) {
			defaultRedirect = `/workspaces/${userWorkspaces[0].id}`
		}
	}

	const destination = safeRedirect(
		url.searchParams.get('redirectTo'),
		defaultRedirect,
	)

	return redirect(destination, {
		headers: [
			[
				'set-cookie',
				setToast({ type: 'success', title: 'Welcome back' }, isSecure),
			],
			['set-cookie', cookie],
		],
	})
}

export function meta() {
	return [{ title: 'Sign in' }]
}

export default function LoginPage({ actionData }: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const csrfToken = rootData?.csrfToken ?? ''

	const [passkeyStatus, setPasskeyStatus] = useState<
		'idle' | 'loading' | 'error'
	>('idle')
	const [passkeyError, setPasskeyError] = useState<string | null>(null)

	async function handlePasskeyLogin() {
		setPasskeyStatus('loading')
		setPasskeyError(null)

		try {
			// 1. Get authentication options
			const optionsFormData = new FormData()
			optionsFormData.set(CSRF_FIELD_NAME, csrfToken)
			const optionsRes = await fetch(
				'/resources/passkeys/authentication-options',
				{
					method: 'POST',
					body: optionsFormData,
				},
			)

			if (!optionsRes.ok) {
				throw new Error('Failed to get authentication options')
			}

			const options = await optionsRes.json()

			// 2. Start browser authentication via @simplewebauthn/browser
			const { startAuthentication } = await import('@simplewebauthn/browser')
			const assertion = await startAuthentication({
				optionsJSON: options as unknown as Parameters<
					typeof startAuthentication
				>[0]['optionsJSON'],
			})

			// 3. Submit verification
			const verifyFormData = new FormData()
			verifyFormData.set(CSRF_FIELD_NAME, csrfToken)
			verifyFormData.set('response', JSON.stringify(assertion))

			const verifyRes = await fetch(
				'/resources/passkeys/authentication-verify',
				{
					method: 'POST',
					body: verifyFormData,
				},
			)

			const result = (await verifyRes.json()) as {
				verified?: boolean
				redirectTo?: string
				error?: string
			}

			if (!verifyRes.ok || !result.verified) {
				throw new Error(result.error ?? 'Authentication failed')
			}

			// 4. Navigate to the returned destination
			window.location.href = result.redirectTo ?? '/'
		} catch (err) {
			setPasskeyError(
				err instanceof Error ? err.message : 'Passkey sign-in failed',
			)
			setPasskeyStatus('idle')
		}
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
				<p className="text-muted-foreground text-sm">
					Welcome back! Enter your credentials below.
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
					<div className="flex items-center justify-between">
						<Label htmlFor={fields.password.id}>Password</Label>
						<Link
							to="/forgot-password"
							className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
						>
							Forgot password?
						</Link>
					</div>
					<Input
						{...getInputProps(fields.password, { type: 'password' })}
						autoComplete="current-password"
					/>
					{fields.password.errors && (
						<p className="text-destructive text-sm">
							{fields.password.errors[0]}
						</p>
					)}
				</div>

				<Button type="submit" className="w-full">
					Sign in
				</Button>
			</Form>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background text-muted-foreground px-2">Or</span>
				</div>
			</div>

			<div className="space-y-3">
				<Link
					to="/magic-link"
					className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
				>
					Sign in with email link
				</Link>

				<div className="space-y-1">
					{passkeyError && (
						<p className="text-destructive text-center text-sm">
							{passkeyError}
						</p>
					)}
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() => void handlePasskeyLogin()}
						disabled={passkeyStatus === 'loading'}
					>
						{passkeyStatus === 'loading'
							? 'Waiting for passkey…'
							: 'Sign in with passkey'}
					</Button>
				</div>
			</div>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background text-muted-foreground px-2">
						Or continue with
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<a
					href="/social/google"
					className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
				>
					<ProviderIcon provider="google" size={18} />
					Continue with Google
				</a>
				<a
					href="/social/github"
					className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
				>
					<ProviderIcon provider="github" size={18} />
					Continue with GitHub
				</a>
			</div>

			<p className="text-muted-foreground text-center text-sm">
				Don&apos;t have an account?{' '}
				<Link
					to="/signup"
					className="text-foreground underline underline-offset-4"
				>
					Sign up
				</Link>
			</p>
		</div>
	)
}
