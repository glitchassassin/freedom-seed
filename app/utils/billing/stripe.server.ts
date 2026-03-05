import Stripe from 'stripe'
import type { ValidatedEnv } from '../../../workers/env'

export function getStripe(
	env: Pick<ValidatedEnv, 'STRIPE_SECRET_KEY'>,
): Stripe {
	return new Stripe(env.STRIPE_SECRET_KEY, {
		apiVersion: '2026-02-25.clover',
		...(typeof process !== 'undefined' && process.env?.STRIPE_BASE_URL
			? {
					host: new URL(process.env.STRIPE_BASE_URL).hostname,
					port: String(new URL(process.env.STRIPE_BASE_URL).port),
					protocol: 'http' as const,
				}
			: {}),
	})
}
