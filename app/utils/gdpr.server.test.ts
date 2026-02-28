import { describe, expect, test, vi } from 'vitest'

vi.mock('../db/client.server', () => ({
	getDb: vi.fn(),
}))

import { getDb } from '../db/client.server'
import {
	exportUserData,
	findBlockingWorkspaces,
	softDeleteUser,
} from './gdpr.server'
import { DELETION_GRACE_PERIOD_MS } from './gdpr.server'

const mockEnv = { DB: {} as D1Database }

/**
 * Builds a mock `db` whose `.select()` method returns a fresh chainable object
 * each time it is called. The chain handles the full Drizzle pattern used in
 * exportUserData:
 *
 *   .select().from().innerJoin?().where().limit?().then?(cb)
 *
 * `querySlots` is an ordered array of results — one per Promise.all slot.
 * Slots 0 (user) and 5 (mfa) are consumed via `.then(r => r[0] ?? null)`.
 * All other slots are awaited directly as arrays.
 */
function buildMockDb(querySlots: unknown[][]): ReturnType<typeof getDb> {
	let nextSlot = 0

	function makeSelect() {
		const slotIndex = nextSlot++
		const rows = querySlots[slotIndex] ?? []

		// Build a terminal promise that also exposes .limit() for the slots
		// that call .limit(1).then(...)
		function makeTerminal() {
			const p = Promise.resolve(rows)
			const withExtras = Object.assign(p, {
				limit: (_n: number) => Promise.resolve(rows),
				groupBy: (..._args: unknown[]) => Promise.resolve(rows),
			})
			return withExtras
		}

		// Chain: .from(table).innerJoin?(...).where(pred).groupBy?(...)
		const whereResult = makeTerminal()
		const innerJoinResult = {
			where: vi.fn().mockReturnValue(whereResult),
		}
		const fromResult = {
			innerJoin: vi.fn().mockReturnValue(innerJoinResult),
			where: vi.fn().mockReturnValue(whereResult),
		}

		return {
			from: vi.fn().mockReturnValue(fromResult),
		}
	}

	return {
		select: vi.fn().mockImplementation(makeSelect),
	} as unknown as ReturnType<typeof getDb>
}

/**
 * Builds a mock `db` for softDeleteUser that captures the batch call.
 * Returns the mock db and a reference to the batch spy.
 */
function buildBatchMockDb() {
	const batchSpy = vi.fn().mockResolvedValue([])

	const whereStub = vi.fn().mockReturnValue({})
	const deleteSpy = vi.fn().mockReturnValue({ where: whereStub })
	const updateSpy = vi.fn().mockReturnValue({
		set: vi.fn().mockReturnValue({ where: whereStub }),
	})

	const db = {
		batch: batchSpy,
		delete: deleteSpy,
		update: updateSpy,
	} as unknown as ReturnType<typeof getDb>

	return { db, batchSpy, deleteSpy, updateSpy }
}

// ── exportUserData ─────────────────────────────────────────────────────────────

describe('exportUserData', () => {
	// Slot order matches the Promise.all array in exportUserData:
	// 0: user, 1: sessions, 2: members, 3: identities,
	// 4: passkeys, 5: mfa, 6: invitations, 7: auditLogEntries

	const defaultUserRow = {
		id: 'u1',
		email: 'alice@example.com',
		displayName: 'Alice',
		emailVerifiedAt: null,
		createdAt: new Date(0),
		updatedAt: new Date(0),
	}

	test('workspaceMemberships includes workspace name and slug', async () => {
		const memberRow = {
			workspaceId: 'ws-1',
			name: 'Acme Corp',
			slug: 'acme-corp',
			role: 'owner',
			createdAt: new Date(0),
		}

		vi.mocked(getDb).mockReturnValue(
			buildMockDb([
				[defaultUserRow], // 0: user (.then)
				[], // 1: sessions
				[memberRow], // 2: members (innerJoin)
				[], // 3: identities
				[], // 4: passkeys
				[], // 5: mfa (.then)
				[], // 6: invitations
				[], // 7: auditLogEntries
			]),
		)

		const result = await exportUserData(mockEnv, 'u1')

		const memberships = result.workspaceMemberships as Array<
			Record<string, unknown>
		>
		expect(Array.isArray(memberships)).toBe(true)
		expect(memberships).toHaveLength(1)
		expect(memberships[0]).toHaveProperty('name', 'Acme Corp')
		expect(memberships[0]).toHaveProperty('slug', 'acme-corp')
		expect(memberships[0]).toHaveProperty('workspaceId', 'ws-1')
		expect(memberships[0]).toHaveProperty('role', 'owner')
	})

	test('result has a top-level auditLogEntries key with expected fields', async () => {
		const auditRow = {
			workspaceId: 'ws-1',
			action: 'member.invite',
			targetType: 'member',
			targetId: 'u2',
			targetLabel: 'bob@example.com',
			metadata: { role: 'admin' },
			createdAt: new Date(0),
		}

		vi.mocked(getDb).mockReturnValue(
			buildMockDb([
				[defaultUserRow], // 0: user
				[], // 1: sessions
				[], // 2: members
				[], // 3: identities
				[], // 4: passkeys
				[], // 5: mfa
				[], // 6: invitations
				[auditRow], // 7: auditLogEntries
			]),
		)

		const result = await exportUserData(mockEnv, 'u1')

		expect(result).toHaveProperty('auditLogEntries')
		const entries = result.auditLogEntries as Array<Record<string, unknown>>
		expect(entries).toBeInstanceOf(Array)
		expect(entries).toHaveLength(1)
		expect(entries[0]).toHaveProperty('action', 'member.invite')
		expect(entries[0]).toHaveProperty('workspaceId', 'ws-1')
		expect(entries[0]).toHaveProperty('targetType', 'member')
		expect(entries[0]).toHaveProperty('targetLabel', 'bob@example.com')
		expect(entries[0]).toHaveProperty('metadata')
	})

	test('auditLogEntries is an empty array when user has no audit log rows', async () => {
		vi.mocked(getDb).mockReturnValue(
			buildMockDb([[defaultUserRow], [], [], [], [], [], [], []]),
		)

		const result = await exportUserData(mockEnv, 'u1')

		expect(result).toHaveProperty('auditLogEntries')
		expect(result.auditLogEntries).toBeInstanceOf(Array)
		expect(result.auditLogEntries).toHaveLength(0)
	})
})

