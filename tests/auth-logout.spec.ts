import { test, expect } from '@playwright/test'
import { signUp } from './auth-helpers'

test.describe('Logout', () => {
	test('clears session cookie and redirects to login on protected page', async ({
		page,
	}) => {
		await signUp(page)

		// POST to the logout resource route
		await page.request.post('/resources/logout')

		// Session cookie should be cleared
		const cookies = await page.context().cookies()
		expect(cookies.find((c) => c.name === 'en_session')?.value).toBeFalsy()

		// Visiting a protected page should redirect to login
		await page.goto('/settings/change-password')
		await expect(page).toHaveURL(/\/login/)
	})
})
