import AxeBuilder from '@axe-core/playwright'
import { logIn, uniqueEmail } from './auth-helpers'
import { seedPasswordResetToken } from './db-helpers'
import { createUser } from './factories'
import { test, expect } from './playwright-utils'

const NEW_PASSWORD = 'ResetPass99!'

test.describe('Reset password', () => {
	test('shows invalid link message when no token is provided', async ({
		page,
	}) => {
		await page.goto('/reset-password')
		await expect(page.getByText('Invalid reset link')).toBeVisible()
		await expect(
			page.getByText('This reset link has expired or already been used'),
		).toBeVisible()
	})

	test('shows invalid link message for a bad token', async ({ page }) => {
		await page.goto('/reset-password?token=invalid-garbage-token')
		await expect(page.getByText('Invalid reset link')).toBeVisible()
	})

	test('resets password via valid token and can log in with new password', async ({
		page,
	}) => {
		const email = uniqueEmail()
		const { user } = await createUser({ email })

		// Seed a reset token directly in D1
		const rawToken = seedPasswordResetToken(user.id)

		// Navigate to reset page with the valid token
		await page.goto(`/reset-password?token=${rawToken}`)
		await expect(page.getByText('Reset your password')).toBeVisible()

		// Submit new password
		await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
		await page.getByLabel('Confirm new password').fill(NEW_PASSWORD)
		await page.getByRole('button', { name: 'Reset password' }).click()

		// Should redirect to home with a new session
		await page.waitForURL(/\/workspaces\//)

		// Verify we can log in with the new password
		await page.context().clearCookies()
		await logIn(page, { email, password: NEW_PASSWORD })
		await expect(page).toHaveURL(/\/workspaces\//)
	})

	test('passes accessibility scan (invalid state)', async ({ page }) => {
		await page.goto('/reset-password')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
