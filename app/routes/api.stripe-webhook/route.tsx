import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import type { Route } from './+types/route'
import { logAuditEvent } from '~/db/audit-log.server'
import { getDb } from '~/db/client.server'
import { workspaces } from '~/db/schema'
import { PaymentFailedEmail } from '~/emails/payment-failed'
import { syncSubscriptionFromStripe } from '~/utils/billing/billing.server'
import { getStripe } from '~/utils/billing/stripe.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { sendEmail } from '~/utils/email.server'

export async function action({ request, context }: Route.ActionArgs) {
	const { env, ctx } = getCloudflare(context)
	const stripe = getStripe(env)
	const db = getDb(env)

	const body = await request.text()
	const signature = request.headers.get('stripe-signature')

	// In test environments, skip signature verification if webhook secret is empty
	let event: Stripe.Event
	if (env.STRIPE_WEBHOOK_SECRET) {
		if (!signature) {
			return new Response('Missing stripe-signature header', { status: 400 })
		}
		try {
			event = await stripe.webhooks.constructEventAsync(
				body,
				signature,
				env.STRIPE_WEBHOOK_SECRET,
			)
		} catch {
			return new Response('Invalid signature', { status: 400 })
		}
	} else {
		// No webhook secret (test environment) — parse body directly
		try {
			event = JSON.parse(body) as Stripe.Event
		} catch {
			return new Response('Invalid JSON', { status: 400 })
		}
	}

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object
			if (session.subscription && session.metadata?.workspaceId) {
				const subscription = await stripe.subscriptions.retrieve(
					typeof session.subscription === 'string'
						? session.subscription
						: session.subscription.id,
				)
				// Ensure the workspaceId metadata is set on the subscription
				if (!subscription.metadata.workspaceId) {
					await stripe.subscriptions.update(subscription.id, {
						metadata: { workspaceId: session.metadata.workspaceId },
					})
					subscription.metadata.workspaceId = session.metadata.workspaceId
				}
				await syncSubscriptionFromStripe(db, subscription)

				// Log audit event
				const workspaceId = session.metadata.workspaceId
				ctx.waitUntil(
					logAuditEvent({
						db,
						workspaceId,
						actorId: 'system',
						actorEmail: 'stripe-webhook',
						action: 'subscription.created',
						targetType: 'subscription',
						targetId: subscription.id,
					}),
				)
			}
			break
		}

		case 'customer.subscription.updated': {
			const subscription = event.data.object
			if (subscription.metadata?.workspaceId) {
				await syncSubscriptionFromStripe(db, subscription)
			}
			break
		}

		case 'customer.subscription.deleted': {
			const subscription = event.data.object
			if (subscription.metadata?.workspaceId) {
				// Force status to canceled
				subscription.status = 'canceled'
				await syncSubscriptionFromStripe(db, subscription)

				ctx.waitUntil(
					logAuditEvent({
						db,
						workspaceId: subscription.metadata.workspaceId,
						actorId: 'system',
						actorEmail: 'stripe-webhook',
						action: 'subscription.cancelled',
						targetType: 'subscription',
						targetId: subscription.id,
					}),
				)
			}
			break
		}

		case 'invoice.payment_failed': {
			const invoice = event.data.object
			const rawSub = invoice.parent?.subscription_details?.subscription
			const subscriptionId = typeof rawSub === 'string' ? rawSub : rawSub?.id
			if (subscriptionId) {
				const subscription = await stripe.subscriptions.retrieve(subscriptionId)
				if (subscription.metadata?.workspaceId) {
					subscription.status = 'past_due'
					await syncSubscriptionFromStripe(db, subscription)

					const workspaceId = subscription.metadata.workspaceId
					// Send payment failed email
					const workspace = await db
						.select()
						.from(workspaces)
						.where(eq(workspaces.id, workspaceId))
						.limit(1)
					if (workspace[0]) {
						ctx.waitUntil(
							Promise.all([
								logAuditEvent({
									db,
									workspaceId,
									actorId: 'system',
									actorEmail: 'stripe-webhook',
									action: 'subscription.payment_failed',
									targetType: 'subscription',
									targetId: subscription.id,
								}),
								sendEmail(env, {
									to: invoice.customer_email ?? '',
									subject: `Payment failed for ${workspace[0].name}`,
									react: PaymentFailedEmail({
										workspaceName: workspace[0].name,
										billingUrl: `/workspaces/${workspaceId}/settings/billing`,
									}),
								}).catch(() => {
									// Don't fail the webhook if email fails
								}),
							]),
						)
					}
				}
			}
			break
		}

		case 'invoice.payment_succeeded': {
			const invoice = event.data.object
			const rawSub = invoice.parent?.subscription_details?.subscription
			const subscriptionId = typeof rawSub === 'string' ? rawSub : rawSub?.id
			if (subscriptionId) {
				const subscription = await stripe.subscriptions.retrieve(subscriptionId)
				if (subscription.metadata?.workspaceId) {
					await syncSubscriptionFromStripe(db, subscription)
				}
			}
			break
		}
	}

	return new Response('ok', { status: 200 })
}
