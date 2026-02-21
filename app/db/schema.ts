import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const auditLog = sqliteTable(
	'audit_log',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		teamId: text('team_id').notNull(), // plain text; FK added when teams table lands
		actorId: text('actor_id').notNull(), // plain text; FK added when users table lands
		actorEmail: text('actor_email').notNull(), // snapshot at write time
		action: text('action').notNull(), // AuditAction string
		targetType: text('target_type'), // e.g. "member", "subscription"
		targetId: text('target_id'),
		targetLabel: text('target_label'), // snapshot at write time
		metadata: text('metadata', { mode: 'json' })
			.$type<Record<string, unknown>>()
			.default(sql`'{}'`),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
	},
	(table) => [
		index('audit_log_team_created_idx').on(table.teamId, table.createdAt),
	],
)
