import { Form, useLocation } from 'react-router'
import { Button } from './ui/button'

/**
 * Sticky banner shown to users who have not yet expressed a cookie consent
 * preference. Submits to /resources/consent-cookie which sets the persistent
 * preference cookie and redirects back to the current page.
 */
export function CookieConsentBanner() {
	const location = useLocation()
	const returnTo = location.pathname + location.search

	return (
		<div
			role="dialog"
			aria-label="Cookie consent"
			aria-modal="false"
			className="bg-background fixed right-0 bottom-0 left-0 z-50 border-t p-4 shadow-lg"
		>
			<div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground text-sm">
					We use analytics cookies to understand how visitors use this site. You
					can opt out at any time.{' '}
					<a href="/privacy" className="hover:text-foreground underline">
						Privacy policy
					</a>
				</p>
				<Form
					method="POST"
					action="/resources/consent-cookie"
					className="flex shrink-0 gap-2"
				>
					<input type="hidden" name="returnTo" value={returnTo} />
					<Button
						type="submit"
						name="intent"
						value="denied"
						variant="outline"
						size="sm"
					>
						Decline
					</Button>
					<Button type="submit" name="intent" value="granted" size="sm">
						Accept
					</Button>
				</Form>
			</div>
		</div>
	)
}
