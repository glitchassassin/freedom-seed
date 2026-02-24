import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { signUp, uniqueEmail } from './auth-helpers'
import { clearCapturedEmails, waitForEmail } from './email-helpers'

test.describe('Email Verification', () => {
	test.beforeEach(() => {
		clearCapturedEmails()
	})

	test('signup sends verification email and token link works', async ({
		page,
	}) => {
		const email = uniqueEmail()
		await signUp(page, { email })

		// Wait for the verification email to be captured
		const captured = await waitForEmail(email)
		expect(captured.subject).toContain('Verify')
		expect(captured.to).toContain(email)

		// Extract the verification URL from the HTML
		const match = captured.html.match(/href="([^"]*verify-email\?token=[^"]*)"/)
		expect(match).toBeTruthy()
		const verifyUrl = match![1]

		// Navigate to the verification URL
		// The URL from the email is absolute (http://localhost:4173/verify-email?token=...)
		// so we extract just the path + query
		const url = new URL(verifyUrl)
		await page.goto(url.pathname + url.search)

		// After verification, should redirect to / with "Email verified" toast
		await expect(page).toHaveURL('/')
		await expect(page.getByText('Email verified')).toBeVisible()
	})

	test('verify-email page passes accessibility scan', async ({ page }) => {
		await page.goto('/verify-email')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
