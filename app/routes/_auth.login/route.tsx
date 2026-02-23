import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { Form, Link, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { passwordCredentials, users } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import { hashPassword, verifyPassword } from '~/utils/password.server'
import { createSession } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

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

	const { cookie } = await createSession(env, user.id, request)

	// Honor redirectTo if it's a safe relative path
	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirectTo') ?? '/'
	const safeRedirect =
		redirectTo.startsWith('/') && !redirectTo.startsWith('//')
			? redirectTo
			: '/'

	return redirect(safeRedirect, {
		headers: [
			['set-cookie', setToast({ type: 'success', title: 'Welcome back' })],
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

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
				<p className="text-muted-foreground text-sm">
					Welcome back! Enter your credentials below.
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
						aria-invalid={!!fields.email.errors}
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
						aria-invalid={!!fields.password.errors}
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
