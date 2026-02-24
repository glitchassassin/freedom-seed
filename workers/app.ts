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

		const headers = new Headers(response.headers)

		// --- Production-only headers ---

		// HSTS: enforce HTTPS for all future visits
		if (!isDevelopment) {
			headers.set(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains; preload',
			)
		}

		// --- Security headers (all environments) ---

		// Build Content-Security-Policy
		// TODO: Switch from 'unsafe-inline' in script-src to nonce-based CSP
		// once the app's inline client-hint scripts are refactored.
		const plausibleDomain = validatedEnv.PLAUSIBLE_DOMAIN || ''
		let plausibleOrigin = ''
		if (plausibleDomain) {
			const rawHost = validatedEnv.PLAUSIBLE_HOST || 'https://plausible.io'
			try {
				const hostUrl = new URL(rawHost)
				if (hostUrl.protocol === 'https:') {
					plausibleOrigin = hostUrl.origin
				}
			} catch {
				plausibleOrigin = 'https://plausible.io'
			}
		}

		const scriptSrc = plausibleOrigin
			? `'self' 'unsafe-inline' ${plausibleOrigin}`
			: `'self' 'unsafe-inline'`
		const connectSrc = plausibleOrigin ? `'self' ${plausibleOrigin}` : `'self'`

		const csp = [
			`default-src 'self'`,
			`script-src ${scriptSrc}`,
			`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
			`font-src 'self' https://fonts.gstatic.com`,
			`img-src 'self' data:`,
			`connect-src ${connectSrc}`,
			`frame-ancestors 'none'`,
			`form-action 'self'`,
			`base-uri 'self'`,
		].join('; ')

		headers.set('Content-Security-Policy', csp)
		headers.set('X-Frame-Options', 'DENY')
		headers.set('X-Content-Type-Options', 'nosniff')
		headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
		headers.set(
			'Permissions-Policy',
			'camera=(), microphone=(), geolocation=(), payment=()',
		)

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	},
} satisfies ExportedHandler<Env>
