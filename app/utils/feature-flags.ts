/**
 * Registry of known feature flags with their defaults.
 * Add new flags here — the admin UI enumerates this list.
 *
 * This file is client-safe (no .server suffix). It contains only static
 * data that can be bundled into the client without server-only imports.
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
