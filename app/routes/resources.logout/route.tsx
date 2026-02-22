import { redirect } from 'react-router'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	clearSessionCookie,
	deleteSession,
	getSessionUser,
} from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const { token } = await getSessionUser(request, env)
	if (token) await deleteSession(env, token)

	return redirect('/', {
		headers: [
			['set-cookie', clearSessionCookie()],
			['set-cookie', setToast({ type: 'success', title: 'Signed out' })],
		],
	})
}

// GET requests redirect to home (in case someone navigates directly)
export async function loader() {
	return redirect('/')
}
