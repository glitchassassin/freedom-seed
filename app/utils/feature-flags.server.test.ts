import { beforeEach, describe, expect, test } from 'vitest'

import { featureFlags } from '../db/schema'
import { createTestDb } from '../../tests/setup/db'
import {
	FLAG_REGISTRY,
	featureFlagKeys,
	getAllFlags,
	getFlag,
} from './feature-flags.server'

// Each test gets a fresh isolated in-memory database via createTestDb().
// Foreign keys are OFF by default in SQLite, so workspace IDs like 'ws-1'
// can be used without creating corresponding workspace rows.
let db: ReturnType<typeof createTestDb>

beforeEach(() => {
	db = createTestDb()
})

// ── getFlag ───────────────────────────────────────────────────────────────────

describe('getFlag', () => {
	test('returns the code default when no overrides exist', async () => {
		const result = await getFlag(db, 'new-dashboard', 'ws-1')
		expect(result).toBe(FLAG_REGISTRY['new-dashboard'].defaultEnabled)
	})

	test('returns the global override when one exists and no workspace override', async () => {
		await db.insert(featureFlags).values({
			key: 'new-dashboard',
			workspaceId: null,
			enabled: true,
		})
		const result = await getFlag(db, 'new-dashboard', 'ws-1')
		expect(result).toBe(true)
	})

	test('returns the workspace override when both workspace and global overrides exist', async () => {
		await db.insert(featureFlags).values([
			{ key: 'new-dashboard', workspaceId: 'ws-1', enabled: false },
			{ key: 'new-dashboard', workspaceId: null, enabled: true },
		])
		const result = await getFlag(db, 'new-dashboard', 'ws-1')
		expect(result).toBe(false)
	})

	test('returns the global override when workspaceId is provided but only a global override exists', async () => {
		await db.insert(featureFlags).values({
			key: 'ai-assistant',
			workspaceId: null,
			enabled: true,
		})
		const result = await getFlag(db, 'ai-assistant', 'ws-99')
		expect(result).toBe(true)
	})

	test('returns the code default when workspaceId is not provided and no global override exists', async () => {
		const result = await getFlag(db, 'ai-assistant')
		expect(result).toBe(FLAG_REGISTRY['ai-assistant'].defaultEnabled)
	})
})

// ── getAllFlags ───────────────────────────────────────────────────────────────

describe('getAllFlags', () => {
	test('returns all defaults when no overrides exist', async () => {
		const result = await getAllFlags(db, 'ws-1')
		for (const key of featureFlagKeys) {
			expect(result[key]).toBe(FLAG_REGISTRY[key].defaultEnabled)
		}
	})

	test('correctly applies mixed overrides', async () => {
		// 'new-dashboard' has a workspace override; 'ai-assistant' has only a global override.
		await db.insert(featureFlags).values([
			{ key: 'new-dashboard', workspaceId: 'ws-1', enabled: true },
			{ key: 'ai-assistant', workspaceId: null, enabled: true },
		])
		const result = await getAllFlags(db, 'ws-1')

		expect(result['new-dashboard']).toBe(true)
		expect(result['ai-assistant']).toBe(true)
	})

	test('returns only defaults and global overrides when workspaceId is omitted', async () => {
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

	test('workspace override takes precedence over global override in getAllFlags', async () => {
		await db.insert(featureFlags).values([
			{ key: 'new-dashboard', workspaceId: 'ws-1', enabled: false },
			{ key: 'new-dashboard', workspaceId: null, enabled: true },
		])
		const result = await getAllFlags(db, 'ws-1')
		expect(result['new-dashboard']).toBe(false)
	})
})
