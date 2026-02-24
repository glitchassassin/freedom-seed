import { readFileSync, writeFileSync } from 'node:fs'
import { CAPTURED_EMAILS_PATH } from './mocks/resend-server'

export interface CapturedEmail {
	id: string
	from: string
	to: string[]
	subject: string
	html: string
	text: string
	created_at: string
}

/**
 * Reads all captured emails and returns the most recent one matching the recipient.
 */
export function readEmail(recipient: string): CapturedEmail | null {
	let content: string
	try {
		content = readFileSync(CAPTURED_EMAILS_PATH, 'utf-8')
	} catch {
		return null
	}
	const lines = content.trim().split('\n').filter(Boolean)
	// Search from most recent
	for (let i = lines.length - 1; i >= 0; i--) {
		try {
			const email: CapturedEmail = JSON.parse(lines[i])
			if (email.to.includes(recipient)) {
				return email
			}
		} catch {
			// Skip malformed lines
			continue
		}
	}
	return null
}

/**
 * Polls for a captured email matching the recipient with configurable timeout.
 */
export async function waitForEmail(
	recipient: string,
	opts?: { timeout?: number; interval?: number },
): Promise<CapturedEmail> {
	const timeout = opts?.timeout ?? 5000
	const interval = opts?.interval ?? 100
	const start = Date.now()
	while (Date.now() - start < timeout) {
		const email = readEmail(recipient)
		if (email) return email
		await new Promise((r) => setTimeout(r, interval))
	}
	throw new Error(`No email captured for ${recipient} within ${timeout}ms`)
}

/**
 * Clears all captured emails.
 */
export function clearCapturedEmails(): void {
	writeFileSync(CAPTURED_EMAILS_PATH, '')
}
