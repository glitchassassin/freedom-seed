import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './playwright-utils'

test.describe('Privacy Policy Page', () => {
	test('renders the privacy policy page correctly', async ({ page }) => {
		await page.goto('/privacy')

		await expect(page).toHaveTitle('Privacy Policy — Seed Vault')

		await expect(
			page.getByRole('heading', { name: 'Privacy Policy' }),
		).toBeVisible()

		const sectionHeadings = [
			'Introduction',
			'Information We Collect',
			'How We Use Your Information',
			'Information Sharing',
			'Data Security',
			'Your Rights',
			"Children's Privacy",
			'Changes to This Policy',
			'Contact Us',
		]

		for (const heading of sectionHeadings) {
			await expect(page.getByRole('heading', { name: heading })).toBeVisible()
		}

		await expect(page.getByText('collaborative seed cataloging')).toBeVisible()

		await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
		await expect(
			page.getByRole('link', { name: 'Back to home' }),
		).toHaveAttribute('href', '/')
	})

	test('passes accessibility scan', async ({ page }) => {
		await page.goto('/privacy')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})

test.describe('Terms of Service Page', () => {
	test('renders the terms of service page correctly', async ({ page }) => {
		await page.goto('/terms')

		await expect(page).toHaveTitle('Terms of Service — Seed Vault')

		await expect(
			page.getByRole('heading', { name: 'Terms of Service' }),
		).toBeVisible()

		const sectionHeadings = [
			'Acceptance of Terms',
			'Description of Service',
			'User Accounts',
			'User Content',
			'Acceptable Use',
			'Intellectual Property',
			'Termination',
			'Disclaimers',
			'Limitation of Liability',
			'Changes to Terms',
			'Governing Law',
			'Contact',
		]

		for (const heading of sectionHeadings) {
			await expect(page.getByRole('heading', { name: heading })).toBeVisible()
		}

		await expect(page.getByText('collaborative seed cataloging')).toBeVisible()

		await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
		await expect(
			page.getByRole('link', { name: 'Back to home' }),
		).toHaveAttribute('href', '/')
	})

	test('passes accessibility scan', async ({ page }) => {
		await page.goto('/terms')
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
