import { readFileSync } from 'node:fs'
import { CAPTURED_STRIPE_PATH } from './mocks/stripe-server'

interface CapturedRequest {
	method: string
	url: string
	body: string
	timestamp: string
}

export async function waitForStripeRequest(
	method: string,
	path: string,
	timeoutMs = 5000,
): Promise<CapturedRequest> {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		try {
			const content = readFileSync(CAPTURED_STRIPE_PATH, 'utf-8')
			const lines = content.trim().split('\n').filter(Boolean)
			for (const line of lines) {
				const req = JSON.parse(line) as CapturedRequest
				if (req.method === method && req.url === path) {
					return req
				}
			}
		} catch {
			// File may not exist yet
		}
		await new Promise((r) => setTimeout(r, 100))
	}
	throw new Error(`Timed out waiting for Stripe request: ${method} ${path}`)
}

export async function simulateWebhook(
	port: number,
	event: Record<string, unknown>,
): Promise<Response> {
	return fetch(`http://localhost:${port}/api/stripe-webhook`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(event),
	})
}
