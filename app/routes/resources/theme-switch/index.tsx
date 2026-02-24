import { data, useFetcher, useFetchers, useRouteLoaderData } from 'react-router'
import type { Route } from './+types/index'
import { CsrfInput } from '~/components/csrf-input'
import type { loader as rootLoader } from '~/root'
import { useOptionalHints } from '~/utils/client-hints'
import { getCloudflare } from '~/utils/cloudflare-context'
import { setTheme } from '~/utils/theme.server'
import type { Theme } from '~/utils/theme.server'

type ThemeMode = Theme | 'system'
const validThemes: ThemeMode[] = ['system', 'light', 'dark']

function isThemeMode(value: unknown): value is ThemeMode {
	return typeof value === 'string' && (validThemes as string[]).includes(value)
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const formData = await request.formData()
	const theme = formData.get('theme')
	if (!isThemeMode(theme)) {
		return data({ error: 'Invalid theme' }, { status: 400 })
	}
	return data(
		{ ok: true },
		{ headers: { 'set-cookie': setTheme(theme, isSecure) } },
	)
}

/**
 * If the user is currently toggling the theme, returns the value it's being
 * changed to so the UI can update optimistically before the server responds.
 */
export function useOptimisticThemeMode(): ThemeMode | undefined {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(
		(f) => f.formAction === '/resources/theme-switch',
	)
	if (themeFetcher?.formData) {
		const theme = themeFetcher.formData.get('theme')
		if (isThemeMode(theme)) return theme
	}
}

/**
 * Returns the effective theme ('light' | 'dark'), resolving in order:
 * optimistic update → explicit user preference → system hint → 'light'.
 */
export function useTheme(): Theme {
	const hints = useOptionalHints()
	const loaderData = useRouteLoaderData<typeof rootLoader>('root')
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system'
			? (hints?.theme ?? 'light')
			: optimisticMode
	}
	return loaderData?.userPrefs?.theme ?? hints?.theme ?? 'light'
}

/**
 * Like useTheme but safe to call when root loader data may be absent (e.g.
 * during error boundary rendering). Returns undefined in that case.
 */
export function useOptionalTheme(): Theme | undefined {
	const hints = useOptionalHints()
	const loaderData = useRouteLoaderData<typeof rootLoader>('root')
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints?.theme : optimisticMode
	}
	return loaderData?.userPrefs?.theme ?? hints?.theme
}

const modeLabels: Record<ThemeMode, string> = {
	light: 'Switch to dark mode',
	dark: 'Switch to system theme',
	system: 'Switch to light mode',
}

const modeIcons: Record<ThemeMode, React.ReactNode> = {
	light: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
		</svg>
	),
	dark: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	),
	system: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect width="20" height="14" x="2" y="3" rx="2" />
			<path d="M8 21h8M12 17v4" />
		</svg>
	),
}

/**
 * A toggle button that cycles through light → dark → system.
 * Submits to the /resources/theme-switch action via a fetcher (no page reload).
 */
export function ThemeSwitch({
	userPreference,
}: {
	userPreference?: Theme | null
}) {
	const fetcher = useFetcher<typeof action>()
	const optimisticMode = useOptimisticThemeMode()
	const mode: ThemeMode = optimisticMode ?? userPreference ?? 'system'
	const nextMode: ThemeMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'

	return (
		<fetcher.Form method="POST" action="/resources/theme-switch">
			<CsrfInput />
			<input type="hidden" name="theme" value={nextMode} />
			<button
				type="submit"
				className="flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
				title={modeLabels[mode]}
				aria-label={modeLabels[mode]}
			>
				{modeIcons[mode]}
			</button>
		</fetcher.Form>
	)
}
