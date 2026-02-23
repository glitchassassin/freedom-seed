import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { signUp, uniqueEmail } from './auth-helpers'

test.describe('Forgot password', () => {
	test('shows success message for non-existent email (prevents enumeration)', async ({
		page,
	}) => {
		await page.goto('/forgot-password')
		await page.getByLabel('Email').fill(uniqueEmail())
		await page.getByRole('button', { name: 'Send reset link' }).click()

		await expect(page.getByText('Check your email')).toBeVisible()
		await expect(
			page.getByText("you'll receive a reset link shortly"),
		).toBeVisible()
	})

	test('shows success message for existing email', async ({ page }) => {
		const { email } = await signUp(page)
		await page.context().clearCookies()

		await page.goto('/forgot-password')
		await page.getByLabel('Email').fill(email)
		await page.getByRole('button', { name: 'Send reset link' }).click()

		await expect(page.getByText('Check your email')).toBeVisible()
	})

	test('passes accessibility scan', async ({ page }) => {
		await page.goto('/forgot-password')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
