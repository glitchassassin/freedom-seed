import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from '~/db/client.server'
import { featureFlags } from '~/db/schema'

/**
 * Registry of known feature flags with their defaults.
 * Add new flags here — the admin UI enumerates this list.
 */
export const FLAG_REGISTRY = {
	// Example flags — replace with real ones as features are built
	'new-dashboard': {
		defaultEnabled: false,
		label: 'New Dashboard',
		description: 'Enable the redesigned dashboard experience',
	},
	'ai-assistant': {
		defaultEnabled: false,
		label: 'AI Assistant',
		description: 'Enable the AI assistant in the workspace sidebar',
	},
} as const satisfies Record<
	string,
	{ defaultEnabled: boolean; label: string; description: string }
>

export type FeatureFlagKey = keyof typeof FLAG_REGISTRY

export const featureFlagKeys = Object.keys(FLAG_REGISTRY) as FeatureFlagKey[]

/**
 * Resolves the effective state of a feature flag.
 * Priority: workspace override > global override > code default.
 */
export async function getFlag(
	db: Db,
	key: FeatureFlagKey,
	workspaceId?: string,
): Promise<boolean> {
	const defaults = FLAG_REGISTRY[key]

	// Check workspace-level override first
	if (workspaceId) {
		const wsOverride = await db
			.select({ enabled: featureFlags.enabled })
			.from(featureFlags)
			.where(
				and(
					eq(featureFlags.key, key),
					eq(featureFlags.workspaceId, workspaceId),
				),
			)
			.get()
		if (wsOverride) return wsOverride.enabled
	}

	// Check global override
	const globalOverride = await db
		.select({ enabled: featureFlags.enabled })
		.from(featureFlags)
		.where(and(eq(featureFlags.key, key), isNull(featureFlags.workspaceId)))
		.get()
	if (globalOverride) return globalOverride.enabled

	return defaults.defaultEnabled
}

/**
 * Returns the effective state of all known flags for a workspace.
 */
export async function getAllFlags(
	db: Db,
	workspaceId?: string,
): Promise<Record<FeatureFlagKey, boolean>> {
	// Fetch all overrides in one query
	const overrides = workspaceId
		? await db
				.select()
				.from(featureFlags)
				.where(eq(featureFlags.workspaceId, workspaceId))
				.all()
		: []

	const globalOverrides = await db
		.select()
		.from(featureFlags)
		.where(isNull(featureFlags.workspaceId))
		.all()

	const result = {} as Record<FeatureFlagKey, boolean>
	for (const key of featureFlagKeys) {
		const wsOverride = overrides.find((o) => o.key === key)
		const globalOverride = globalOverrides.find((o) => o.key === key)
		if (wsOverride) {
			result[key] = wsOverride.enabled
		} else if (globalOverride) {
			result[key] = globalOverride.enabled
		} else {
			result[key] = FLAG_REGISTRY[key].defaultEnabled
		}
	}
	return result
}

/**
 * Returns all overrides for a workspace (both workspace-level and global).
 */
export async function getFlagOverrides(
	db: Db,
	workspaceId: string,
): Promise<
	Array<{
		id: string
		key: string
		workspaceId: string | null
		enabled: boolean
		description: string | null
		createdAt: Date
		updatedAt: Date
	}>
> {
	const wsOverrides = await db
		.select()
		.from(featureFlags)
		.where(eq(featureFlags.workspaceId, workspaceId))
		.all()

	const globalOverrides = await db
		.select()
		.from(featureFlags)
		.where(isNull(featureFlags.workspaceId))
		.all()

	return [...wsOverrides, ...globalOverrides]
}

/**
 * Sets a feature flag override. Creates or updates an override row.
 */
export async function setFlagOverride(
	db: Db,
	opts: {
		key: FeatureFlagKey
		workspaceId: string | null
		enabled: boolean
		description?: string
	},
): Promise<void> {
	const existing = await db
		.select({ id: featureFlags.id })
		.from(featureFlags)
		.where(
			opts.workspaceId
				? and(
						eq(featureFlags.key, opts.key),
						eq(featureFlags.workspaceId, opts.workspaceId),
					)
				: and(eq(featureFlags.key, opts.key), isNull(featureFlags.workspaceId)),
		)
		.get()

	if (existing) {
		await db
			.update(featureFlags)
			.set({
				enabled: opts.enabled,
				description: opts.description ?? null,
				updatedAt: new Date(),
			})
			.where(eq(featureFlags.id, existing.id))
	} else {
		await db.insert(featureFlags).values({
			key: opts.key,
			workspaceId: opts.workspaceId,
			enabled: opts.enabled,
			description: opts.description ?? null,
		})
	}
}

/**
 * Removes a feature flag override, reverting to the next fallback.
 */
export async function removeFlagOverride(
	db: Db,
	opts: { key: FeatureFlagKey; workspaceId: string | null },
): Promise<void> {
	await db
		.delete(featureFlags)
		.where(
			opts.workspaceId
				? and(
						eq(featureFlags.key, opts.key),
						eq(featureFlags.workspaceId, opts.workspaceId),
					)
				: and(eq(featureFlags.key, opts.key), isNull(featureFlags.workspaceId)),
		)
}
