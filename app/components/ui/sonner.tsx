import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'
import { useOptionalTheme } from '~/routes/resources/theme-switch/index'

/**
 * A theme-aware Toaster wrapper that syncs with the app's dark/light mode and
 * uses the project's OKLCH design tokens for toast colours.
 *
 * Render once at the root of your app:
 * ```tsx
 * <Toaster />
 * ```
 */
export function Toaster(props: ToasterProps) {
	const theme = useOptionalTheme()
	return (
		<Sonner
			theme={theme ?? 'light'}
			className="toaster group"
			style={
				{
					'--normal-bg': 'var(--popover)',
					'--normal-text': 'var(--popover-foreground)',
					'--normal-border': 'var(--border)',
				} as React.CSSProperties
			}
			{...props}
		/>
	)
}
