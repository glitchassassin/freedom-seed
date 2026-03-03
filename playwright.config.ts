import { defineConfig, devices } from '@playwright/test'

const changedTestFiles = (process.env.CHANGED_TEST_FILES ?? '')
	.split('\n')
	.filter(Boolean)
	.map((f) => f.replace(/^tests\//, ''))

const browsers = [
	{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
	{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
]

const projects =
	changedTestFiles.length > 0
		? browsers.flatMap((browser) => [
				{
					name: `${browser.name} (changed)`,
					use: { ...browser.use, trace: 'on' },
					testMatch: changedTestFiles,
				},
				{
					name: browser.name,
					use: { ...browser.use, trace: 'on-first-retry' },
					testIgnore: changedTestFiles,
				},
			])
		: browsers.map((browser) => ({
				name: browser.name,
				use: { ...browser.use },
			}))

export default defineConfig({
	testDir: './tests',
	globalSetup: './tests/global-setup.ts',
	globalTeardown: './tests/global-teardown.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 4 : undefined,
	reporter: 'html',
	use: {
		trace: 'on-first-retry',
	},
	projects,
})
