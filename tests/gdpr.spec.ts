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

test.describe('GDPR — Data Export', () => {
	test('authenticated user can GET /resources/account/export-data and receives JSON with expected top-level keys', async ({
		page,
		login,
	}) => {
		await login()

		const response = await page.request.get('/resources/account/export-data')

		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toContain('application/json')

		const data = await response.json()
		expect(data).toHaveProperty('exportedAt')
		expect(data).toHaveProperty('user')
		expect(data).toHaveProperty('sessions')
		expect(data).toHaveProperty('workspaceMemberships')
		expect(data).toHaveProperty('connectedAccounts')
		expect(data).toHaveProperty('passkeys')
		expect(data).toHaveProperty('mfaEnabled')
	})

	test('unauthenticated request redirects to /login', async ({ page }) => {
		const response = await page.request.get('/resources/account/export-data', {
			maxRedirects: 0,
		})

		// Should redirect (3xx) or ultimately land on /login
		expect([301, 302, 303, 307, 308].includes(response.status())).toBe(true)
		const location = response.headers()['location']
		expect(location).toMatch(/\/login/)
	})

	test('export excludes sensitive fields (no password hashes, no TOTP secrets)', async ({
		page,
		login,
	}) => {
		await login()

		const response = await page.request.get('/resources/account/export-data')
		const data = await response.json()

		// Top-level response must not contain sensitive credential fields
		const json = JSON.stringify(data)
		expect(json).not.toContain('passwordHash')
		expect(json).not.toContain('totpSecret')
		expect(json).not.toContain('secret')
		expect(json).not.toContain('backupCodes')
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
