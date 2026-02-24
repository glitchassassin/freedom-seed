import { createContext, redirect } from 'react-router'
import type { RouterContext } from 'react-router'

export type SessionUser = {
	id: string
	email: string
	displayName: string | null
	emailVerifiedAt: Date | null
}

/**
 * React Router context key for the authenticated session user.
 * Set by the root middleware after validating the session cookie;
 * null when the request is unauthenticated.
 */
export const sessionContext = createContext<SessionUser | null>(null)

interface ContextReader {
	get<T>(key: RouterContext<T>): T
}

/** Returns the current user, or null if unauthenticated. */
export function getOptionalUser(context: ContextReader): SessionUser | null {
	return context.get(sessionContext)
}

/**
 * Returns the current user, redirecting to /login if unauthenticated.
 * Use in loaders/actions inside the `_authenticated` layout or any
 * route that must be auth-gated.
 */
export function requireUser(context: ContextReader): SessionUser {
	const user = context.get(sessionContext)
	if (!user) throw redirect('/login')
	return user
}
