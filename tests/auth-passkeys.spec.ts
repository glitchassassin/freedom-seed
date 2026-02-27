import AxeBuilder from '@axe-core/playwright'
import { createPasskey } from './factories'
import { test, expect } from './playwright-utils'

test.describe('Passkeys', () => {
	test.describe('Settings page', () => {
		test('shows empty state when no passkeys registered', async ({
			page,
			login,
		}) => {
			await login()
			await page.goto('/settings/passkeys')

			await expect(
				page.getByRole('heading', { name: 'Passkeys' }),
			).toBeVisible()
			await expect(page.getByText('No passkeys registered yet.')).toBeVisible()
			await expect(
				page.getByRole('button', { name: 'Add a passkey' }),
			).toBeVisible()
		})

		test('displays registered passkeys', async ({ page, login }) => {
			const { user } = await login()
			createPasskey({ userId: user.id, name: 'MacBook Pro' })
			createPasskey({ userId: user.id, name: 'iPhone' })

			await page.goto('/settings/passkeys')

			await expect(page.getByText('MacBook Pro')).toBeVisible()
			await expect(page.getByText('iPhone')).toBeVisible()
		})

		test('renames a passkey', async ({ page, login }) => {
			const { user } = await login()
			createPasskey({ userId: user.id, name: 'Old Name' })

			await page.goto('/settings/passkeys')
			await expect(page.getByText('Old Name')).toBeVisible()

			// Click rename on the passkey row
			await page.getByRole('button', { name: 'Rename' }).click()

			// Fill the new name in the dialog
			await page.getByLabel('New name').clear()
			await page.getByLabel('New name').fill('New Name')
			await page.getByRole('button', { name: 'Save' }).click()

			// Wait for redirect back and verify new name
			await expect(page.getByText('Passkey renamed')).toBeVisible()
			await expect(page.getByText('New Name')).toBeVisible()
		})

		test('deletes a passkey', async ({ page, login }) => {
			const { user } = await login()
			createPasskey({ userId: user.id, name: 'Delete Me' })

			await page.goto('/settings/passkeys')
			await expect(page.getByText('Delete Me')).toBeVisible()

			// Accept the confirm dialog
			page.on('dialog', (dialog) => dialog.accept())
			await page.getByRole('button', { name: 'Remove' }).click()

			await expect(page.getByText('Passkey removed')).toBeVisible()
			await expect(page.getByText('No passkeys registered yet.')).toBeVisible()
		})

		test('passes accessibility scan', async ({ page, login }) => {
			await login()
			await page.goto('/settings/passkeys')
			const results = await new AxeBuilder({ page }).analyze()
			expect(results.violations).toEqual([])
		})

		test('passes accessibility scan with passkeys listed', async ({
			page,
			login,
		}) => {
			const { user } = await login()
			createPasskey({ userId: user.id, name: 'Test Key' })

			await page.goto('/settings/passkeys')
			const results = await new AxeBuilder({ page }).analyze()
			expect(results.violations).toEqual([])
		})
	})

	test.describe('Login page integration', () => {
		test('shows passkey sign-in button', async ({ page }) => {
			await page.goto('/login')
			await expect(
				page.getByRole('button', { name: 'Sign in with passkey' }),
			).toBeVisible()
		})

		// NOTE: Full passkey registration and authentication E2E tests require
		// Chromium's virtual authenticator via CDP. The test below is Chromium-only.
		test('registers and authenticates with passkey via virtual authenticator', async ({
			page,
			login,
			browserName,
		}) => {
			// Virtual authenticator only works in Chromium
			test.skip(
				browserName !== 'chromium',
				'WebAuthn virtual authenticator requires Chromium',
			)

			const { user } = await login()
			void user // user is logged in via session cookie

			// Navigate to the page first so the CSRF cookie and token are set
			// before attaching the CDP session. Wait for networkidle to ensure
			// any client-hint-triggered reloads have settled.
			await page.goto('/settings/passkeys')
			await page.waitForLoadState('networkidle')

			// Set up virtual authenticator via CDP
			const client = await page.context().newCDPSession(page)
			await client.send('WebAuthn.enable')
			await client.send('WebAuthn.addVirtualAuthenticator', {
				options: {
					protocol: 'ctap2',
					transport: 'internal',
					hasResidentKey: true,
					hasUserVerification: true,
					isUserVerified: true,
				},
			})

			// Open the register passkey dialog
			await page.getByRole('button', { name: 'Add a passkey' }).click()

			// Dialog appears
			await expect(page.getByText('Give your passkey a name')).toBeVisible()
			await page.getByLabel('Passkey name').fill('Virtual Key')
			await page.getByRole('button', { name: 'Register' }).click()

			// Wait for page reload after registration
			await page.waitForURL('/settings/passkeys', { timeout: 15_000 })
			await expect(page.getByText('Virtual Key')).toBeVisible({
				timeout: 10_000,
			})

			// Now test authentication — clear session cookies but keep the
			// WebAuthn virtual authenticator (reuse the same CDP client).
			const cookies = await page.context().cookies()
			await page.context().clearCookies()

			await page.goto('/login')

			// The virtual authenticator persists in the CDP session; we only
			// need to re-enable the WebAuthn domain after navigation.
			await client.send('WebAuthn.enable')

			// Restore the CSRF cookie from before (session cookie was the only
			// one we needed to remove to simulate logout). The login page needs
			// the CSRF cookie to be present for the passkey sign-in fetch.
			const csrfCookie = cookies.find(
				(c) => c.name === 'csrf' || c.name === '__Host-csrf',
			)
			if (csrfCookie) {
				await page.context().addCookies([csrfCookie])
			}
			// Reload to get a fresh CSRF token (page was loaded without a CSRF cookie)
			await page.reload()

			await page.getByRole('button', { name: 'Sign in with passkey' }).click()

			// Virtual authenticator auto-responds
			await page.waitForURL(/\/workspaces\//, { timeout: 15_000 })
			await expect(page.getByText('Welcome back')).toBeVisible()
		})
	})
})
