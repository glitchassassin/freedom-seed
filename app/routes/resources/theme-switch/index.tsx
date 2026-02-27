import { parseWithZod } from '@conform-to/zod/v4'
import { data, useFetcher, useFetchers, useRouteLoaderData } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/index'
import { Icon } from '~/components/ui/icon'
import type { loader as rootLoader } from '~/root'
import { useOptionalHints } from '~/utils/client-hints'
import { getCloudflare } from '~/utils/cloudflare-context'
import { setTheme } from '~/utils/theme.server'
import type { Theme } from '~/utils/theme.server'

const themeValues = ['system', 'light', 'dark'] as const
type ThemeMode = (typeof themeValues)[number]

function isThemeMode(value: unknown): value is ThemeMode {
	return (
		typeof value === 'string' &&
		(themeValues as readonly string[]).includes(value)
	)
}

const themeSchema = z.object({ theme: z.enum(themeValues) })

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: themeSchema })
	if (submission.status !== 'success') {
		return data({ error: 'Invalid theme' }, { status: 400 })
	}
	const { theme } = submission.value
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
	light: <Icon name="lucide--sun" size="md" aria-hidden="true" />,
	dark: <Icon name="lucide--moon" size="md" aria-hidden="true" />,
	system: <Icon name="lucide--monitor" size="md" aria-hidden="true" />,
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
