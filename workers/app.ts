import { createRequestHandler, RouterContextProvider } from 'react-router'
import { cloudflareContext } from '../app/utils/cloudflare-context'
import { validateEnv } from './env'

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
)

// Validated once per cold start; throws immediately on misconfiguration.
let validatedEnv: ReturnType<typeof validateEnv> | null = null

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

		const context = new RouterContextProvider()
		context.set(cloudflareContext, { env: validatedEnv, ctx })

		const response = await requestHandler(request, context)

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
