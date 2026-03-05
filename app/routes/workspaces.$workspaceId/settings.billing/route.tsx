import { Form } from 'react-router'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { getDb } from '~/db/client.server'
import {
	getWorkspaceSubscription,
	getBillingPlans,
} from '~/utils/billing/billing.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireRole } from '~/utils/rbac.server'
import { requireWorkspaceMember } from '~/utils/workspace-context'

export async function loader({ params, context }: Route.LoaderArgs) {
	requireRole(context, 'admin')
	requireWorkspaceMember(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const workspaceId = params.workspaceId!

	const sub = await getWorkspaceSubscription(db, workspaceId)
	const plans = await getBillingPlans(db, { status: 'active' })

	return {
		workspaceId,
		currentPlan: sub?.plan ?? { slug: 'free', name: 'Free' },
		subscription: sub
			? {
					status: sub.subscription.status,
					currentPeriodEnd: sub.subscription.currentPeriodEnd.getTime(),
					cancelAtPeriodEnd: sub.subscription.cancelAtPeriodEnd,
				}
			: null,
		plans: plans.map((p) => ({
			slug: p.slug,
			name: p.name,
			stripePriceIdMonthly: p.stripePriceIdMonthly,
		})),
	}
}

export function meta() {
	return [{ title: 'Billing Settings' }]
}

export default function BillingSettings({ loaderData }: Route.ComponentProps) {
	const { workspaceId, currentPlan, subscription, plans } = loaderData

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">Billing</h1>

			<section className="mt-8">
				<h2 className="text-lg font-semibold">Current Plan</h2>
				<p className="text-muted-foreground mt-2">
					You are on the <strong>{currentPlan.name}</strong> plan.
				</p>
				{subscription && (
					<div className="text-muted-foreground mt-2 space-y-1 text-sm">
						<p>
							Status: <span className="capitalize">{subscription.status}</span>
						</p>
						<p>
							Next billing date:{' '}
							{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
						</p>
						{subscription.cancelAtPeriodEnd && (
							<p className="text-amber-600 dark:text-amber-400">
								Your subscription will be canceled at the end of the current
								billing period.
							</p>
						)}
					</div>
				)}
			</section>

			{currentPlan.slug === 'free' ? (
				<section className="mt-8">
					<h2 className="text-lg font-semibold">Upgrade</h2>
					<p className="text-muted-foreground mt-2 text-sm">
						Upgrade to unlock workspace collaboration and more features.
					</p>
					<div className="mt-4 flex gap-4">
						{plans
							.filter((p) => p.slug !== 'free' && p.stripePriceIdMonthly)
							.map((plan) => (
								<Form
									key={plan.slug}
									method="POST"
									action="/resources/billing/checkout"
								>
									<input type="hidden" name="workspaceId" value={workspaceId} />
									<input type="hidden" name="planSlug" value={plan.slug} />
									<input type="hidden" name="interval" value="monthly" />
									<Button type="submit">Upgrade to {plan.name}</Button>
								</Form>
							))}
					</div>
				</section>
			) : (
				<section className="mt-8">
					<h2 className="text-lg font-semibold">Manage Subscription</h2>
					<p className="text-muted-foreground mt-2 text-sm">
						Change your plan, update payment method, or cancel.
					</p>
					<Form
						method="POST"
						action="/resources/billing/portal"
						className="mt-4"
					>
						<input type="hidden" name="workspaceId" value={workspaceId} />
						<Button type="submit" variant="outline">
							Manage billing
						</Button>
					</Form>
				</section>
			)}
		</main>
	)
}
