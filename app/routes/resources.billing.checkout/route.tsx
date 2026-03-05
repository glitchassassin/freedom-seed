import { eq } from 'drizzle-orm'
import { redirect } from 'react-router'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { workspaces } from '~/db/schema'
import {
	getBillingPlanBySlug,
	getOrCreateStripeCustomer,
} from '~/utils/billing/billing.server'
import { getStripe } from '~/utils/billing/stripe.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireUser } from '~/utils/session-context'

export async function action({ request, context }: Route.ActionArgs) {
	requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const formData = await request.formData()

	const workspaceId = String(formData.get('workspaceId'))
	const planSlug = String(formData.get('planSlug'))
	const interval = String(formData.get('interval') || 'monthly')

	// Look up the plan
	const plan = await getBillingPlanBySlug(db, planSlug)
	if (!plan || plan.status !== 'active') {
		throw new Response('Plan not available', { status: 400 })
	}

	const priceId =
		interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly
	if (!priceId) {
		throw new Response('No price configured for this plan', { status: 400 })
	}

	// Get workspace for Stripe customer
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
	const session = await stripe.checkout.sessions.create({
		customer: customerId,
		mode: 'subscription',
		line_items: [{ price: priceId, quantity: 1 }],
		subscription_data: {
			metadata: { workspaceId },
			trial_period_days: plan.trialDays || undefined,
		},
		success_url: `${origin}/workspaces/${workspaceId}/settings/billing?success=1`,
		cancel_url: `${origin}/workspaces/${workspaceId}/settings/billing?canceled=1`,
		metadata: { workspaceId },
	})

	if (!session.url) {
		throw new Response('Failed to create checkout session', { status: 500 })
	}

	return redirect(session.url)
}
