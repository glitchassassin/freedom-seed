import { data } from 'react-router'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import { confirmFileUpload, deleteFile } from '~/utils/file-storage.server'
import { requireUser } from '~/utils/session-context'

export async function action({ request, params, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const { fileId } = params
	if (!fileId) return data({ error: 'Missing file ID' }, { status: 400 })

	if (request.method === 'PATCH') {
		await confirmFileUpload(env, fileId, user.id)
		return data({ ok: true })
	}

	if (request.method === 'DELETE') {
		await deleteFile(env, fileId, user.id)
		return data({ ok: true })
	}

	return data({ error: 'Method not allowed' }, { status: 405 })
}

export async function loader() {
	return data({ error: 'Method not allowed' }, { status: 405 })
}
