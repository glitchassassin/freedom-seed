import type { Page } from '@playwright/test'

export const TEST_PASSWORD = 'Test1234!'
export const TEST_NEW_PASSWORD = 'NewPass99!'

/** Generates a unique email for test isolation. */
export function uniqueEmail(): string {
	const ts = Date.now()
	const rand = Math.random().toString(36).slice(2, 8)
	return `test+${ts}-${rand}@example.com`
}

/** Fills the signup form and waits for redirect to workspace dashboard. */
export async function signUp(
	page: Page,
	options?: { email?: string; password?: string },
) {
	const email = options?.email ?? uniqueEmail()
	const password = options?.password ?? TEST_PASSWORD

	await page.goto('/signup')
	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password', { exact: true }).fill(password)
	await page.getByLabel('Confirm password').fill(password)
	await page.getByRole('button', { name: 'Create account' }).click()
	await page.waitForURL(/\/workspaces\//)

	return { email, password }
}

/** Fills the login form and waits for redirect (default: workspace dashboard). */
export async function logIn(
	page: Page,
	options: { email: string; password?: string; redirectTo?: string },
) {
	const password = options.password ?? TEST_PASSWORD
	const loginUrl = options.redirectTo
		? `/login?redirectTo=${encodeURIComponent(options.redirectTo)}`
		: '/login'

	await page.goto(loginUrl)
	await page.getByLabel('Email').fill(options.email)
	await page.getByLabel('Password').fill(password)
	await page.getByRole('button', { name: 'Sign in' }).click()

	if (options.redirectTo) {
		await page.waitForURL(options.redirectTo)
	} else {
		await page.waitForURL(/\/workspaces\//)
	}
}
