/**
 * Validates a redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with `/`.
 * Rejects protocol-relative URLs (`//`) and backslash variants (`/\`).
 */
export function safeRedirect(
	to: string | null | undefined,
	defaultRedirect = '/',
): string {
	if (
		!to ||
		!to.startsWith('/') ||
		to.startsWith('//') ||
		to.startsWith('/\\')
	) {
		return defaultRedirect
	}
	return to
}
