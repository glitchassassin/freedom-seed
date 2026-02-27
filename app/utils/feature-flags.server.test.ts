import { describe, expect, test, vi } from 'vitest'
import {
	getFlag,
	getAllFlags,
	FLAG_REGISTRY,
	featureFlagKeys,
} from './feature-flags.server'

type MockRow = { key: string; workspaceId: string | null; enabled: boolean }

/**
 * Creates a mock db that returns the given row for a single `.get()` call
 * and the given rows for a single `.all()` call.
 */
function createChainMock(results: {
	get?: MockRow | undefined
	all?: MockRow[]
}) {
	return {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					get: vi.fn().mockReturnValue(results.get),
					all: vi.fn().mockReturnValue(results.all ?? []),
				}),
			}),
		}),
	}
}

/**
 * Creates a mock db whose successive `.get()` calls return results in order.
 * Used for `getFlag`, which may call `.get()` twice (workspace then global).
 */
function createSequentialGetMock(getResults: Array<MockRow | undefined>) {
	let callCount = 0
	const whereMock = vi.fn().mockImplementation(() => ({
		get: vi.fn().mockImplementation(() => {
			const result = getResults[callCount] ?? undefined
			callCount++
			return result
		}),
		all: vi.fn().mockReturnValue([]),
	}))

	return {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: whereMock,
			}),
		}),
	}
}

// ── getFlag ───────────────────────────────────────────────────────────────────

describe('getFlag', () => {
	test('returns the code default when no overrides exist', async () => {
		// Both get() calls return undefined → fall through to default
		const db = createSequentialGetMock([undefined, undefined])
		const result = await getFlag(db as any, 'new-dashboard', 'ws-1')
		expect(result).toBe(FLAG_REGISTRY['new-dashboard'].defaultEnabled)
	})

	test('returns the global override when one exists and no workspace override', async () => {
		// First get() (workspace) returns undefined; second (global) returns enabled=true
		const db = createSequentialGetMock([
			undefined,
			{ key: 'new-dashboard', workspaceId: null, enabled: true },
		])
		const result = await getFlag(db as any, 'new-dashboard', 'ws-1')
		expect(result).toBe(true)
	})

	test('returns the workspace override when both workspace and global overrides exist', async () => {
		// First get() returns workspace override (enabled=false);
		// second get() would return global (enabled=true) but should not be reached
		const db = createSequentialGetMock([
			{ key: 'new-dashboard', workspaceId: 'ws-1', enabled: false },
			{ key: 'new-dashboard', workspaceId: null, enabled: true },
		])
		const result = await getFlag(db as any, 'new-dashboard', 'ws-1')
		expect(result).toBe(false)
	})

	test('returns the global override when workspaceId is provided but only a global override exists', async () => {
		const db = createSequentialGetMock([
			undefined,
			{ key: 'ai-assistant', workspaceId: null, enabled: true },
		])
		const result = await getFlag(db as any, 'ai-assistant', 'ws-99')
		expect(result).toBe(true)
	})

	test('returns the code default when workspaceId is not provided and no global override exists', async () => {
		// No workspaceId → only one get() call (global); returns undefined
		const db = createSequentialGetMock([undefined])
		const result = await getFlag(db as any, 'ai-assistant')
		expect(result).toBe(FLAG_REGISTRY['ai-assistant'].defaultEnabled)
	})
})

// ── getAllFlags ───────────────────────────────────────────────────────────────

describe('getAllFlags', () => {
	test('returns all defaults when no overrides exist', async () => {
		const db = createChainMock({ all: [] })
		const result = await getAllFlags(db as any, 'ws-1')

		for (const key of featureFlagKeys) {
			expect(result[key]).toBe(FLAG_REGISTRY[key].defaultEnabled)
		}
	})

	test('correctly applies mixed overrides', async () => {
		// 'new-dashboard' has a workspace override (enabled=true)
		// 'ai-assistant' has only a global override (enabled=true)
		const db = createChainMock({
			all: [
				{ key: 'new-dashboard', workspaceId: 'ws-1', enabled: true },
				{ key: 'ai-assistant', workspaceId: null, enabled: true },
			],
		})
		const result = await getAllFlags(db as any, 'ws-1')

		// workspace override wins for 'new-dashboard'
		expect(result['new-dashboard']).toBe(true)
		// global override applies for 'ai-assistant'
		expect(result['ai-assistant']).toBe(true)
	})

	test('returns only defaults and global overrides when workspaceId is omitted', async () => {
		const db = createChainMock({
			all: [{ key: 'new-dashboard', workspaceId: null, enabled: true }],
		})
		const result = await getAllFlags(db as any)

		expect(result['new-dashboard']).toBe(true)
		expect(result['ai-assistant']).toBe(
			FLAG_REGISTRY['ai-assistant'].defaultEnabled,
		)
	})

	test('workspace override takes precedence over global override in getAllFlags', async () => {
		// Both a workspace and a global override exist for the same key;
		// the workspace one should win.
		const db = createChainMock({
			all: [
				{ key: 'new-dashboard', workspaceId: 'ws-1', enabled: false },
				{ key: 'new-dashboard', workspaceId: null, enabled: true },
			],
		})
		const result = await getAllFlags(db as any, 'ws-1')
		expect(result['new-dashboard']).toBe(false)
	})
})
