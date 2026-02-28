import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		setupFiles: ['./tests/setup/vitest-setup.ts'],
		include: ['app/**/*.test.ts'],
		environment: 'node',
	},
})
