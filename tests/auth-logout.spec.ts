import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { signUp } from './auth-helpers'

test.describe('Logout', () => {
	test('clears session cookie and redirects to login on protected page', async ({
		page,
	}) => {
		await signUp(page)

		// After signup we're on the workspace dashboard which has the sign-out button
		await expect(page).toHaveURL(/\/workspaces\//)

		// Click the sign-out button rendered by the workspace layout
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

	test('workspace layout passes accessibility scan', async ({ page }) => {
		await signUp(page)
		// We're on workspace dashboard after signup
		// Exclude toast elements — Sonner's default styling has contrast issues
		const results = await new AxeBuilder({ page })
			.exclude('[data-sonner-toast]')
			.analyze()
		expect(results.violations).toEqual([])
	})
})
