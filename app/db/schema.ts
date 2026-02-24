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

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	displayName: text('display_name'),
	emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp_ms' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
})

export const sessions = sqliteTable(
	'sessions',
	{
		// Raw (unsigned) token — the HMAC-signed form lives only in the cookie
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
	},
	(table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const passwordCredentials = sqliteTable('password_credentials', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	hash: text('hash').notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
})

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
	// SHA-256 hash of the raw token (raw token travels only in the reset URL)
	tokenHash: text('token_hash').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp_ms' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
})

export const magicLinkTokens = sqliteTable(
	'magic_link_tokens',
	{
		tokenHash: text('token_hash').primaryKey(), // SHA-256 of raw token
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		usedAt: integer('used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
	},
	(table) => [index('magic_link_tokens_user_id_idx').on(table.userId)],
)

export const mfaCredentials = sqliteTable('mfa_credentials', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	secret: text('secret').notNull(), // Base32-encoded TOTP secret
	verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }), // null until setup confirmed
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
})

export const mfaBackupCodes = sqliteTable(
	'mfa_backup_codes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		codeHash: text('code_hash').notNull(), // SHA-256 hash of the backup code
		usedAt: integer('used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
	},
	(table) => [index('mfa_backup_codes_user_id_idx').on(table.userId)],
)

export const emailVerificationTokens = sqliteTable(
	'email_verification_tokens',
	{
		tokenHash: text('token_hash').primaryKey(), // SHA-256 of raw token
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		usedAt: integer('used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
	},
	(table) => [index('email_verification_tokens_user_id_idx').on(table.userId)],
)
