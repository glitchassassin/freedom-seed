import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { workspaces } from '~/db/schema'
import {
	getBillingPlanBySlug,
	getOrCreateStripeCustomer,
} from '~/utils/billing/billing.server'
import { getStripe } from '~/utils/billing/stripe.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { hasRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { getWorkspaceMember } from '~/utils/workspaces.server'

const checkoutSchema = z.object({
	workspaceId: z.string().min(1),
	planSlug: z.string().min(1),
	interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const formData = await request.formData()

	const submission = parseWithZod(formData, { schema: checkoutSchema })
	if (submission.status !== 'success') {
		throw new Response('Invalid checkout data', { status: 400 })
	}
	const { workspaceId, planSlug, interval } = submission.value

	// Verify user is an admin of this workspace
	const member = await getWorkspaceMember(db, workspaceId, user.id)
	if (!member || !hasRole(member.role, 'admin')) {
		throw new Response('Forbidden', { status: 403 })
	}

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
