/**
 * Reads a raw (not URL-decoded) cookie value from a request.
 * Suitable for base64url-encoded tokens; does NOT percent-decode values.
 */
export function readCookie(request: Request, name: string): string | null {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return null
	for (const part of cookieHeader.split(';')) {
		const eqIdx = part.indexOf('=')
		if (eqIdx === -1) continue
		if (part.slice(0, eqIdx).trim() === name) {
			return part.slice(eqIdx + 1).trim()
		}
	}
	return null
}
