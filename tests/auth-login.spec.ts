import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { logIn, signUp, TEST_PASSWORD, uniqueEmail } from './auth-helpers'

test.describe('Login', () => {
	test('logs in with valid credentials and redirects to team', async ({
		page,
	}) => {
		const { email } = await signUp(page)
		await page.context().clearCookies()

		await logIn(page, { email })
		await expect(page).toHaveURL(/\/teams\//)
		const cookies = await page.context().cookies()
		expect(cookies.some((c) => c.name === 'en_session')).toBe(true)
	})

	test('shows error for non-existent email', async ({ page }) => {
		await page.goto('/login')
		await page.getByLabel('Email').fill(uniqueEmail())
		await page.getByLabel('Password').fill(TEST_PASSWORD)
		await page.getByRole('button', { name: 'Sign in' }).click()

		await expect(page.getByText('Invalid email or password')).toBeVisible()
	})

	test('shows error for correct email + wrong password', async ({ page }) => {
		const { email } = await signUp(page)
		await page.context().clearCookies()

		await page.goto('/login')
		await page.getByLabel('Email').fill(email)
		await page.getByLabel('Password').fill('wrong-password-123')
		await page.getByRole('button', { name: 'Sign in' }).click()

		await expect(page.getByText('Invalid email or password')).toBeVisible()
	})

	test('honors redirectTo query param', async ({ page }) => {
		const { email } = await signUp(page)
		await page.context().clearCookies()

		await logIn(page, {
			email,
			redirectTo: '/settings/change-password',
		})
		await expect(page).toHaveURL('/settings/change-password')
	})

	test('has a forgot-password link', async ({ page }) => {
		await page.goto('/login')
		const link = page.getByRole('link', { name: 'Forgot password?' })
		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute('href', '/forgot-password')
	})

	test('passes accessibility scan', async ({ page }) => {
		await page.goto('/login')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
