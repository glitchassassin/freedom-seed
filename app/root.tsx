import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router'

import type { Route } from './+types/root'
import './app.css'
import { useOptionalTheme } from './routes/resources/theme-switch/index'
import { ClientHintCheck, getHints } from './utils/client-hints'
import { getTheme } from './utils/theme.server'

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env
	const plausibleDomain = env.PLAUSIBLE_DOMAIN || null
	const rawHost = env.PLAUSIBLE_HOST || 'https://plausible.io'
	let plausibleHost = 'https://plausible.io'
	try {
		const url = new URL(rawHost)
		if (url.protocol === 'https:') plausibleHost = url.origin
	} catch {
		// Invalid URL — fall back to default
	}

	return {
		hints: getHints(request),
		userPrefs: { theme: getTheme(request) },
		plausibleDomain,
		plausibleHost,
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
				{/* TODO: pass nonce={nonce} once the security-headers facet adds CSP */}
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
	const { plausibleDomain, plausibleHost } = loaderData
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
		</>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = 'Oops!'
	let details = 'An unexpected error occurred.'
	let stack: string | undefined

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error'
		details =
			error.status === 404
				? 'The requested page could not be found.'
				: error.statusText || details
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message
		stack = error.stack
	}

	return (
		<main className="container mx-auto p-4 pt-16">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full overflow-x-auto p-4">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	)
}
