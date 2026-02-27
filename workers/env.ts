import * as z from 'zod'

/**
 * Central Zod schema for all Worker bindings and environment variables.
 * When a new facet introduces an env dependency, add it here.
 */
export const envSchema = z.object({
	// Core
	ENVIRONMENT: z.enum(['development', 'production']),
	DB: z.custom<D1Database>((val) => val != null, 'DB binding is required'),

	// Rate limiting — KV namespace for sliding window counters
	RATE_LIMIT_KV: z.custom<KVNamespace>(
		(val) => val != null,
		'RATE_LIMIT_KV binding is required',
	),
	DISABLE_RATE_LIMITING: z.string().default(''),

	// Analytics — omit or set to empty string to disable tracking
	PLAUSIBLE_DOMAIN: z.string().default(''),
	PLAUSIBLE_HOST: z.string().default(''),

	// Auth sessions — set in .dev.vars (local) and wrangler secret (production)
	SESSION_SECRET: z.string().min(32),

	// Email — set RESEND_API_KEY via `wrangler secret put RESEND_API_KEY`
	// Omit or leave empty in development to log emails to console instead.
	RESEND_API_KEY: z.string().default(''),
	FROM_EMAIL: z.string().default('Seed Vault <onboarding@resend.dev>'),

	// WebAuthn — passkey relying party configuration
	RP_ID: z.string().default('localhost'), // e.g., 'example.com'
	RP_NAME: z.string().default('Seed Vault'),
	RP_ORIGIN: z.string().default('http://localhost:5173'), // e.g., 'https://example.com'

	// OAuth — Google
	GOOGLE_CLIENT_ID: z.string().default(''),
	GOOGLE_CLIENT_SECRET: z.string().default(''),

	// OAuth — GitHub
	GITHUB_CLIENT_ID: z.string().default(''),
	GITHUB_CLIENT_SECRET: z.string().default(''),
})

export type ValidatedEnv = z.infer<typeof envSchema>

export function validateEnv(env: Env): ValidatedEnv {
	const result = envSchema.safeParse(env)
	if (!result.success) {
		const issues = result.error.issues
			.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('\n')
		throw new Error(`Invalid Worker environment:\n${issues}`)
	}
	return result.data
}
