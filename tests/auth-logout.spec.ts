import { test, expect } from '@playwright/test'
import { signUp } from './auth-helpers'

test.describe('Logout', () => {
	test('clears session cookie and redirects to login on protected page', async ({
		page,
	}) => {
		await signUp(page)

		// Submit a logout form via the browser (not page.request) so
		// Set-Cookie headers from the redirect response are applied.
		// Use a string expression to avoid DOM type errors in the Node.js context.
		await page.evaluate(`(() => {
			const f = document.createElement('form');
			f.method = 'POST';
			f.action = '/resources/logout';
			document.body.append(f);
			f.submit();
		})()`)
		// Wait for the "Signed out" toast to confirm the round-trip completed
		await expect(page.getByText('Signed out')).toBeVisible()

		// Session cookie should be cleared
		const cookies = await page.context().cookies()
		expect(cookies.find((c) => c.name === 'en_session')?.value).toBeFalsy()

		// Visiting a protected page should redirect to login
		await page.goto('/settings/change-password')
		await expect(page).toHaveURL(/\/login/)
	})
})
