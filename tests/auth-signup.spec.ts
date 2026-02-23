import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { signUp, TEST_PASSWORD, uniqueEmail } from './auth-helpers'

test.describe('Signup', () => {
	test('creates an account and redirects to home', async ({ page }) => {
		await signUp(page)
		// Verify we're on the home page after signup
		await expect(page).toHaveURL('/')
		// Session cookie should be set
		const cookies = await page.context().cookies()
		expect(cookies.some((c) => c.name === 'en_session')).toBe(true)
	})

	test('shows error for duplicate email', async ({ page }) => {
		const email = uniqueEmail()
		await signUp(page, { email })

		// Clear cookies and try signing up with same email
		await page.context().clearCookies()
		await page.goto('/signup')
		await page.getByLabel('Email').fill(email)
		await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
		await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
		await page.getByRole('button', { name: 'Create account' }).click()

		await expect(
			page.getByText('An account with that email already exists'),
		).toBeVisible()
	})

	test('shows validation error for short password', async ({ page }) => {
		await page.goto('/signup')
		await page.getByLabel('Email').fill(uniqueEmail())
		await page.getByLabel('Password', { exact: true }).fill('short')
		await page.getByLabel('Confirm password').fill('short')
		await page.getByRole('button', { name: 'Create account' }).click()

		await expect(
			page.getByText('Password must be at least 8 characters'),
		).toBeVisible()
	})

	test('shows validation error for password mismatch', async ({ page }) => {
		await page.goto('/signup')
		await page.getByLabel('Email').fill(uniqueEmail())
		await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
		await page.getByLabel('Confirm password').fill('different1')
		await page.getByRole('button', { name: 'Create account' }).click()

		await expect(page.getByText('Passwords do not match')).toBeVisible()
	})

	test('passes accessibility scan', async ({ page }) => {
		await page.goto('/signup')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
