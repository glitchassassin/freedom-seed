import { Form, Outlet, redirect } from 'react-router'
import type { Route } from './+types/_layout'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { getOptionalUser } from '~/utils/session-context'

export async function loader({ request, context }: Route.LoaderArgs) {
	const user = getOptionalUser(context)
	if (!user) {
		const url = new URL(request.url)
		throw redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`)
	}
	return { emailVerified: !!user.emailVerifiedAt }
}

export default function AuthenticatedLayout({
	loaderData,
}: Route.ComponentProps) {
	const { emailVerified } = loaderData

	return (
		<>
			<header className="border-b px-4 py-2">
				<div className="mx-auto flex max-w-4xl justify-end">
					<Form method="POST" action="/resources/logout">
						<CsrfInput />
						<Button variant="ghost" size="sm">
							Sign out
						</Button>
					</Form>
				</div>
			</header>
			{!emailVerified && (
				<section
					aria-label="Email verification notice"
					className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30"
				>
					<div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
						<p className="text-sm text-amber-800 dark:text-amber-200">
							Please verify your email address to access all features.
						</p>
						<Form method="POST" action="/resources/resend-verification">
							<CsrfInput />
							<Button variant="outline" size="sm">
								Resend verification email
							</Button>
						</Form>
					</div>
				</section>
			)}
			<Outlet />
		</>
	)
}
