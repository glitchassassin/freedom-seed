import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { uniqueEmail } from './auth-helpers'
import {
	seedMagicLinkToken,
	seedExpiredMagicLinkToken,
	markMagicLinkTokenUsed,
} from './db-helpers'
import { createUser } from './factories'

test.describe('Magic link login', () => {
	test.describe('Request form', () => {
		test('shows success message after submitting a registered email', async ({
			page,
		}) => {
			const { user } = await createUser()

			await page.goto('/magic-link')
			await page.getByLabel('Email').fill(user.email)
			await page.getByRole('button', { name: 'Send sign-in link' }).click()

			await expect(page.getByText('Check your email')).toBeVisible()
			await expect(
				page.getByText('If an account with that email exists'),
			).toBeVisible()
		})

		test('shows same success message for non-existent email (no enumeration)', async ({
			page,
		}) => {
			await page.goto('/magic-link')
			await page.getByLabel('Email').fill(uniqueEmail())
			await page.getByRole('button', { name: 'Send sign-in link' }).click()

			await expect(page.getByText('Check your email')).toBeVisible()
		})

		test('validates email format', async ({ page }) => {
			await page.goto('/magic-link')
			await page.getByLabel('Email').fill('not-an-email')
			await page.getByRole('button', { name: 'Send sign-in link' }).click()

			await expect(page.getByText('valid email')).toBeVisible()
		})

		test('has a link back to password login', async ({ page }) => {
			await page.goto('/magic-link')
			const link = page.getByRole('link', { name: 'Sign in with password' })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/login')
		})

		test('has a link to create account', async ({ page }) => {
			await page.goto('/magic-link')
			const link = page.getByRole('link', { name: 'Create an account' })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/signup')
		})

		test('passes accessibility scan', async ({ page }) => {
			await page.goto('/magic-link')
			const results = await new AxeBuilder({ page }).analyze()
			expect(results.violations).toEqual([])
		})
	})

	test.describe('Token verification', () => {
		test('logs in with a valid magic link token', async ({ page }) => {
			const { user } = await createUser()
			const token = seedMagicLinkToken(user.id)

			await page.goto(`/magic-link/verify?token=${token}`)

			// Should redirect to home with a session
			await page.waitForURL(/\/workspaces\//)
			const cookies = await page.context().cookies()
			expect(cookies.some((c) => c.name === 'en_session')).toBe(true)
		})

		test('shows error for invalid token', async ({ page }) => {
			await page.goto('/magic-link/verify?token=invalid-garbage-token')
			await expect(page.getByText('Invalid sign-in link')).toBeVisible()
			await expect(page.getByText('invalid or has expired')).toBeVisible()
		})

		test('shows error when no token is provided', async ({ page }) => {
			await page.goto('/magic-link/verify')
			await expect(page.getByText('Invalid sign-in link')).toBeVisible()
		})

		test('shows error for expired token', async ({ page }) => {
			const { user } = await createUser()
			const token = seedExpiredMagicLinkToken(user.id)

			await page.goto(`/magic-link/verify?token=${token}`)
			await expect(page.getByText('Invalid sign-in link')).toBeVisible()
			await expect(page.getByText('invalid or has expired')).toBeVisible()
		})

		test('shows error for already-used token', async ({ page }) => {
			const { user } = await createUser()
			const token = seedMagicLinkToken(user.id)
			markMagicLinkTokenUsed(token)

			await page.goto(`/magic-link/verify?token=${token}`)
			await expect(page.getByText('Invalid sign-in link')).toBeVisible()
		})

		test('passes accessibility scan (invalid state)', async ({ page }) => {
			await page.goto('/magic-link/verify?token=bad')
			const results = await new AxeBuilder({ page }).analyze()
			expect(results.violations).toEqual([])
		})
	})
})
