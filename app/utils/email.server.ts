import { render } from '@react-email/render'
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import type { ValidatedEnv } from '../../workers/env'

interface SendEmailOptions {
	to: string | string[]
	subject: string
	react: ReactElement
}

type EmailEnv = Pick<ValidatedEnv, 'RESEND_API_KEY' | 'FROM_EMAIL'>

/**
 * Send a transactional email via Resend.
 * When RESEND_API_KEY is empty (local dev), logs the email to console instead.
 */
export async function sendEmail(
	env: EmailEnv,
	{ to, subject, react }: SendEmailOptions,
) {
	const html = await render(react)
	const text = await render(react, { plainText: true })

	if (!env.RESEND_API_KEY) {
		console.log(
			`[email] (dev mode — not sent)\n  To: ${Array.isArray(to) ? to.join(', ') : to}\n  Subject: ${subject}\n  Text:\n${text}`,
		)
		return { id: 'dev-' + Date.now() }
	}

	const resend = new Resend(env.RESEND_API_KEY)
	const { data, error } = await resend.emails.send({
		from: env.FROM_EMAIL,
		to: Array.isArray(to) ? to : [to],
		subject,
		html,
		text,
	})

	if (error) {
		throw new Error(`Failed to send email: ${error.message}`)
	}

	if (!data) {
		throw new Error('Failed to send email: no data returned from Resend')
	}

	return { id: data.id }
}
