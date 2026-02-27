import { createContext } from 'react-router'
import type { RouterContext } from 'react-router'

/**
 * React Router context key for the per-request unique identifier.
 * Set in the Worker fetch handler; available in all middleware, loaders, and actions.
 */
export const requestIdContext = createContext<string>('')

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/** Returns the current request's unique ID. */
export function getRequestId(context: ContextReader): string {
	const id = context.get(requestIdContext)
	if (!id)
		throw new Error('Request ID context not set — is this running in a Worker?')
	return id
}
