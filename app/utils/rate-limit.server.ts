/**
 * Sliding window rate limiter using Cloudflare KV.
 * Each key stores a JSON array of timestamps (epoch ms) within the window.
 *
 * IMPORTANT: KV is eventually consistent. Under high concurrency from the
 * same IP, a small number of excess requests may slip through due to the
 * non-atomic read-modify-write cycle. This is acceptable for throttling
 * (defense in depth) but should not be the sole protection against brute
 * force — pair with account lockout or Durable Objects for hard limits.
 */

interface RateLimitConfig {
	/** KV namespace binding */
	kv: KVNamespace
	/** Unique prefix for this limit (e.g. 'login', 'signup') */
	prefix: string
	/** Maximum requests allowed in the window */
	limit: number
	/** Window size in seconds */
	windowSeconds: number
}

interface RateLimitResult {
	allowed: boolean
	remaining: number
	/** Seconds until the oldest entry expires (only set when blocked) */
	retryAfter: number | null
}

/**
 * Check and record a rate limit hit.
 * `key` is typically the client IP address.
 */
export async function checkRateLimit(
	config: RateLimitConfig,
	key: string,
): Promise<RateLimitResult> {
	const { kv, prefix, limit, windowSeconds } = config
	const kvKey = `${prefix}:${key}`
	const now = Date.now()
	const windowMs = windowSeconds * 1000

	// Read current timestamps from KV
	const raw = await kv.get(kvKey)
	let timestamps: number[] = raw ? (JSON.parse(raw) as number[]) : []

	// Filter out entries older than the window
	timestamps = timestamps.filter((ts) => now - ts < windowMs)

	if (timestamps.length >= limit) {
		// Find when the oldest entry in the window will expire
		const oldest = Math.min(...timestamps)
		const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
		return { allowed: false, remaining: 0, retryAfter }
	}

	// Record this request
	timestamps.push(now)
	await kv.put(kvKey, JSON.stringify(timestamps), {
		expirationTtl: windowSeconds,
	})

	return {
		allowed: true,
		remaining: limit - timestamps.length,
		retryAfter: null,
	}
}
