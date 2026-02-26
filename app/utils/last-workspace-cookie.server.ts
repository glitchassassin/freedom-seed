import { secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'

const cookieName = 'en_last_workspace'

/**
 * Reads the last-visited workspace ID from the cookie.
 * Returns null if the cookie is not set.
 */
export function getLastWorkspaceId(request: Request): string | null {
	return readCookie(request, cookieName)
}

/**
 * Returns a Set-Cookie header value that persists the last-visited workspace ID.
 * The cookie lasts 1 year and is httpOnly / SameSite=Lax.
 */
export function setLastWorkspaceCookie(
	workspaceId: string,
	isSecure: boolean,
): string {
	return `${cookieName}=${workspaceId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secureSuffix(isSecure)}`
}
