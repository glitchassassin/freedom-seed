import { randomUUID } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const CAPTURED_STRIPE_PATH = join(
	tmpdir(),
	'freedom-seed-captured-stripe.ndjson',
)

let server: Server | null = null

export function start(): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFileSync(CAPTURED_STRIPE_PATH, '')
		server = createServer((req, res) => {
			let body = ''
			req.on('data', (chunk: Buffer) => {
				body += chunk.toString()
			})
			req.on('end', () => {
				const record = {
					method: req.method,
					url: req.url,
					body,
					timestamp: new Date().toISOString(),
				}
				appendFileSync(CAPTURED_STRIPE_PATH, JSON.stringify(record) + '\n')

				// Route mock responses
				if (req.method === 'POST' && req.url === '/v1/customers') {
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(
						JSON.stringify({
							id: `cus_mock_${randomUUID().slice(0, 8)}`,
							object: 'customer',
						}),
					)
					return
				}

				if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
					// Parse the body to get the success_url
					const params = new URLSearchParams(body)
					const successUrl =
						params.get('success_url') || 'http://localhost:4200/'
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(
						JSON.stringify({
							id: `cs_mock_${randomUUID().slice(0, 8)}`,
							object: 'checkout.session',
							url: successUrl,
						}),
					)
					return
				}

				if (
					req.method === 'POST' &&
					req.url === '/v1/billing_portal/sessions'
				) {
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(
						JSON.stringify({
							id: `bps_mock_${randomUUID().slice(0, 8)}`,
							object: 'billing_portal.session',
							url: 'http://localhost:3002/mock-portal',
						}),
					)
					return
				}

				if (req.method === 'GET' && req.url?.startsWith('/v1/subscriptions/')) {
					const subId = req.url.split('/v1/subscriptions/')[1]
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(
						JSON.stringify({
							id: subId,
							object: 'subscription',
							status: 'active',
							metadata: {},
							items: {
								data: [
									{
										price: { id: 'price_pro_monthly_placeholder' },
										quantity: 1,
										current_period_start: Math.floor(Date.now() / 1000),
										current_period_end:
											Math.floor(Date.now() / 1000) + 30 * 86400,
									},
								],
							},
							trial_end: null,
							cancel_at_period_end: false,
						}),
					)
					return
				}

				// Handle subscription updates (POST /v1/subscriptions/:id)
				if (
					req.method === 'POST' &&
					req.url?.match(/^\/v1\/subscriptions\/sub_/)
				) {
					const subId = req.url.split('/v1/subscriptions/')[1]
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(
						JSON.stringify({
							id: subId,
							object: 'subscription',
							status: 'active',
							metadata: {},
							items: {
								data: [
									{
										price: { id: 'price_pro_monthly_placeholder' },
										quantity: 1,
										current_period_start: Math.floor(Date.now() / 1000),
										current_period_end:
											Math.floor(Date.now() / 1000) + 30 * 86400,
									},
								],
							},
							trial_end: null,
							cancel_at_period_end: false,
						}),
					)
					return
				}

				// Default 404
				res.writeHead(404)
				res.end()
			})
		})
		server.on('error', (err) => {
			reject(
				new Error(
					`Mock Stripe server failed to start on port 3002: ${err.message}`,
				),
			)
		})
		server.listen(3002, '127.0.0.1', () => resolve())
	})
}

export function stop(): Promise<void> {
	return new Promise((resolve) => {
		if (server) {
			server.close(() => resolve())
			server = null
		} else {
			resolve()
		}
	})
}
