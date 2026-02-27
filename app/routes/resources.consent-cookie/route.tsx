import { parseWithZod } from '@conform-to/zod/v4'
import { redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import type { ConsentState } from '~/utils/consent.server'
import { setConsentCookie } from '~/utils/consent.server'
import { safeRedirect } from '~/utils/safe-redirect'

const schema = z.object({
	intent: z.enum(['granted', 'denied']),
	returnTo: z.string().default('/'),
})

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	const intent: ConsentState =
		submission.status === 'success' ? submission.value.intent : 'denied'
	const returnTo =
		submission.status === 'success'
			? safeRedirect(submission.value.returnTo)
			: '/'

	return redirect(returnTo, {
		headers: { 'set-cookie': setConsentCookie(intent, isSecure) },
	})
}

export async function loader() {
	return redirect('/')
}
