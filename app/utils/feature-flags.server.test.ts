import { describe, expect, test } from '../../tests/setup/fixtures'

import { featureFlags } from '../db/schema'
import {
	FLAG_REGISTRY,
	featureFlagKeys,
	getAllFlags,
	getFlag,
} from './feature-flags.server'

// ── getFlag ───────────────────────────────────────────────────────────────────

describe('getFlag', () => {
	test('returns the code default when no overrides exist', async ({
		db,
		workspace,
	}) => {
		const result = await getFlag(db, 'new-dashboard', workspace.id)
		expect(result).toBe(FLAG_REGISTRY['new-dashboard'].defaultEnabled)
	})

	test('returns the global override when one exists and no workspace override', async ({
		db,
		workspace,
	}) => {
		await db.insert(featureFlags).values({
			key: 'new-dashboard',
			workspaceId: null,
			enabled: true,
		})
		const result = await getFlag(db, 'new-dashboard', workspace.id)
		expect(result).toBe(true)
	})

	test('returns the workspace override when both workspace and global overrides exist', async ({
		db,
		workspace,
	}) => {
		await db.insert(featureFlags).values([
			{ key: 'new-dashboard', workspaceId: workspace.id, enabled: false },
			{ key: 'new-dashboard', workspaceId: null, enabled: true },
		])
		const result = await getFlag(db, 'new-dashboard', workspace.id)
		expect(result).toBe(false)
	})

	test('returns the global override when workspaceId is provided but only a global override exists', async ({
		db,
		workspace,
	}) => {
		await db.insert(featureFlags).values({
			key: 'ai-assistant',
			workspaceId: null,
			enabled: true,
		})
		const result = await getFlag(db, 'ai-assistant', workspace.id)
		expect(result).toBe(true)
	})

	test('returns the code default when workspaceId is not provided and no global override exists', async ({
		db,
	}) => {
		const result = await getFlag(db, 'ai-assistant')
		expect(result).toBe(FLAG_REGISTRY['ai-assistant'].defaultEnabled)
	})
})

// ── getAllFlags ───────────────────────────────────────────────────────────────

describe('getAllFlags', () => {
	test('returns all defaults when no overrides exist', async ({
		db,
		workspace,
	}) => {
		const result = await getAllFlags(db, workspace.id)
		for (const key of featureFlagKeys) {
			expect(result[key]).toBe(FLAG_REGISTRY[key].defaultEnabled)
		}
	})

	test('correctly applies mixed overrides', async ({ db, workspace }) => {
		// 'new-dashboard' has a workspace override; 'ai-assistant' has only a global override.
		await db.insert(featureFlags).values([
			{ key: 'new-dashboard', workspaceId: workspace.id, enabled: true },
			{ key: 'ai-assistant', workspaceId: null, enabled: true },
		])
		const result = await getAllFlags(db, workspace.id)

		expect(result['new-dashboard']).toBe(true)
		expect(result['ai-assistant']).toBe(true)
	})

	test('returns only defaults and global overrides when workspaceId is omitted', async ({
		db,
	}) => {
		await db.insert(featureFlags).values({
			key: 'new-dashboard',
			workspaceId: null,
			enabled: true,
		})
		const result = await getAllFlags(db)

		expect(result['new-dashboard']).toBe(true)
		expect(result['ai-assistant']).toBe(
			FLAG_REGISTRY['ai-assistant'].defaultEnabled,
		)
	})

	test('workspace override takes precedence over global override in getAllFlags', async ({
		db,
		workspace,
	}) => {
		await db.insert(featureFlags).values([
			{ key: 'new-dashboard', workspaceId: workspace.id, enabled: false },
			{ key: 'new-dashboard', workspaceId: null, enabled: true },
		])
		const result = await getAllFlags(db, workspace.id)
		expect(result['new-dashboard']).toBe(false)
	})
})
