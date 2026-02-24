import { secureSuffix } from '~/utils/cookie-flags.server'

const cookieName = 'en_theme'

export type Theme = 'light' | 'dark'

function parseCookieValue(cookieHeader: string, name: string): string | null {
	for (const part of cookieHeader.split(';')) {
		const eqIdx = part.indexOf('=')
		if (eqIdx === -1) continue
		if (part.slice(0, eqIdx).trim() === name) {
			return decodeURIComponent(part.slice(eqIdx + 1).trim())
		}
	}
	return null
}

/**
 * Returns the user's explicit theme preference from the cookie, or null if
 * no preference has been set (meaning the system preference should be used).
 */
export function getTheme(request: Request): Theme | null {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return null
	const value = parseCookieValue(cookieHeader, cookieName)
	if (value === 'light' || value === 'dark') return value
	return null
}

/**
 * Returns a Set-Cookie header value for the given theme preference.
 * Pass 'system' to clear the explicit preference and fall back to the OS.
 */
export function setTheme(theme: Theme | 'system', isSecure: boolean): string {
	if (theme === 'system') {
		return `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secureSuffix(isSecure)}`
	}
	return `${cookieName}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secureSuffix(isSecure)}`
}
