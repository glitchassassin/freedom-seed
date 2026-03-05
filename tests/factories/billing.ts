import { generateId, openD1 } from './db'

interface CreateBillingPlanOptions {
	slug?: string
	name?: string
	stripePriceIdMonthly?: string | null
	stripePriceIdYearly?: string | null
	seatLimit?: number
	trialDays?: number
	features?: Record<string, boolean>
	status?: 'active' | 'deprecated'
	sortOrder?: number
}

export function createBillingPlan(options: CreateBillingPlanOptions = {}) {
	const id = generateId()
	const slug = options.slug ?? `plan-${id.slice(0, 6)}`
	const name = options.name ?? slug
	const now = Date.now()

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO billing_plans (id, slug, name, stripe_price_id_monthly, stripe_price_id_yearly, seat_limit, trial_days, features, status, sort_order, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			id,
			slug,
			name,
			options.stripePriceIdMonthly ?? null,
			options.stripePriceIdYearly ?? null,
			options.seatLimit ?? 0,
			options.trialDays ?? 0,
			JSON.stringify(options.features ?? {}),
			options.status ?? 'active',
			options.sortOrder ?? 0,
			now,
			now,
		)
	} finally {
		db.close()
	}

	return { id, slug, name }
}

interface CreateSubscriptionOptions {
	workspaceId: string
	billingPlanId: string
	stripeSubscriptionId?: string
	stripePriceId?: string
	status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
	quantity?: number
}

export function createSubscription(options: CreateSubscriptionOptions) {
	const id = generateId()
	const now = Date.now()
	const periodEnd = now + 30 * 24 * 60 * 60 * 1000 // 30 days from now

	const db = openD1()
	try {
		db.prepare(
			`INSERT INTO subscriptions (id, workspace_id, billing_plan_id, stripe_subscription_id, stripe_price_id, status, quantity, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
		).run(
			id,
			options.workspaceId,
			options.billingPlanId,
			options.stripeSubscriptionId ?? `sub_test_${id.slice(0, 8)}`,
			options.stripePriceId ?? `price_test_${id.slice(0, 8)}`,
			options.status ?? 'active',
			options.quantity ?? 1,
			now,
			periodEnd,
			now,
			now,
		)
	} finally {
		db.close()
	}

	return { id }
}
