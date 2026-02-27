import AxeBuilder from '@axe-core/playwright'
import { createSocialIdentity } from './factories'
import { test, expect } from './playwright-utils'

test.describe('Social login', () => {
	test.describe('Login page', () => {
		test('shows Google and GitHub sign-in buttons', async ({ page }) => {
			await page.goto('/login')

			await expect(
				page.getByRole('link', { name: /Continue with Google/i }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /Continue with GitHub/i }),
			).toBeVisible()
		})

		test('Google button links to /social/google', async ({ page }) => {
			await page.goto('/login')
			const googleLink = page.getByRole('link', {
				name: /Continue with Google/i,
			})
			await expect(googleLink).toHaveAttribute('href', '/social/google')
		})

		test('GitHub button links to /social/github', async ({ page }) => {
			await page.goto('/login')
			const githubLink = page.getByRole('link', {
				name: /Continue with GitHub/i,
			})
			await expect(githubLink).toHaveAttribute('href', '/social/github')
		})
	})

	test.describe('Signup page', () => {
		test('shows Google and GitHub sign-up buttons', async ({ page }) => {
			await page.goto('/signup')

			await expect(
				page.getByRole('link', { name: /Sign up with Google/i }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /Sign up with GitHub/i }),
			).toBeVisible()
		})
	})

	test.describe('Connected accounts settings', () => {
		test('shows empty state with connect buttons', async ({ page, login }) => {
			await login()
			await page.goto('/settings/connected-accounts')

			await expect(
				page.getByRole('heading', { name: 'Connected accounts' }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /Connect with Google/i }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /Connect with GitHub/i }),
			).toBeVisible()
		})

		test('displays connected social identity', async ({ page, login }) => {
			const { user } = await login()
			createSocialIdentity({
				userId: user.id,
				provider: 'github',
				email: 'user@github.com',
				displayName: 'GitHub User',
			})

			await page.goto('/settings/connected-accounts')

			await expect(page.getByText('GitHub', { exact: true })).toBeVisible()
			await expect(page.getByText('user@github.com')).toBeVisible()
			await expect(
				page.getByRole('button', { name: 'Disconnect' }),
			).toBeVisible()
		})

		test('hides connect button for already-connected provider', async ({
			page,
			login,
		}) => {
			const { user } = await login()
			createSocialIdentity({
				userId: user.id,
				provider: 'google',
				email: 'user@google.com',
			})

			await page.goto('/settings/connected-accounts')

			// Google is connected, so "Connect with Google" should not appear
			await expect(
				page.getByRole('link', { name: /Connect with Google/i }),
			).not.toBeVisible()
			// But GitHub is not connected, so that button should appear
			await expect(
				page.getByRole('link', { name: /Connect with GitHub/i }),
			).toBeVisible()
		})

		test('shows all-connected message when both providers linked', async ({
			page,
			login,
		}) => {
			const { user } = await login()
			createSocialIdentity({
				userId: user.id,
				provider: 'google',
				email: 'g@test.com',
			})
			createSocialIdentity({
				userId: user.id,
				provider: 'github',
				email: 'gh@test.com',
			})

			await page.goto('/settings/connected-accounts')

			await expect(
				page.getByText('All available accounts are connected.'),
			).toBeVisible()
		})

		test('disconnects a social identity', async ({ page, login }) => {
			const { user } = await login()
			createSocialIdentity({
				userId: user.id,
				provider: 'github',
				email: 'disconnect@github.com',
			})

			await page.goto('/settings/connected-accounts')
			await expect(page.getByText('disconnect@github.com')).toBeVisible()

			// Click disconnect (opens dialog)
			await page.getByRole('button', { name: 'Disconnect' }).click()

			// Confirm in dialog
			const dialog = page.getByRole('dialog')
			await expect(dialog).toBeVisible()
			await expect(dialog.getByText('Disconnect GitHub')).toBeVisible()
			await dialog.getByRole('button', { name: 'Disconnect' }).click()

			// Should see success and connect button reappears
			await expect(page.getByText('Account disconnected')).toBeVisible()
			await expect(
				page.getByRole('link', { name: /Connect with GitHub/i }),
			).toBeVisible()
		})

		test('passes accessibility scan (empty state)', async ({ page, login }) => {
			await login()
			await page.goto('/settings/connected-accounts')
			const results = await new AxeBuilder({ page }).analyze()
			expect(results.violations).toEqual([])
		})

		test('passes accessibility scan (with connected accounts)', async ({
			page,
			login,
		}) => {
			const { user } = await login()
			createSocialIdentity({
				userId: user.id,
				provider: 'github',
				email: 'a11y@github.com',
			})

			await page.goto('/settings/connected-accounts')
			const results = await new AxeBuilder({ page }).analyze()
			expect(results.violations).toEqual([])
		})
	})

	test.describe('OAuth initiation', () => {
		test('returns 503 when Google OAuth not configured', async ({ page }) => {
			// In test env, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are empty
			const response = await page.goto('/social/google')
			expect(response?.status()).toBe(503)
		})

		test('returns 503 when GitHub OAuth not configured', async ({ page }) => {
			const response = await page.goto('/social/github')
			expect(response?.status()).toBe(503)
		})

		test('returns 404 for invalid provider', async ({ page }) => {
			const response = await page.goto('/social/invalid-provider')
			expect(response?.status()).toBe(404)
		})
	})
})
