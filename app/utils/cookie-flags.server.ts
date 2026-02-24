/**
 * Returns "; Secure" when running under HTTPS (production), or "" for plain
 * HTTP (local preview / WebKit E2E).
 */
export function secureSuffix(isSecure: boolean): string {
	return isSecure ? '; Secure' : ''
}

/**
 * The CSRF cookie uses the `__Host-` prefix in production (requires Secure +
 * Path=/ + no Domain). In non-secure contexts the prefix is dropped.
 */
export function csrfCookieName(isSecure: boolean): string {
	return isSecure ? '__Host-csrf' : 'csrf'
}
