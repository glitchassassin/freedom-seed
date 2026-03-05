import { unlinkSync } from 'node:fs'
import { stop, CAPTURED_EMAILS_PATH } from './mocks/resend-server'
import {
	stop as stopStripe,
	CAPTURED_STRIPE_PATH as CAPTURED_STRIPE,
} from './mocks/stripe-server'

export default async function globalTeardown() {
	await stop()
	try {
		unlinkSync(CAPTURED_EMAILS_PATH)
	} catch {
		// File may not exist
	}
	await stopStripe()
	try {
		unlinkSync(CAPTURED_STRIPE)
	} catch {
		// File may not exist
	}
}
