import type { Db } from './client.server'
import { auditLog } from './schema'

export type AuditAction =
	| 'member.invited'
	| 'member.invitation_accepted'
	| 'member.invitation_revoked'
	| 'member.removed'
	| 'member.role_changed'
	| 'workspace.created'
	| 'workspace.renamed'
	| 'workspace.deleted'
	| 'workspace.settings_updated'
	| 'subscription.created'
	| 'subscription.upgraded'
	| 'subscription.downgraded'
	| 'subscription.cancelled'
	| 'subscription.payment_failed'
	| 'resource.created'
	| 'resource.updated'
	| 'resource.deleted'
	| 'auth.owner_transferred'
	| 'feature_flag.created'
	| 'feature_flag.updated'
	| 'feature_flag.deleted'

export interface LogAuditEventArgs {
	db: Db
	workspaceId: string
	actorId: string
	actorEmail: string
	action: AuditAction
	targetType?: string
	targetId?: string
	targetLabel?: string
	metadata?: Record<string, unknown>
}

/**
 * Append one entry to the audit log.
 * In Cloudflare Workers actions, prefer:
 *   ctx.waitUntil(logAuditEvent(...))
 * to avoid blocking the response.
 */
export async function logAuditEvent({
	db,
	workspaceId,
	actorId,
	actorEmail,
	action,
	targetType,
	targetId,
	targetLabel,
	metadata = {},
}: LogAuditEventArgs): Promise<void> {
	await db.insert(auditLog).values({
		workspaceId,
		actorId,
		actorEmail,
		action,
		targetType: targetType ?? null,
		targetId: targetId ?? null,
		targetLabel: targetLabel ?? null,
		metadata,
		// createdAt omitted — SQLite default (unixepoch('now') * 1000) applies
	})
}
