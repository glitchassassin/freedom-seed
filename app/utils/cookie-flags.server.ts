/**
 * Returns "; Secure" when running under HTTPS (production), or "" for plain
 * HTTP (local preview / WebKit E2E).
 */
export function secureSuffix(isSecure: boolean): string {
	return isSecure ? '; Secure' : ''
}
