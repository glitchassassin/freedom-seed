import { test, expect } from './playwright-utils'

test.describe('Auth guards', () => {
	test('unauthenticated user visiting protected route redirects to login with redirectTo', async ({
		page,
	}) => {
		await page.goto('/settings/change-password')
		await expect(page).toHaveURL(
			'/login?redirectTo=%2Fsettings%2Fchange-password',
		)
	})

	test('authenticated user visiting /login redirects to workspace dashboard', async ({
		page,
		login,
	}) => {
		await login()
		await page.goto('/login')
		await expect(page).toHaveURL(/\/workspaces\//)
	})

	test('authenticated user visiting /signup redirects to workspace dashboard', async ({
		page,
		login,
	}) => {
		await login()
		await page.goto('/signup')
		await expect(page).toHaveURL(/\/workspaces\//)
	})
})
