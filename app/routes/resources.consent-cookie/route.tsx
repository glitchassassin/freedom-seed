import { redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import { setConsentCookie } from '~/utils/consent.server'
import type { ConsentState } from '~/utils/consent.server'

const schema = z.object({
	intent: z.enum(['granted', 'denied']),
	returnTo: z.string().default('/'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'

	const formData = await request.formData()
	const parsed = schema.safeParse(Object.fromEntries(formData))
	const intent: ConsentState = parsed.success ? parsed.data.intent : 'denied'
	const returnTo =
		parsed.success && parsed.data.returnTo.startsWith('/')
			? parsed.data.returnTo
			: '/'

	return redirect(returnTo, {
		headers: { 'set-cookie': setConsentCookie(intent, isSecure) },
	})
}

export async function loader() {
	return redirect('/')
}
