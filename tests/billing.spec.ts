import AxeBuilder from '@axe-core/playwright'
import { createBillingPlan } from './factories'
import { test, expect } from './playwright-utils'

test.describe('Billing', () => {
	test('billing settings page renders for admin', async ({ page, login }) => {
		const { personalWorkspace } = await login()
		// Seed billing plans for this test
		createBillingPlan({ slug: 'free', name: 'Free', sortOrder: 0 })
		createBillingPlan({
			slug: 'pro',
			name: 'Pro',
			stripePriceIdMonthly: 'price_pro_monthly_placeholder',
			sortOrder: 1,
		})

		await page.goto(`/workspaces/${personalWorkspace.id}/settings/billing`)

		await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible()
		await expect(page.getByText('Free')).toBeVisible()
		await expect(
			page.getByRole('button', { name: /Upgrade to Pro/ }),
		).toBeVisible()
	})

	test('billing settings hidden from members', async ({ login, browser }) => {
		const { user: owner } = await login()
		const { createWorkspace, createWorkspaceMember } =
			await import('./factories')
		const { createUser } = await import('./factories')

		const workspace = createWorkspace({
			ownerId: owner.id,
			name: 'Billing Test Workspace',
		})
		const member = await createUser({
			email: `member-${Date.now()}@example.com`,
			password: 'Password1!',
		})
		createWorkspaceMember({
			workspaceId: workspace.workspace.id,
			userId: member.user.id,
			role: 'member',
		})

		// Login as member in a new context
		const { authenticatedContext } = await import('./playwright-utils')
		const { page: memberPage } = await authenticatedContext(
			browser,
			member.user.id,
		)

		await memberPage.goto(`/workspaces/${workspace.workspace.id}`)
		// Billing link should not be visible for members
		await expect(
			memberPage.getByRole('link', { name: 'Billing' }),
		).not.toBeVisible()
		await memberPage.close()
	})

	test('checkout flow redirects to stripe', async ({ page, login }) => {
		const { personalWorkspace } = await login()
		createBillingPlan({ slug: 'free', name: 'Free', sortOrder: 0 })
		createBillingPlan({
			slug: 'pro',
			name: 'Pro',
			stripePriceIdMonthly: 'price_pro_monthly_placeholder',
			sortOrder: 1,
		})

		await page.goto(`/workspaces/${personalWorkspace.id}/settings/billing`)

		// Click upgrade button
		await page.getByRole('button', { name: /Upgrade to Pro/ }).click()

		// Should redirect to the success URL (since mock Stripe returns success_url)
		await expect(page).toHaveURL(/settings\/billing\?success=1/)
	})

	test('pricing section on landing page', async ({ page }) => {
		await page.goto('/')

		await expect(page.getByText('Simple, transparent pricing')).toBeVisible()

		// Check all tier names are visible
		// Use more specific selectors since "Free", "Pro", "Enterprise" appear in pricing cards
		const pricingSection = page.locator('section', {
			has: page.getByText('Simple, transparent pricing'),
		})
		await expect(
			pricingSection.getByRole('heading', { name: 'Free' }),
		).toBeVisible()
		await expect(
			pricingSection.getByRole('heading', { name: 'Pro' }),
		).toBeVisible()
		await expect(
			pricingSection.getByRole('heading', { name: 'Enterprise' }),
		).toBeVisible()
	})

	test('billing settings passes accessibility scan', async ({
		page,
		login,
	}) => {
		const { personalWorkspace } = await login()
		createBillingPlan({ slug: 'free', name: 'Free', sortOrder: 0 })

		await page.goto(`/workspaces/${personalWorkspace.id}/settings/billing`)

		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})

	test('pricing page passes accessibility scan', async ({ page }) => {
		await page.goto('/')

		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
