import { createRequestHandler } from 'react-router'
import { validateEnv } from './env'
import type { ValidatedEnv } from './env'

declare module 'react-router' {
	export interface AppLoadContext {
		cloudflare: {
			env: ValidatedEnv
			ctx: ExecutionContext
		}
	}
}

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
)

// Validated once per cold start; throws immediately on misconfiguration.
let validatedEnv: ValidatedEnv | null = null

export default {
	async fetch(request, env, ctx) {
		if (!validatedEnv) {
			validatedEnv = validateEnv(env)
		}

		const url = new URL(request.url)
		const isDevelopment = validatedEnv.ENVIRONMENT === 'development'

		// Force HTTPS - redirect HTTP to HTTPS (except in development)
		if (url.protocol === 'http:' && !isDevelopment) {
			url.protocol = 'https:'
			return Response.redirect(url.toString(), 301)
		}

		const response = await requestHandler(request, {
			cloudflare: { env: validatedEnv, ctx },
		})

		// Add HSTS header for HTTPS-only enforcement (except in development)
		const headers = new Headers(response.headers)
		if (!isDevelopment) {
			headers.set(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains; preload',
			)
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	},
} satisfies ExportedHandler<Env>
