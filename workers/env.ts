import * as z from 'zod'

/**
 * Central Zod schema for all Worker bindings and environment variables.
 * When a new facet introduces an env dependency, add it here.
 */
export const envSchema = z.object({
	// Core
	ENVIRONMENT: z.enum(['development', 'production']),
	DB: z.custom<D1Database>((val) => val != null, 'DB binding is required'),

	// Analytics — omit or set to empty string to disable tracking
	PLAUSIBLE_DOMAIN: z.string().default(''),
	PLAUSIBLE_HOST: z.string().default(''),
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
