import { execSync, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import {
	closeSync,
	cpSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PROJECT_ROOT = join(import.meta.dirname, '..')

export interface WorkerServer {
	tmpDir: string
	port: number
	process: ChildProcess
}

export async function startWorkerServer(
	workerIndex: number,
): Promise<WorkerServer> {
	const port = 4200 + workerIndex
	const tmpDir = join(tmpdir(), `freedom-seed-worker-${workerIndex}`)

	// Clean up any leftover dir from a previous run
	if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
	mkdirSync(tmpDir, { recursive: true })

	// Symlink everything from project root except directories that are written
	// to at runtime (each worker needs its own copy to avoid race conditions).
	const COPY_DIRS = new Set(['.wrangler', '.react-router'])
	const entries = readdirSync(PROJECT_ROOT)
	for (const entry of entries) {
		if (COPY_DIRS.has(entry)) continue
		symlinkSync(join(PROJECT_ROOT, entry), join(tmpDir, entry))
	}

	// Deep-copy .react-router/ (the react-router plugin writes types at startup)
	const srcReactRouter = join(PROJECT_ROOT, '.react-router')
	if (existsSync(srcReactRouter)) {
		cpSync(srcReactRouter, join(tmpDir, '.react-router'), { recursive: true })
	}

	// Deep-copy .wrangler/state/ (contains D1 SQLite), symlink .wrangler/deploy/ if it exists
	const wranglerDir = join(tmpDir, '.wrangler')
	mkdirSync(wranglerDir, { recursive: true })

	const srcState = join(PROJECT_ROOT, '.wrangler', 'state')
	if (existsSync(srcState)) {
		cpSync(srcState, join(wranglerDir, 'state'), { recursive: true })
	}

	const srcDeploy = join(PROJECT_ROOT, '.wrangler', 'deploy')
	if (existsSync(srcDeploy)) {
		symlinkSync(srcDeploy, join(wranglerDir, 'deploy'))
	}

	// Kill any leftover process on this port from a previous crashed run
	try {
		const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim()
		if (pids) {
			for (const pid of pids.split('\n')) {
				try {
					process.kill(Number(pid), 'SIGKILL')
				} catch {
					// Already dead
				}
			}
		}
	} catch {
		// No process on port — expected
	}

	// Spawn vite preview in the temp dir
	// CLOUDFLARE_ENV is not needed here — the test environment was already
	// baked into build/server/wrangler.json during the global-setup build.
	const logPath = join(tmpdir(), `freedom-seed-worker-${workerIndex}.log`)
	const logFd = openSync(logPath, 'w')
	const child = spawn(
		'npx',
		['vite', 'preview', '--port', String(port), '--strictPort'],
		{
			cwd: tmpDir,
			stdio: ['ignore', logFd, logFd],
			detached: true,
			env: { ...process.env, CF_INSPECTOR_PORT: 'false' },
		},
	)
	// Close fd in parent — child has its own copy
	closeSync(logFd)

	// Track early exit for better error messages
	let exitCode: number | null = null
	child.on('exit', (code) => {
		exitCode = code
	})

	// Wait for the server to be ready (poll up to 60s — miniflare cold start is slow)
	const url = `http://localhost:${port}`
	const deadline = Date.now() + 60_000
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url)
			if (res.ok || res.status < 500) break
		} catch {
			// Not ready yet
		}
		await new Promise((r) => setTimeout(r, 250))
	}

	// Verify it actually started and is healthy
	try {
		const res = await fetch(url)
		if (res.status >= 500) throw new Error(`Server returned ${res.status}`)
	} catch {
		child.kill()
		let log = ''
		try {
			log = readFileSync(logPath, 'utf-8')
		} catch {
			// ignore
		}
		throw new Error(
			`Worker server on port ${port} failed to start within 60s (exit=${exitCode}).\nLog: ${log}`,
		)
	}

	return { tmpDir, port, process: child }
}

export function stopWorkerServer(server: WorkerServer): void {
	try {
		// Kill the process group (detached)
		if (server.process.pid) {
			process.kill(-server.process.pid, 'SIGTERM')
		}
	} catch {
		// Process may have already exited
	}
	try {
		rmSync(server.tmpDir, { recursive: true, force: true })
	} catch {
		// Best-effort cleanup
	}
}

/** Removes leftover temp dirs from crashed previous runs. */
export function cleanupLeftoverWorkerDirs(): void {
	const tmp = tmpdir()
	try {
		const entries = readdirSync(tmp)
		for (const entry of entries) {
			if (entry.startsWith('freedom-seed-worker-')) {
				rmSync(join(tmp, entry), { recursive: true, force: true })
			}
		}
	} catch {
		// Ignore
	}
}
