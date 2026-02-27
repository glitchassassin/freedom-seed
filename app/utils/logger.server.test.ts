import { afterEach, describe, expect, test, vi } from 'vitest'
import { Logger } from './logger.server'

function captureLog(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
	expect(spy).toHaveBeenCalledOnce()
	return JSON.parse(spy.mock.calls[0][0] as string)
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('Logger', () => {
	test('info writes structured JSON to console.log', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new Logger('req-123')
		logger.info('hello')
		const entry = captureLog(spy)
		expect(entry).toMatchObject({
			level: 'info',
			requestId: 'req-123',
			message: 'hello',
		})
		expect(entry).toHaveProperty('timestamp')
	})

	test('warn writes to console.warn', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const logger = new Logger('req-456')
		logger.warn('caution')
		const entry = captureLog(spy)
		expect(entry).toMatchObject({ level: 'warn', message: 'caution' })
	})

	test('error writes to console.error', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const logger = new Logger('req-789')
		logger.error('failure')
		const entry = captureLog(spy)
		expect(entry).toMatchObject({ level: 'error', message: 'failure' })
	})

	test('debug writes to console.log', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new Logger('req-abc')
		logger.debug('details')
		const entry = captureLog(spy)
		expect(entry).toMatchObject({ level: 'debug', message: 'details' })
	})

	test('includes data when provided', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new Logger('req-data')
		logger.info('with data', { userId: '42', action: 'login' })
		const entry = captureLog(spy)
		expect(entry.data).toEqual({ userId: '42', action: 'login' })
	})

	test('omits data key when not provided', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new Logger('req-nodata')
		logger.info('no data')
		const entry = captureLog(spy)
		expect(entry).not.toHaveProperty('data')
	})
})
