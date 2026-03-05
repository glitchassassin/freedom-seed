import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import type { Db } from '~/db/client.server'
import { billingPlans, subscriptions, workspaces } from '~/db/schema'
import type { BillingPlanStatus } from '~/db/schema'

export async function getOrCreateStripeCustomer(
	db: Db,
	stripe: Stripe,
	workspace: { id: string; name: string; stripeCustomerId: string | null },
) {
	if (workspace.stripeCustomerId) return workspace.stripeCustomerId

	const customer = await stripe.customers.create({
		name: workspace.name,
		metadata: { workspaceId: workspace.id },
	})

	await db
		.update(workspaces)
		.set({ stripeCustomerId: customer.id })
		.where(eq(workspaces.id, workspace.id))

	return customer.id
}

export async function getWorkspaceSubscription(db: Db, workspaceId: string) {
	const result = await db
		.select()
		.from(subscriptions)
		.innerJoin(billingPlans, eq(subscriptions.billingPlanId, billingPlans.id))
		.where(eq(subscriptions.workspaceId, workspaceId))
		.limit(1)

	if (result.length === 0) return null
	return {
		subscription: result[0].subscriptions,
		plan: result[0].billing_plans,
	}
}

export async function getWorkspacePlan(db: Db, workspaceId: string) {
	const sub = await getWorkspaceSubscription(db, workspaceId)
	if (sub) return sub.plan

	// Default to free plan
	const freePlan = await getBillingPlanBySlug(db, 'free')
	return freePlan
}

export async function syncSubscriptionFromStripe(
	db: Db,
	stripeSubscription: Stripe.Subscription,
) {
	const stripePriceId = stripeSubscription.items.data[0]?.price.id
	if (!stripePriceId) throw new Error('No price found on subscription')

	// Find the billing plan by matching the stripe price ID
	const plans = await db.select().from(billingPlans)
	const matchedPlan = plans.find(
		(p) =>
			p.stripePriceIdMonthly === stripePriceId ||
			p.stripePriceIdYearly === stripePriceId,
	)
	if (!matchedPlan)
		throw new Error(`No billing plan found for price ${stripePriceId}`)

	const firstItem = stripeSubscription.items.data[0]
	const now = new Date()
	const values = {
		workspaceId: stripeSubscription.metadata.workspaceId!,
		billingPlanId: matchedPlan.id,
		stripeSubscriptionId: stripeSubscription.id,
		stripePriceId,
		status: stripeSubscription.status as
			| 'active'
			| 'trialing'
			| 'past_due'
			| 'canceled'
			| 'unpaid',
		quantity: firstItem?.quantity ?? 1,
		currentPeriodStart: new Date((firstItem?.current_period_start ?? 0) * 1000),
		currentPeriodEnd: new Date((firstItem?.current_period_end ?? 0) * 1000),
		trialEndsAt: stripeSubscription.trial_end
			? new Date(stripeSubscription.trial_end * 1000)
			: null,
		cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
		updatedAt: now,
	}

	// Upsert: try update first, then insert
	const existing = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
		.limit(1)

	if (existing.length > 0) {
		await db
			.update(subscriptions)
			.set(values)
			.where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
	} else {
		await db.insert(subscriptions).values({
			...values,
			createdAt: now,
		})
	}
}

export async function getBillingPlans(
	db: Db,
	options?: { status?: BillingPlanStatus },
) {
	if (options?.status) {
		return db
			.select()
			.from(billingPlans)
			.where(eq(billingPlans.status, options.status))
			.orderBy(billingPlans.sortOrder)
	}
	return db.select().from(billingPlans).orderBy(billingPlans.sortOrder)
}

export async function getBillingPlanBySlug(db: Db, slug: string) {
	const result = await db
		.select()
		.from(billingPlans)
		.where(eq(billingPlans.slug, slug))
		.limit(1)
	return result[0] ?? null
}
