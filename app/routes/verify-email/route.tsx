import { data, Link, redirect } from 'react-router'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	findEmailVerificationToken,
	invalidateEmailVerificationTokens,
	markEmailVerified,
} from '~/utils/email-verification.server'
import { getOptionalUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const token = url.searchParams.get('token')

	if (!token) {
		return data({ error: 'No verification token provided.' }, { status: 400 })
	}

	const { env } = getCloudflare(context)
	const row = await findEmailVerificationToken(env, token)

	if (!row) {
		return data(
			{ error: 'This verification link is invalid or has expired.' },
			{ status: 400 },
		)
	}

	// Mark all tokens for this user as used and verify the email
	await invalidateEmailVerificationTokens(env, row.userId)
	await markEmailVerified(env, row.userId)

	// If the user is logged in, redirect to home; otherwise to login
	const user = getOptionalUser(context)
	if (user) {
		throw redirect('/', {
			headers: {
				'set-cookie': setToast({
					type: 'success',
					title: 'Email verified',
				}),
			},
		})
	}

	throw redirect('/login', {
		headers: {
			'set-cookie': setToast({
				type: 'success',
				title: 'Email verified. Please sign in.',
			}),
		},
	})
}

export function meta() {
	return [{ title: 'Verify email — Seed Vault' }]
}

export default function VerifyEmailPage({ loaderData }: Route.ComponentProps) {
	const { error } = loaderData

	return (
		<main className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md space-y-6 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Email Verification
				</h1>
				<p className="text-muted-foreground text-sm">{error}</p>
				<div className="flex justify-center gap-4">
					<Button asChild variant="outline">
						<Link to="/login">Sign in</Link>
					</Button>
					<Button asChild variant="outline">
						<Link to="/signup">Create account</Link>
					</Button>
				</div>
			</div>
		</main>
	)
}
