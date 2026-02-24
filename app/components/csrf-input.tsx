import { useRouteLoaderData } from 'react-router'
import type { loader as rootLoader } from '~/root'
import { CSRF_FIELD_NAME } from '~/utils/csrf-constants'

/**
 * Hidden input that embeds the CSRF token in a form.
 * Reads the token from the root loader data.
 */
export function CsrfInput() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	const token = data?.csrfToken ?? ''
	return <input type="hidden" name={CSRF_FIELD_NAME} value={token} />
}
