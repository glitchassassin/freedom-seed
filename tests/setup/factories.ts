/**
 * Unit-test factory helpers — create rows in a TestDb (in-memory Drizzle
 * instance).  These are analogous to the E2E factories in `tests/factories/`
 * but operate on the Drizzle API rather than raw node:sqlite.
 */

// Using relative imports to avoid tsconfig path alias issues in Node context.
import { workspaces } from '../../app/db/schema'
import type { TestDb } from './db'

export type WorkspaceRow = typeof workspaces.$inferSelect

export interface CreateWorkspaceOptions {
	id?: string
	name?: string
	slug?: string
	isPersonal?: boolean
}

/** Inserts a workspace row and returns the full inserted record. */
export async function createWorkspace(
	db: TestDb,
	overrides?: CreateWorkspaceOptions,
): Promise<WorkspaceRow> {
	const [workspace] = await db
		.insert(workspaces)
		.values({
			...(overrides?.id ? { id: overrides.id } : {}),
			name: overrides?.name ?? 'Test Workspace',
			slug: overrides?.slug ?? `workspace-${crypto.randomUUID().slice(0, 8)}`,
			isPersonal: overrides?.isPersonal ?? false,
		})
		.returning()
	return workspace
}
