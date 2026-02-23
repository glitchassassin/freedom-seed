import { Outlet, redirect } from 'react-router'
import type { Route } from './+types/_layout'
import { getOptionalUser } from '~/utils/session-context'

export async function loader({ context }: Route.LoaderArgs) {
	const user = getOptionalUser(context)
	if (user) throw redirect('/')
	return null
}

export default function AuthLayout() {
	return (
		<main className="bg-background flex min-h-svh items-center justify-center p-4">
			<div className="w-full max-w-sm">
				<Outlet />
			</div>
		</main>
	)
}
