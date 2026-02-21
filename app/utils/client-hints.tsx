/**
 * Utilities for reading client hints — browser capabilities the server needs
 * but only the browser knows. Currently used for timezone detection.
 *
 * On first visit the cookie is absent, so the server falls back to UTC and the
 * inline script sets the real timezone cookie and reloads the page. Subsequent
 * requests arrive with the correct cookie and render in the user's timezone
 * without hydration mismatches.
 */
import { getHintUtils } from '@epic-web/client-hints'
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone'
import { useRouteLoaderData } from 'react-router'
import type { loader as rootLoader } from '~/root'

const hintsUtils = getHintUtils({ timeZone: timeZoneHint })

export const { getHints } = hintsUtils

/**
 * Returns the current client hints from the root loader data.
 * Must be called inside a component rendered within the router context.
 */
export function useHints() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	if (!data)
		throw new Error(
			'useHints must be used within a route with root loader data',
		)
	return data.hints
}

/**
 * Inline `<script>` that runs immediately in `<head>`. It reads the browser's
 * timezone, compares it to the existing cookie, and reloads if they differ so
 * the server can re-render with the correct timezone.
 *
 * Place this inside `<head>` before any other scripts.
 * Pass `nonce` when a Content-Security-Policy is in effect.
 */
export function ClientHintCheck({ nonce }: { nonce?: string } = {}) {
	return (
		<script
			nonce={nonce}
			dangerouslySetInnerHTML={{
				__html: hintsUtils.getClientHintCheckScript(),
			}}
		/>
	)
}
