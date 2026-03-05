import type { RouterContext } from 'react-router'
import { subscriptionContext } from './subscription-context'
import type { WorkspacePlan } from './subscription-context'

const PLAN_RANK: Record<string, number> = {
	free: 0,
	pro: 1,
	enterprise: 2,
}

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

export function requirePlan(
	context: ContextReader,
	minimumSlug: string,
): WorkspacePlan {
	const plan = context.get(subscriptionContext)
	if (!plan) throw new Response('No billing plan configured', { status: 500 })
	const currentRank = PLAN_RANK[plan.slug] ?? -1
	const requiredRank = PLAN_RANK[minimumSlug] ?? 0
	if (currentRank < requiredRank) {
		throw new Response('Plan upgrade required', { status: 403 })
	}
	return plan
}