// ── softDeleteUser ─────────────────────────────────────────────────────────────

describe('softDeleteUser', () => {
	test('returns scheduledForDeletionAt approximately 30 days from now', async () => {
		const { db, batchSpy } = buildBatchMockDb()
		vi.mocked(getDb).mockReturnValue(db)

		const before = Date.now()
		const { scheduledForDeletionAt } = await softDeleteUser(mockEnv, 'u1')
		const after = Date.now()

		expect(scheduledForDeletionAt).toBeInstanceOf(Date)
		expect(scheduledForDeletionAt.getTime()).toBeGreaterThanOrEqual(
			before + DELETION_GRACE_PERIOD_MS,
		)
		expect(scheduledForDeletionAt.getTime()).toBeLessThanOrEqual(
			after + DELETION_GRACE_PERIOD_MS,
		)
		expect(batchSpy).toHaveBeenCalledTimes(1)
	})

	test('calls db.batch() with 7 operations (1 update + 6 deletes)', async () => {
		const { db, batchSpy, updateSpy, deleteSpy } = buildBatchMockDb()
		vi.mocked(getDb).mockReturnValue(db)

		await softDeleteUser(mockEnv, 'u1')

		expect(batchSpy).toHaveBeenCalledTimes(1)
		const [ops] = batchSpy.mock.calls[0] as [unknown[]]
		expect(ops).toHaveLength(7)
		// 1 update for users anonymisation
		expect(updateSpy).toHaveBeenCalledTimes(1)
		// 6 deletes for credential/session tables
		expect(deleteSpy).toHaveBeenCalledTimes(6)
	})
})

// ── findBlockingWorkspaces ─────────────────────────────────────────────────────

describe('findBlockingWorkspaces', () => {
	// findBlockingWorkspaces makes two sequential select() calls:
	// Slot 0: owned non-personal workspaces (user is owner)
	// Slot 1: owner counts per workspace

	test('returns empty array when user owns no non-personal workspaces', async () => {
		vi.mocked(getDb).mockReturnValue(
			buildMockDb([
				[], // slot 0: no owned workspaces
			]),
		)

		const result = await findBlockingWorkspaces(mockEnv, 'u1')
		expect(result).toEqual([])
	})

	test('returns empty array when user is co-owner (another owner exists)', async () => {
		const ownedRow = { workspaceId: 'ws-1', name: 'Acme', slug: 'acme' }
		const countRow = { workspaceId: 'ws-1', ownerCount: 2 }

		vi.mocked(getDb).mockReturnValue(
			buildMockDb([
				[ownedRow], // slot 0: user is owner of ws-1
				[countRow], // slot 1: ws-1 has 2 owners
			]),
		)

		const result = await findBlockingWorkspaces(mockEnv, 'u1')
		expect(result).toEqual([])
	})

	test('returns workspace when user is sole owner', async () => {
		const ownedRow = { workspaceId: 'ws-1', name: 'Acme', slug: 'acme' }
		const countRow = { workspaceId: 'ws-1', ownerCount: 1 }

		vi.mocked(getDb).mockReturnValue(
			buildMockDb([
				[ownedRow], // slot 0: user is sole owner of ws-1
				[countRow], // slot 1: ws-1 has 1 owner
			]),
		)

		const result = await findBlockingWorkspaces(mockEnv, 'u1')
		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			workspaceId: 'ws-1',
			name: 'Acme',
			slug: 'acme',
		})
	})
})
