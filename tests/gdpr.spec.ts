import AxeBuilder from '@axe-core/playwright'
import { clearCapturedEmails, waitForEmail } from './email-helpers'
import { test, expect } from './playwright-utils'

test.describe('GDPR — Delete Account', () => {
	test('shows field error when wrong email is submitted', async ({
		page,
		login,
	}) => {
		await login()
		await page.goto('/settings/delete-account')

		await page
			.getByRole('textbox', { name: /confirm your email/i })
			.fill('wrong@example.com')
		await page
			.getByRole('button', { name: /permanently delete my account/i })
			.click()

		await expect(page.getByText('Email address does not match')).toBeVisible()
	})

	test('correct email sends confirmation email, logs out, and redirects to /login', async ({
		page,
		login,
	}) => {
		const { user } = await login()
		clearCapturedEmails()

		await page.goto('/settings/delete-account')

		await page
			.getByRole('textbox', { name: /confirm your email/i })
			.fill(user.email)
		await page
			.getByRole('button', { name: /permanently delete my account/i })
			.click()

		// Should receive a confirmation email
		const captured = await waitForEmail(user.email)
		expect(captured.subject).toBe('Your account deletion request')

		// Should be redirected to /login (via /)
		await expect(page).toHaveURL(/\/login/)

		// Session cookie should be cleared
		const cookies = await page.context().cookies()
		expect(cookies.find((c) => c.name === 'en_session')?.value).toBeFalsy()
	})

	test('protected pages redirect to /login after account deletion', async ({
		page,
		login,
	}) => {
		const { user } = await login()
		clearCapturedEmails()

		await page.goto('/settings/delete-account')

		await page
			.getByRole('textbox', { name: /confirm your email/i })
			.fill(user.email)
		await page
			.getByRole('button', { name: /permanently delete my account/i })
			.click()

		// Wait for redirect away from delete-account
		await expect(page).toHaveURL(/\/login/)

		// Visiting a protected page should still redirect to login
		await page.goto('/settings/change-password')
		await expect(page).toHaveURL(/\/login/)
	})

	test('passes accessibility scan', async ({ page, login }) => {
		await login()
		await page.goto('/settings/delete-account')

		const results = await new AxeBuilder({ page })
			.exclude('[data-sonner-toast]')
			.analyze()
		expect(results.violations).toEqual([])
	})
})

test.describe('GDPR — Cookie Consent Banner', () => {
	test('shows consent banner for new visitor with no consent cookie', async ({
		page,
	}) => {
		// Ensure no en_consent cookie is set (fresh context)
		await page.goto('/')

		await expect(
			page.getByRole('dialog', { name: /cookie consent/i }),
		).toBeVisible()
	})

	test('clicking Accept sets en_consent=granted and hides banner', async ({
		page,
	}) => {
		await page.goto('/')

		await page.getByRole('button', { name: 'Accept' }).click()

		// Banner should disappear
		await expect(
			page.getByRole('dialog', { name: /cookie consent/i }),
		).not.toBeVisible()

		// Cookie should be set to granted
		const cookies = await page.context().cookies()
		const consent = cookies.find((c) => c.name === 'en_consent')
		expect(consent?.value).toBe('granted')
	})

	test('clicking Decline sets en_consent=denied and hides banner', async ({
		page,
	}) => {
		await page.goto('/')

		await page.getByRole('button', { name: 'Decline' }).click()

		// Banner should disappear
		await expect(
			page.getByRole('dialog', { name: /cookie consent/i }),
		).not.toBeVisible()

		// Cookie should be set to denied
		const cookies = await page.context().cookies()
		const consent = cookies.find((c) => c.name === 'en_consent')
		expect(consent?.value).toBe('denied')
	})

	test('banner is not shown after accepting and revisiting the page', async ({
		page,
	}) => {
		await page.goto('/')
		await page.getByRole('button', { name: 'Accept' }).click()

		// Wait for the banner to disappear
		await expect(
			page.getByRole('dialog', { name: /cookie consent/i }),
		).not.toBeVisible()

		// Revisit the home page
		await page.goto('/')

		// Banner should not be shown again
		await expect(
			page.getByRole('dialog', { name: /cookie consent/i }),
		).not.toBeVisible()
	})

	test('passes accessibility scan when banner is visible', async ({ page }) => {
		await page.goto('/')

		// Confirm banner is visible before scanning
		await expect(
			page.getByRole('dialog', { name: /cookie consent/i }),
		).toBeVisible()

		const results = await new AxeBuilder({ page })
			.exclude('[data-sonner-toast]')
			.analyze()
		expect(results.violations).toEqual([])
	})
})
