import { eq } from 'drizzle-orm'
import { redirect } from 'react-router'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { workspaces } from '~/db/schema'
import { getOrCreateStripeCustomer } from '~/utils/billing/billing.server'
import { getStripe } from '~/utils/billing/stripe.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireUser } from '~/utils/session-context'

export async function action({ request, context }: Route.ActionArgs) {
	requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const formData = await request.formData()
	const workspaceId = String(formData.get('workspaceId'))

	const workspace = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)
	if (workspace.length === 0) {
		throw new Response('Workspace not found', { status: 404 })
	}

	const stripe = getStripe(env)
	const customerId = await getOrCreateStripeCustomer(db, stripe, workspace[0])

	const origin = new URL(request.url).origin
	const session = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: `${origin}/workspaces/${workspaceId}/settings/billing`,
	})

	return redirect(session.url)
}
