import { secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'

const cookieName = 'en_last_team'

/**
 * Reads the last-visited team ID from the cookie.
 * Returns null if the cookie is not set.
 */
export function getLastTeamId(request: Request): string | null {
	return readCookie(request, cookieName)
}

/**
 * Returns a Set-Cookie header value that persists the last-visited team ID.
 * The cookie lasts 1 year and is httpOnly / SameSite=Lax.
 */
export function setLastTeamCookie(teamId: string, isSecure: boolean): string {
	return `${cookieName}=${teamId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secureSuffix(isSecure)}`
}
