import { createContext } from 'react-router'
import type { RouterContext } from 'react-router'
import type { ValidatedEnv } from '../../workers/env'

export const cloudflareContext = createContext<{
	env: ValidatedEnv
	ctx: ExecutionContext
} | null>(null)

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/**
 * Retrieves the Cloudflare context from the React Router context provider.
 * Throws if the context has not been set (i.e. code is not running inside a
 * Cloudflare Worker handler).
 */
export function getCloudflare(context: ContextReader) {
	const cf = context.get(cloudflareContext)
	if (!cf)
		throw new Error('Cloudflare context not set — is this running in a Worker?')
	return cf
}
