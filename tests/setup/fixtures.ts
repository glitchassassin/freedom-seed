/**
 * Custom Vitest fixtures for unit tests backed by a real in-memory database.
 *
 * Import `test`, `expect`, and `describe` from this module instead of
 * `vitest` to get access to the `db` and `workspace` fixtures.
 *
 * - `db`        — a fresh, fully-migrated TestDb per test
 * - `workspace` — a workspace row pre-inserted in that test's db; only
 *                 materialised when the test destructures it
 */
import { test as base } from 'vitest'

import { createTestDb } from './db'
import type { TestDb } from './db'
import { createWorkspace } from './factories'
import type { WorkspaceRow } from './factories'

interface UnitFixtures {
	db: TestDb
	workspace: WorkspaceRow
}

export const test = base.extend<UnitFixtures>({
	db: async ({}, use) => {
		await use(createTestDb())
	},
	workspace: async ({ db }, use) => {
		await use(await createWorkspace(db))
	},
})

export { expect, describe, it } from 'vitest'
