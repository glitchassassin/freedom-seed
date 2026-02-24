import { unlinkSync } from 'node:fs'
import { stop, CAPTURED_EMAILS_PATH } from './mocks/resend-server'

export default async function globalTeardown() {
	await stop()
	try {
		unlinkSync(CAPTURED_EMAILS_PATH)
	} catch {
		// File may not exist
	}
}
