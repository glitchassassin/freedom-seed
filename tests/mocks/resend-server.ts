import { randomUUID } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const CAPTURED_EMAILS_PATH = join(
	tmpdir(),
	'freedom-seed-captured-emails.ndjson',
)

let server: Server | null = null

export function start(): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFileSync(CAPTURED_EMAILS_PATH, '')
		server = createServer((req, res) => {
			if (req.method === 'POST' && req.url === '/emails') {
				let body = ''
				req.on('error', () => {
					res.writeHead(400)
					res.end()
				})
				req.on('data', (chunk: Buffer) => {
					body += chunk.toString()
				})
				req.on('end', () => {
					let email
					try {
						email = JSON.parse(body)
					} catch {
						res.writeHead(400, { 'content-type': 'application/json' })
						res.end(JSON.stringify({ error: 'Invalid JSON' }))
						return
					}
					const id = randomUUID()
					const record = { ...email, id, created_at: new Date().toISOString() }
					appendFileSync(CAPTURED_EMAILS_PATH, JSON.stringify(record) + '\n')
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(JSON.stringify({ id }))
				})
				return
			}
			res.writeHead(404)
			res.end()
		})
		server.on('error', (err) => {
			reject(
				new Error(
					`Mock Resend server failed to start on port 3001: ${err.message}`,
				),
			)
		})
		server.listen(3001, '127.0.0.1', () => resolve())
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
