import { sql } from 'drizzle-orm'
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core'

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

export const workspaces = sqliteTable('workspaces', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	isPersonal: integer('is_personal', { mode: 'boolean' })
		.notNull()
		.default(false),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
})

export const workspaceMemberRoleEnum = ['owner', 'admin', 'member'] as const
export type WorkspaceMemberRole = (typeof workspaceMemberRoleEnum)[number]

export const workspaceMembers = sqliteTable(
	'workspace_members',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role').$type<WorkspaceMemberRole>().notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
	},
	(table) => [
		uniqueIndex('workspace_members_workspace_user_idx').on(
			table.workspaceId,
			table.userId,
		),
	],
)

export const workspaceInvitations = sqliteTable('workspace_invitations', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	workspaceId: text('workspace_id')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	invitedByUserId: text('invited_by_user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: text('role').$type<WorkspaceMemberRole>().notNull(),
	tokenHash: text('token_hash').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
	revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch('now') * 1000)`),
})

export const auditLog = sqliteTable(
	'audit_log',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		actorId: text('actor_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
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
		index('audit_log_workspace_created_idx').on(
			table.workspaceId,
			table.createdAt,
		),
	],
)

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

export const passkeyCredentials = sqliteTable(
	'passkey_credentials',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		credentialId: text('credential_id').notNull().unique(), // base64url-encoded credential ID
		publicKey: text('public_key').notNull(), // base64url-encoded public key
		counter: integer('counter').notNull().default(0),
		deviceType: text('device_type').notNull(), // 'singleDevice' or 'multiDevice'
		backedUp: integer('backed_up', { mode: 'boolean' })
			.notNull()
			.default(false),
		transports: text('transports', { mode: 'json' })
			.$type<string[]>()
			.default(sql`'[]'`), // JSON array of AuthenticatorTransport strings
		name: text('name').notNull().default('Passkey'), // user-provided friendly name
		lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch('now') * 1000)`),
	},
	(table) => [index('passkey_credentials_user_id_idx').on(table.userId)],
)
