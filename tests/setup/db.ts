/**
 * Real-database test helper using node:sqlite in-memory databases.
 *
 * Provides a `NodeSqliteD1Shim` that wraps `DatabaseSync` to match the subset
 * of the D1Database interface that Drizzle's D1 adapter actually uses at
 * runtime, plus a `createTestDb()` helper that returns a fully-migrated Drizzle
 * instance backed by an isolated in-memory SQLite database.
 *
 * Each call to `createTestDb()` creates a fresh database, so tests are fully
 * isolated without any per-worker file management.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'

import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'

// Using relative import to avoid tsconfig path alias issues in Node context.
import * as schema from '../../app/db/schema'

/** The return type of createTestDb() — a Drizzle D1 instance with the full app schema. */
export type TestDb = DrizzleD1Database<typeof schema>

const MIGRATIONS_DIR = join(import.meta.dirname, '../../migrations')

/**
 * Wraps a `DatabaseSync` statement + bound values to match the subset of
 * `D1PreparedStatement` that Drizzle's D1 session calls at runtime:
 *   - `bind(...values)` → new instance with values captured
 *   - `run()`           → execute a write statement
 *   - `all()`           → return `{ results }` for reads
 *   - `raw()`           → return column-ordered value arrays (used by Drizzle
 *                         when field mapping is active)
 */
class NodeSqliteD1PreparedStatement {
	private boundValues: SQLInputValue[] = []

	constructor(
		private readonly sqlite: DatabaseSync,
		private readonly sql: string,
	) {}

	bind(...values: unknown[]): NodeSqliteD1PreparedStatement {
		const next = new NodeSqliteD1PreparedStatement(this.sqlite, this.sql)
		next.boundValues = values as SQLInputValue[]
		return next
	}

	async run(): Promise<{ success: boolean; meta: Record<string, unknown> }> {
		this.sqlite.prepare(this.sql).run(...this.boundValues)
		return { success: true, meta: {} }
	}

	async all(): Promise<{
		results: Record<string, unknown>[]
		success: boolean
		meta: Record<string, unknown>
	}> {
		const results = this.sqlite
			.prepare(this.sql)
			.all(...this.boundValues) as Record<string, unknown>[]
		return { results, success: true, meta: {} }
	}

	/** Returns rows as arrays of values in SELECT column order. */
	async raw(): Promise<unknown[][]> {
		const rows = this.sqlite
			.prepare(this.sql)
			.all(...this.boundValues) as Record<string, unknown>[]
		return rows.map((row) => Object.values(row))
	}
}

/** Minimal D1Database shim — only implements `prepare()` which is all Drizzle needs. */
class NodeSqliteD1Shim {
	constructor(private readonly sqlite: DatabaseSync) {}

	prepare(sql: string): NodeSqliteD1PreparedStatement {
		return new NodeSqliteD1PreparedStatement(this.sqlite, sql)
	}
}

/** Runs all Drizzle migration files against the given in-memory database. */
function applyMigrations(sqlite: DatabaseSync): void {
	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort()

	for (const file of files) {
		const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
		// Migration files use '--> statement-breakpoint' as the statement separator.
		for (const stmt of content.split('--> statement-breakpoint')) {
			const trimmed = stmt.trim()
			if (trimmed) sqlite.exec(trimmed)
		}
	}
}

/**
 * Creates a fully-migrated Drizzle D1 instance backed by a fresh in-memory
 * SQLite database.  Foreign key enforcement is ON (left at the state the
 * migrations leave it in).  Use factory helpers from `./factories` to create
 * any required parent rows before inserting dependent records.
 */
export function createTestDb(): TestDb {
	const sqlite = new DatabaseSync(':memory:')
	applyMigrations(sqlite)
	// The internal `as any` bridges NodeSqliteD1Shim to the Cloudflare D1Database
	// type that Drizzle expects.  The cast is safe: the shim implements all
	// methods Drizzle's D1 adapter actually calls at runtime.
	return drizzle(new NodeSqliteD1Shim(sqlite) as any, {
		schema,
	}) as unknown as TestDb
}
