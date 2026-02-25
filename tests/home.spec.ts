import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { signUp } from './auth-helpers'

test.describe('Home Page', () => {
	test('renders the home page correctly', async ({ page }) => {
		await page.goto('/')

		// Check that the page title is correct
		await expect(page).toHaveTitle('Seed Vault — Catalog and Share Your Seeds')

		// Check that the hero heading is present
		await expect(
			page.getByRole('heading', { name: 'Seed Vault' }),
		).toBeVisible()

		// Check that the hero description is present
		await expect(page.getByText('Catalog your seed collection')).toBeVisible()

		// Check that CTA buttons are present for unauthenticated users
		await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()

		// Check that the features section is present
		await expect(
			page.getByText('Everything you need to manage your seeds'),
		).toBeVisible()

		// Verify that the page has loaded completely by checking the main content area
		await expect(page.locator('main')).toBeVisible()
	})

	test('has working CTA links', async ({ page }) => {
		await page.goto('/')

		// Test Get started link
		const getStartedLink = page.getByRole('link', { name: 'Get started' })
		await expect(getStartedLink).toHaveAttribute('href', '/signup')

		// Test Sign in link
		const signInLink = page.getByRole('link', { name: 'Sign in' })
		await expect(signInLink).toHaveAttribute('href', '/login')

		// Test bottom CTA link
		const createAccountLink = page.getByRole('link', {
			name: 'Create your account',
		})
		await expect(createAccountLink).toHaveAttribute('href', '/signup')
	})

	test('displays all feature cards', async ({ page }) => {
		await page.goto('/')

		const expectedFeatures = [
			'Personal Vaults',
			'Seed Cataloging',
			'Photo Uploads',
			'Team Collaboration',
			'Role-Based Access',
		]

		for (const feature of expectedFeatures) {
			await expect(page.getByRole('heading', { name: feature })).toBeVisible()
		}

		await expect(page.getByRole('article')).toHaveCount(expectedFeatures.length)
	})

	test('displays footer', async ({ page }) => {
		await page.goto('/')

		await expect(page.getByText('Built with Freedom Seed')).toBeVisible()
	})

	test('shows authenticated state for logged-in user', async ({ page }) => {
		await signUp(page)
		await page.goto('/')

		// Authenticated user sees vault links instead of sign-up/sign-in
		const vaultLinks = page.getByRole('link', { name: 'Go to your vaults' })
		await expect(vaultLinks).toHaveCount(2)
		await expect(vaultLinks.first()).toBeVisible()
		await expect(
			page.getByRole('link', { name: 'Get started' }),
		).not.toBeVisible()
		await expect(page.getByRole('link', { name: 'Sign in' })).not.toBeVisible()
		await expect(
			page.getByRole('link', { name: 'Create your account' }),
		).not.toBeVisible()
	})

	test('passes accessibility scan', async ({ page }) => {
		await page.goto('/')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
