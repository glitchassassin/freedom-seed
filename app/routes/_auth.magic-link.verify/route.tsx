import { and, eq, isNull } from 'drizzle-orm'
import { Link, redirect } from 'react-router'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { getDb } from '~/db/client.server'
import { users } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	findMagicLinkToken,
	invalidateMagicLinkTokens,
} from '~/utils/magic-link.server'
import { createSession } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const url = new URL(request.url)
	const token = url.searchParams.get('token')

	if (!token) {
		return { error: 'This sign-in link is invalid or has expired.' }
	}

	const row = await findMagicLinkToken(env, token)
	if (!row) {
		return { error: 'This sign-in link is invalid or has expired.' }
	}

	// Invalidate all magic link tokens for this user to prevent reuse
	await invalidateMagicLinkTokens(env, row.userId)

	// Mark email as verified since they proved ownership by clicking the link
	const db = getDb(env)
	await db
		.update(users)
		.set({ emailVerifiedAt: new Date() })
		.where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)))

	// Create session and redirect
	const { cookie } = await createSession(env, row.userId, request)

	return redirect('/', {
		headers: [
			[
				'set-cookie',
				setToast({ type: 'success', title: 'Signed in successfully' }),
			],
			['set-cookie', cookie],
		],
	})
}

export function meta() {
	return [{ title: 'Verify sign-in link' }]
}

export default function VerifyMagicLinkPage({
	loaderData,
}: Route.ComponentProps) {
	return (
		<div className="space-y-4 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">
				Invalid sign-in link
			</h1>
			<p className="text-muted-foreground text-sm">{loaderData.error}</p>
			<Button asChild className="w-full">
				<Link to="/magic-link">Request a new link</Link>
			</Button>
		</div>
	)
}
