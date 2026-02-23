import { Outlet, redirect } from 'react-router'
import type { Route } from './+types/_layout'
import { getOptionalUser } from '~/utils/session-context'

export async function loader({ request, context }: Route.LoaderArgs) {
	const user = getOptionalUser(context)
	if (!user) {
		const url = new URL(request.url)
		throw redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`)
	}
	return null
}

export default function AuthenticatedLayout() {
	return <Outlet />
}
