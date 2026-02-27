import { createContext } from 'react-router'
import type { RouterContext } from 'react-router'

/**
 * React Router context key for the per-request structured logger.
 * Set in the Worker fetch handler alongside `requestIdContext`.
 */
export const loggerContext = createContext<Logger | null>(null)

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/**
 * Returns the current request's Logger instance.
 * Throws if called outside a Worker request (i.e. context not set).
 */
export function getLogger(context: ContextReader): Logger {
	const logger = context.get(loggerContext)
	if (!logger)
		throw new Error('Logger context not set — is this running in a Worker?')
	return logger
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * Structured JSON logger that attaches a `requestId` to every entry.
 * Writes to `console` methods so Cloudflare Workers Logs / Logpush captures them.
 */
export class Logger {
	constructor(public readonly requestId: string) {}

	info(message: string, data?: Record<string, unknown>): void {
		this.write('info', message, data)
	}

	warn(message: string, data?: Record<string, unknown>): void {
		this.write('warn', message, data)
	}

	error(message: string, data?: Record<string, unknown>): void {
		this.write('error', message, data)
	}

	debug(message: string, data?: Record<string, unknown>): void {
		this.write('debug', message, data)
	}

	private write(
		level: LogLevel,
		message: string,
		data?: Record<string, unknown>,
	): void {
		const entry: Record<string, unknown> = {
			timestamp: new Date().toISOString(),
			level,
			requestId: this.requestId,
			message,
		}
		if (data !== undefined) {
			entry.data = data
		}
		const json = JSON.stringify(entry)
		switch (level) {
			case 'error':
				console.error(json)
				break
			case 'warn':
				console.warn(json)
				break
			case 'debug':
				console.debug(json)
				break
			default:
				console.log(json)
				break
		}
	}
}
