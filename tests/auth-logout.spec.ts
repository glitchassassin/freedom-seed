import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { signUp } from './auth-helpers'

test.describe('Logout', () => {
	test('clears session cookie and redirects to login on protected page', async ({
		page,
	}) => {
		await signUp(page)

		// Navigate to an authenticated page so the _authenticated layout renders
		// with the sign-out button
		await page.goto('/settings/change-password')

		// Click the sign-out button rendered by the _authenticated layout
		await page.getByRole('button', { name: 'Sign out' }).click()

		// Wait for the "Signed out" toast to confirm the round-trip completed
		await expect(page.getByText('Signed out')).toBeVisible()

		// Session cookie should be cleared
		const cookies = await page.context().cookies()
		expect(cookies.find((c) => c.name === 'en_session')?.value).toBeFalsy()

		// Visiting a protected page should redirect to login
		await page.goto('/settings/change-password')
		await expect(page).toHaveURL(/\/login/)
	})

	test('authenticated layout passes accessibility scan', async ({ page }) => {
		await signUp(page)
		await page.goto('/settings/change-password')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
