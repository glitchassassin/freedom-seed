/**
 * Utilities for reading client hints — browser capabilities the server needs
 * but only the browser knows. Used for timezone detection and color scheme
 * (system dark/light preference) detection.
 *
 * On first visit the cookies are absent, so the server falls back to defaults
 * and the inline script sets the correct cookies and reloads the page.
 * Subsequent requests arrive with the correct cookies and render without
 * hydration mismatches.
 */
import { getHintUtils } from '@epic-web/client-hints'
import {
	clientHint as colorSchemeHint,
	subscribeToSchemeChange,
} from '@epic-web/client-hints/color-scheme'
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone'
import * as React from 'react'
import { useRevalidator, useRouteLoaderData } from 'react-router'
import type { loader as rootLoader } from '~/root'

const hintsUtils = getHintUtils({
	theme: colorSchemeHint,
	timeZone: timeZoneHint,
})

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
 * Like useHints but returns undefined when root loader data is unavailable
 * (e.g. during error boundary rendering).
 */
export function useOptionalHints() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	return data?.hints
}

/**
 * Inline `<script>` that runs immediately in `<head>`. It reads the browser's
 * timezone and color scheme preference, compares them to existing cookies, and
 * reloads if they differ so the server can re-render with correct values.
 *
 * Also subscribes to OS-level color scheme changes and triggers a revalidation
 * so the UI updates without a full reload.
 *
 * Place this inside `<head>` before any other scripts.
 * Pass `nonce` when a Content-Security-Policy is in effect.
 */
export function ClientHintCheck({ nonce }: { nonce?: string } = {}) {
	const { revalidate } = useRevalidator()
	React.useEffect(
		() => subscribeToSchemeChange(() => revalidate()),
		[revalidate],
	)
	return (
		<script
			nonce={nonce}
			dangerouslySetInnerHTML={{
				__html: hintsUtils.getClientHintCheckScript(),
			}}
		/>
	)
}
