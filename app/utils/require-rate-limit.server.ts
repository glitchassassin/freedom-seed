import { checkRateLimit } from './rate-limit.server'

/**
 * Throws a 429 Response if the rate limit is exceeded.
 * Call this at the top of sensitive action functions.
 */
export async function requireRateLimit(
	env: { RATE_LIMIT_KV: KVNamespace; DISABLE_RATE_LIMITING?: string },
	request: Request,
	options: { prefix: string; limit: number; windowSeconds: number },
): Promise<void> {
	if (env.DISABLE_RATE_LIMITING === 'true') return
	const ip =
		request.headers.get('CF-Connecting-IP') ??
		// Fallback for local development only; CF-Connecting-IP is always set in production.
		request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
		// 'unknown' groups all requests without IP headers into a single bucket.
		// This only occurs in local dev (CF-Connecting-IP is always set on Workers).
		'unknown'

	const result = await checkRateLimit(
		{
			kv: env.RATE_LIMIT_KV,
			prefix: options.prefix,
			limit: options.limit,
			windowSeconds: options.windowSeconds,
		},
		ip,
	)

	if (!result.allowed) {
		throw new Response('Too Many Requests', {
			status: 429,
			headers: { 'Retry-After': String(result.retryAfter) },
		})
	}
}
