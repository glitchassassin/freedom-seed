import { useEffect } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { toast } from 'sonner'

import type { Route } from './+types/root'
import './app.css'
import { GeneralErrorBoundary } from './components/error-boundary'
import { Toaster } from './components/ui/sonner'
import { useOptionalTheme } from './routes/resources/theme-switch/index'
import { ClientHintCheck, getHints } from './utils/client-hints'
import { getCloudflare } from './utils/cloudflare-context'
import { csrfContext } from './utils/csrf-context'
import {
	generateCsrfToken,
	makeCsrfCookie,
	validateCsrfToken,
} from './utils/csrf.server'
import { sessionContext } from './utils/session-context'
import { getSessionUser, makeSessionCookie } from './utils/session.server'
import { getTheme } from './utils/theme.server'
import { toastContext } from './utils/toast-context'
import { getToast } from './utils/toast.server'

export const middleware: Route.MiddlewareFunction[] = [
	// CSRF: generate token on GET/HEAD, validate on mutating methods
	async ({ request, context }, next) => {
		const { env } = getCloudflare(context)
		const isSecure = env.ENVIRONMENT === 'production'
		const method = request.method.toUpperCase()

		if (method !== 'GET' && method !== 'HEAD') {
			await validateCsrfToken(request, env.SESSION_SECRET, isSecure)
		}

		// Generate a fresh CSRF token for every response
		const { token, signedCookie } = await generateCsrfToken(env.SESSION_SECRET)
		context.set(csrfContext, token)
		const response = await next()
		response.headers.append(
			'set-cookie',
			makeCsrfCookie(signedCookie, isSecure),
		)
		return response
	},
	async ({ request, context }, next) => {
		const { env } = getCloudflare(context)
		const isSecure = env.ENVIRONMENT === 'production'
		const { toast: toastData, setCookieHeader } = getToast(request, isSecure)
		context.set(toastContext, toastData)
		const response = await next()
		// Only clear the toast cookie on non-redirect responses so the
		// flash message survives redirect chains (e.g. /verify-email → / → /teams/:id)
		const isRedirect = response.status >= 300 && response.status < 400
		if (setCookieHeader && !isRedirect) {
			response.headers.append('set-cookie', setCookieHeader)
		}
		return response
	},
	async ({ request, context }, next) => {
		const { env } = getCloudflare(context)
		const isSecure = env.ENVIRONMENT === 'production'
		const { user, signedToken } = await getSessionUser(request, env)
		context.set(sessionContext, user)
		const response = await next()
		// Re-issue the cookie on every valid request to slide the idle window,
		// but skip if the action already set/cleared the session cookie
		// (e.g. logout clears it, change-password issues a new one).
		if (user && signedToken) {
			const alreadySet = response.headers
				.getSetCookie()
				.some((c) => c.startsWith('en_session='))
			if (!alreadySet) {
				response.headers.append(
					'set-cookie',
					makeSessionCookie(signedToken, isSecure),
				)
			}
		}
		return response
	},
]

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const plausibleDomain = env.PLAUSIBLE_DOMAIN || null
	const rawHost = env.PLAUSIBLE_HOST || 'https://plausible.io'
	let plausibleHost = 'https://plausible.io'
	try {
		const url = new URL(rawHost)
		if (url.protocol === 'https:') plausibleHost = url.origin
	} catch {
		// Invalid URL — fall back to default
	}

	const toastData = context.get(toastContext)
	const csrfToken = context.get(csrfContext)
	return {
		hints: getHints(request),
		userPrefs: { theme: getTheme(request) },
		plausibleDomain,
		plausibleHost,
		toast: toastData,
		toastKey: toastData ? crypto.randomUUID() : null,
		csrfToken,
	}
}

export const links: Route.LinksFunction = () => [
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
	},
]

export function Layout({ children }: { children: React.ReactNode }) {
	const theme = useOptionalTheme()
	return (
		<html lang="en" className={theme === 'dark' ? 'dark' : ''}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				{/* TODO: pass nonce={nonce} once CSP migrates from 'unsafe-inline' to nonce-based policy */}
				<ClientHintCheck />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App({ loaderData }: Route.ComponentProps) {
	const {
		plausibleDomain,
		plausibleHost,
		toast: toastData,
		toastKey,
	} = loaderData

	useEffect(() => {
		if (!toastData || !toastKey) return
		toast[toastData.type](toastData.title, {
			id: toastKey,
			description: toastData.description,
		})
	}, [toastKey, toastData])

	return (
		<>
			{plausibleDomain && (
				<script
					defer
					data-domain={plausibleDomain}
					src={`${plausibleHost}/js/script.js`}
				/>
			)}
			<Outlet />
			<Toaster />
		</>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return <GeneralErrorBoundary error={error} className="pt-16" />
}
