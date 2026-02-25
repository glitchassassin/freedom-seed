import { test, expect } from '@playwright/test'
import { signUp, uniqueEmail } from './auth-helpers'
import { clearCapturedEmails, waitForEmail } from './email-helpers'

test.describe('Teams', () => {
	test.beforeEach(() => {
		clearCapturedEmails()
	})

	test('signup creates personal team and redirects to team dashboard', async ({
		page,
	}) => {
		await signUp(page)
		await expect(page).toHaveURL(/\/teams\//)
		await expect(page.getByRole('heading', { name: 'Personal' })).toBeVisible()
	})

	test('team dashboard shows team name and description', async ({ page }) => {
		await signUp(page)
		await expect(
			page.getByText('This is your personal workspace'),
		).toBeVisible()
	})

	test('members page shows current user as owner', async ({ page }) => {
		const { email } = await signUp(page)

		// Navigate to members via the settings link
		await page.getByRole('link', { name: 'Team settings' }).click()

		// Personal teams don't show Members link in header, go directly
		// Get current URL to extract team ID
		const url = page.url()
		const teamId = url.match(/\/teams\/([^/]+)/)?.[1]
		await page.goto(`/teams/${teamId}/settings/members`)

		await expect(page.getByText(email)).toBeVisible()
		await expect(page.getByText('owner')).toBeVisible()
	})

	test('can create a new shared team', async ({ page }) => {
		await signUp(page)

		// Navigate to create team
		// Open team switcher dropdown
		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()

		await expect(page).toHaveURL('/teams/new')

		await page.getByLabel('Team name').fill('My Test Team')
		await page.getByRole('button', { name: 'Create team' }).click()

		await expect(page).toHaveURL(/\/teams\//)
		await expect(
			page.getByRole('heading', { name: 'My Test Team' }),
		).toBeVisible()
	})

	test('team switcher shows all teams', async ({ page }) => {
		await signUp(page)

		// Create a second team
		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()
		await page.getByLabel('Team name').fill('Second Team')
		await page.getByRole('button', { name: 'Create team' }).click()
		await expect(page).toHaveURL(/\/teams\//)

		// Open team switcher — should show both teams
		await page.getByRole('button', { name: /Second Team/ }).click()
		await expect(page.getByRole('menuitem', { name: /Personal/ })).toBeVisible()
		await expect(
			page.getByRole('menuitem', { name: 'Second Team' }),
		).toBeVisible()
	})

	test('admin can invite a member and invitation email is sent', async ({
		page,
	}) => {
		await signUp(page)

		// Create a shared team
		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()
		await page.getByLabel('Team name').fill('Invite Test Team')
		await page.getByRole('button', { name: 'Create team' }).click()
		await expect(page).toHaveURL(/\/teams\//)

		// Go to members page
		await page.getByRole('link', { name: 'Members', exact: true }).click()

		// Invite a member
		const inviteeEmail = uniqueEmail()
		await page.getByRole('textbox', { name: 'Email' }).fill(inviteeEmail)
		await page.getByRole('button', { name: 'Send invite' }).click()

		// Verify invitation appears in pending list
		await expect(page.getByText(inviteeEmail)).toBeVisible()

		// Verify email was sent
		const captured = await waitForEmail(inviteeEmail)
		expect(captured.subject).toContain('invited')
	})

	test('invited user can accept invitation and access team', async ({
		page,
	}) => {
		// User A creates a team and invites User B
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()
		await page.getByLabel('Team name').fill('Accept Test Team')
		await page.getByRole('button', { name: 'Create team' }).click()
		await expect(page).toHaveURL(/\/teams\//)

		await page.getByRole('link', { name: 'Members', exact: true }).click()

		const inviteeEmail = uniqueEmail()
		await page.getByRole('textbox', { name: 'Email' }).fill(inviteeEmail)
		await page.getByRole('button', { name: 'Send invite' }).click()

		// Get the invitation link from the email
		const captured = await waitForEmail(inviteeEmail)
		const acceptUrlMatch = captured.html.match(
			/href="([^"]*\/invitations\/[^"]*)"/,
		)
		expect(acceptUrlMatch).toBeTruthy()
		const acceptUrl = acceptUrlMatch![1]

		// User B signs up with the invited email in a new page with isolated context
		const context2 = await page.context().browser()!.newContext()
		const page2 = await context2.newPage()
		await signUp(page2, { email: inviteeEmail })

		// User B navigates to the invitation link
		await page2.goto(acceptUrl)
		await expect(page2.getByText('Accept Test Team')).toBeVisible()
		await page2.getByRole('button', { name: 'Accept invitation' }).click()

		// User B should be on the team page now
		await expect(page2).toHaveURL(/\/teams\//)
		await expect(
			page2.getByRole('heading', { name: 'Accept Test Team' }),
		).toBeVisible()
		await context2.close()
	})

	test('admin can revoke pending invitation', async ({ page }) => {
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()
		await page.getByLabel('Team name').fill('Revoke Test Team')
		await page.getByRole('button', { name: 'Create team' }).click()

		await page.getByRole('link', { name: 'Members', exact: true }).click()

		const inviteeEmail = uniqueEmail()
		await page.getByRole('textbox', { name: 'Email' }).fill(inviteeEmail)
		await page.getByRole('button', { name: 'Send invite' }).click()
		await expect(page.getByText(inviteeEmail)).toBeVisible()

		// Revoke the invitation
		await page.getByRole('button', { name: 'Revoke', exact: true }).click()

		// The invitation email should no longer be in the pending list
		// (page reloads after form submission)
		await expect(page.getByText(inviteeEmail)).not.toBeVisible()
	})

	test('owner can rename team', async ({ page }) => {
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()
		await page.getByLabel('Team name').fill('Old Name')
		await page.getByRole('button', { name: 'Create team' }).click()

		await page.getByRole('link', { name: 'Settings', exact: true }).click()

		// Rename the team
		await page.getByRole('textbox', { name: 'Name', exact: true }).clear()
		await page
			.getByRole('textbox', { name: 'Name', exact: true })
			.fill('New Name')
		await page.getByRole('button', { name: 'Rename' }).click()

		await expect(page.getByText('Team renamed')).toBeVisible()
	})

	test('owner can delete non-personal team', async ({ page }) => {
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create team' }).click()
		await page.getByLabel('Team name').fill('Delete Me')
		await page.getByRole('button', { name: 'Create team' }).click()

		await page.getByRole('link', { name: 'Settings', exact: true }).click()

		// Type confirmation name
		await page.getByPlaceholder('Delete Me').fill('Delete Me')
		await page.getByRole('button', { name: 'Delete team permanently' }).click()

		// Should redirect to personal team
		await expect(page.getByText('Team deleted')).toBeVisible()
		await expect(page).toHaveURL(/\/teams\//)
	})

	test('non-member gets 403', async ({ page }) => {
		// User A creates a team
		await signUp(page)
		const teamUrl = page.url()
		const teamId = teamUrl.match(/\/teams\/([^/]+)/)?.[1]

		// User B signs up in a new page with isolated context
		const context2 = await page.context().browser()!.newContext()
		const page2 = await context2.newPage()
		await signUp(page2)

		// User B tries to access User A's team
		const response = await page2.goto(`/teams/${teamId}`)
		expect(response?.status()).toBe(403)
		await context2.close()
	})
})
