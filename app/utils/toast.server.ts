import { redirect } from 'react-router'

const cookieName = 'en_toast'

export type Toast = {
	type: 'success' | 'error' | 'warning' | 'info'
	title: string
	description?: string
}

/**
 * Reads the flash toast cookie from the request. Returns the parsed toast (if
 * any) along with a Set-Cookie header to clear it so it doesn't re-appear on
 * subsequent navigations.
 */
export function getToast(request: Request): {
	toast: Toast | null
	setCookieHeader: string | null
} {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return { toast: null, setCookieHeader: null }

	for (const part of cookieHeader.split(';')) {
		const eqIdx = part.indexOf('=')
		if (eqIdx === -1) continue
		if (part.slice(0, eqIdx).trim() !== cookieName) continue

		const raw = decodeURIComponent(part.slice(eqIdx + 1).trim())
		try {
			const parsed: unknown = JSON.parse(raw)
			const p = parsed as Record<string, unknown>
			if (
				parsed !== null &&
				typeof parsed === 'object' &&
				typeof p.title === 'string' &&
				['success', 'error', 'warning', 'info'].includes(p.type as string) &&
				(!('description' in parsed) || typeof p.description === 'string')
			) {
				return {
					toast: parsed as Toast,
					setCookieHeader: `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`,
				}
			}
		} catch {
			// malformed cookie — ignore
		}
		break
	}

	return { toast: null, setCookieHeader: null }
}

/**
 * Returns a Set-Cookie header value that sets the flash toast cookie.
 * The cookie expires in 60 seconds to ensure it's cleared even if the
 * redirect page never loads.
 */
export function setToast(toast: Toast): string {
	const value = encodeURIComponent(JSON.stringify(toast))
	return `${cookieName}=${value}; Path=/; Max-Age=60; SameSite=Lax; HttpOnly; Secure`
}

/**
 * Convenience helper: redirects to `redirectTo` and sets a flash toast cookie.
 * Use this in Route actions to surface feedback after form submissions.
 *
 * @example
 * return showToast({ type: 'success', title: 'Profile updated' }, '/settings')
 */
export function showToast(toast: Toast, redirectTo: string): Response {
	return redirect(redirectTo, {
		headers: { 'set-cookie': setToast(toast) },
	})
}
