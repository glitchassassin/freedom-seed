import { redirect } from 'react-router'
import type { Route } from './+types/route'
import { VerifyEmail } from '~/emails/verify-email'
import { getCloudflare } from '~/utils/cloudflare-context'
import { createEmailVerificationToken } from '~/utils/email-verification.server'
import { sendEmail } from '~/utils/email.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { requireUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'

export async function action({ request, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)

	await requireRateLimit(env, request, {
		prefix: 'resend-verify',
		limit: 3,
		windowSeconds: 300,
	})

	// Already verified — nothing to do
	if (user.emailVerifiedAt) {
		return redirect('/', {
			headers: {
				'set-cookie': setToast({
					type: 'info',
					title: 'Email already verified',
				}),
			},
		})
	}

	const token = await createEmailVerificationToken(env, user.id)
	const verifyUrl = `${new URL(request.url).origin}/verify-email?token=${token}`
	await sendEmail(env, {
		to: user.email,
		subject: 'Verify your email — Seed Vault',
		react: VerifyEmail({ verifyUrl }),
	})

	const referrer = request.headers.get('referer')
	let pathname = '/'
	if (referrer) {
		try {
			pathname = new URL(referrer).pathname
		} catch {
			// malformed Referer — fall back to root
		}
	}
	const redirectTo =
		pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/'

	return redirect(redirectTo, {
		headers: {
			'set-cookie': setToast({
				type: 'success',
				title: 'Verification email sent',
			}),
		},
	})
}
