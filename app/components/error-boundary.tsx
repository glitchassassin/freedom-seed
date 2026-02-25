import { isRouteErrorResponse, Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { cn } from '~/utils/cn'

export function GeneralErrorBoundary({
	error,
	className,
}: {
	error: unknown
	className?: string
}) {
	if (isRouteErrorResponse(error) && error.status === 403) {
		return (
			<main className={cn('mx-auto max-w-4xl p-6', className)}>
				<h1 className="text-2xl font-semibold">Access Denied</h1>
				<p className="text-muted-foreground mt-2">
					You don&apos;t have permission to view this page.
				</p>
				<Button asChild className="mt-4" variant="outline">
					<Link to="/">Back to home</Link>
				</Button>
			</main>
		)
	}

	if (isRouteErrorResponse(error) && error.status === 404) {
		return (
			<main className={cn('mx-auto max-w-4xl p-6', className)}>
				<h1 className="text-2xl font-semibold">404</h1>
				<p className="text-muted-foreground mt-2">
					The requested page could not be found.
				</p>
				<Button asChild className="mt-4" variant="outline">
					<Link to="/">Back to home</Link>
				</Button>
			</main>
		)
	}

	if (isRouteErrorResponse(error)) {
		return (
			<main className={cn('mx-auto max-w-4xl p-6', className)}>
				<h1 className="text-2xl font-semibold">Error</h1>
				<p className="text-muted-foreground mt-2">
					{error.statusText || 'An unexpected error occurred.'}
				</p>
				<Button asChild className="mt-4" variant="outline">
					<Link to="/">Back to home</Link>
				</Button>
			</main>
		)
	}

	return (
		<main className={cn('mx-auto max-w-4xl p-6', className)}>
			<h1 className="text-2xl font-semibold">Something went wrong</h1>
			<p className="text-muted-foreground mt-2">
				{import.meta.env.DEV && error instanceof Error
					? error.message
					: 'An unexpected error occurred.'}
			</p>
			{import.meta.env.DEV && error instanceof Error && error.stack && (
				<pre className="mt-4 w-full overflow-x-auto p-4">
					<code>{error.stack}</code>
				</pre>
			)}
			<Button asChild className="mt-4" variant="outline">
				<Link to="/">Back to home</Link>
			</Button>
		</main>
	)
}
