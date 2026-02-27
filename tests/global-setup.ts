import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { start } from './mocks/resend-server'
import { cleanupLeftoverWorkerDirs } from './worker-server'

const PROJECT_ROOT = join(import.meta.dirname, '..')

export default async function globalSetup() {
	// Clean up leftover temp dirs from previous crashes
	cleanupLeftoverWorkerDirs()

	// Build the app with mock email URL baked in
	execSync('npm run build', {
		cwd: PROJECT_ROOT,
		stdio: 'inherit',
		env: {
			...process.env,
			RESEND_BASE_URL: 'http://localhost:3001',
			CLOUDFLARE_ENV: 'test',
		},
	})

	// Apply migrations to create baseline .wrangler/state/
	execSync('npx wrangler d1 migrations apply freedom-seed --local --env test', {
		cwd: PROJECT_ROOT,
		stdio: 'inherit',
	})

	// Start mock Resend server
	await start()
}
