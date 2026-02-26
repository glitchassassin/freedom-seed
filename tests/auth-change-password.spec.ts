import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import {
	logIn,
	signUp,
	TEST_NEW_PASSWORD,
	TEST_PASSWORD,
	uniqueEmail,
} from './auth-helpers'

test.describe('Change password', () => {
	test('changes password successfully and can log in with new password', async ({
		page,
	}) => {
		const email = uniqueEmail()
		await signUp(page, { email })

		await page.goto('/settings/change-password')
		await page.getByLabel('Current password').fill(TEST_PASSWORD)
		await page
			.getByLabel('New password', { exact: true })
			.fill(TEST_NEW_PASSWORD)
		await page.getByLabel('Confirm new password').fill(TEST_NEW_PASSWORD)
		await page.getByRole('button', { name: 'Change password' }).click()

		// Wait for success toast to confirm the password was changed
		await expect(page.getByText('Password changed')).toBeVisible()

		// Log out (clear cookies) and log in with the new password
		await page.context().clearCookies()
		await logIn(page, { email, password: TEST_NEW_PASSWORD })
		await expect(page).toHaveURL(/\/workspaces\//)
	})

	test('shows error for wrong current password', async ({ page }) => {
		await signUp(page)

		await page.goto('/settings/change-password')
		await page.getByLabel('Current password').fill('wrong-current-pw')
		await page
			.getByLabel('New password', { exact: true })
			.fill(TEST_NEW_PASSWORD)
		await page.getByLabel('Confirm new password').fill(TEST_NEW_PASSWORD)
		await page.getByRole('button', { name: 'Change password' }).click()

		await expect(page.getByText('Current password is incorrect')).toBeVisible()
	})

	test('shows validation error for short new password', async ({ page }) => {
		await signUp(page)

		await page.goto('/settings/change-password')
		await page.getByLabel('Current password').fill(TEST_PASSWORD)
		await page.getByLabel('New password', { exact: true }).fill('short')
		await page.getByLabel('Confirm new password').fill('short')
		await page.getByRole('button', { name: 'Change password' }).click()

		await expect(
			page.getByText('Password must be at least 8 characters'),
		).toBeVisible()
	})

	test('shows validation error for password mismatch', async ({ page }) => {
		await signUp(page)

		await page.goto('/settings/change-password')
		await page.getByLabel('Current password').fill(TEST_PASSWORD)
		await page
			.getByLabel('New password', { exact: true })
			.fill(TEST_NEW_PASSWORD)
		await page.getByLabel('Confirm new password').fill('different1')
		await page.getByRole('button', { name: 'Change password' }).click()

		await expect(page.getByText('Passwords do not match')).toBeVisible()
	})

	test('passes accessibility scan', async ({ page }) => {
		await signUp(page)
		await page.goto('/settings/change-password')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
