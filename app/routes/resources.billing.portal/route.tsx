import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { workspaces } from '~/db/schema'
import { getOrCreateStripeCustomer } from '~/utils/billing/billing.server'
import { getStripe } from '~/utils/billing/stripe.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { hasRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { getWorkspaceMember } from '~/utils/workspaces.server'

const portalSchema = z.object({
	workspaceId: z.string().min(1),
})

export async function action({ request, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const formData = await request.formData()

	const submission = parseWithZod(formData, { schema: portalSchema })
	if (submission.status !== 'success') {
		throw new Response('Invalid request', { status: 400 })
	}
	const { workspaceId } = submission.value

	// Verify user is an admin of this workspace
	const member = await getWorkspaceMember(db, workspaceId, user.id)
	if (!member || !hasRole(member.role, 'admin')) {
		throw new Response('Forbidden', { status: 403 })
	}

	const workspace = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)
	if (workspace.length === 0) {
		throw new Response('Workspace not found', { status: 404 })
	}

	const stripe = getStripe(env)
	const customerId = await getOrCreateStripeCustomer(db, stripe, workspace[0])

	const origin = new URL(request.url).origin
	const session = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: `${origin}/workspaces/${workspaceId}/settings/billing`,
	})

	return redirect(session.url)
}
