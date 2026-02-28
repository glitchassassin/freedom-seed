import { data } from 'react-router'
import * as z from 'zod'
import type { Route } from './+types/route'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE,
	createPendingFile,
} from '~/utils/file-storage.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { requireUser } from '~/utils/session-context'

const presignSchema = z.object({
	filename: z.string().min(1).max(255),
	contentType: z.enum(ALLOWED_MIME_TYPES),
	size: z.coerce.number().int().positive().max(MAX_FILE_SIZE),
})

export async function action({ request, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)

	await requireRateLimit(env, request, {
		prefix: 'file-presign',
		limit: 20,
		windowSeconds: 60,
	})

	const body = await request.json().catch(() => null)
	const parsed = presignSchema.safeParse(body)
	if (!parsed.success) {
		return data(
			{ error: 'Invalid request', issues: parsed.error.flatten() },
			{ status: 400 },
		)
	}

	const { filename, contentType, size } = parsed.data

	try {
		const result = await createPendingFile(env, {
			ownerId: user.id,
			filename,
			contentType,
			size,
		})
		return data(result, { status: 201 })
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		return data({ error: message }, { status: 503 })
	}
}

export async function loader() {
	return data({ error: 'Method not allowed' }, { status: 405 })
}
