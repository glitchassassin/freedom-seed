import { describe, expect, test, vi } from 'vitest'

vi.mock('../db/client.server', () => ({
	getDb: vi.fn(),
}))

import { getDb } from '../db/client.server'
import { exportUserData } from './gdpr.server'

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
			const withLimit = Object.assign(p, {
				limit: (_n: number) => Promise.resolve(rows),
			})
			return withLimit
		}

		// Chain: .from(table).innerJoin?(...).where(pred)
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
