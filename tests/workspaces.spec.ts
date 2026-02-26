import { test, expect } from '@playwright/test'
import { signUp, uniqueEmail } from './auth-helpers'
import { clearCapturedEmails, waitForEmail } from './email-helpers'

test.describe('Workspaces', () => {
	test.beforeEach(() => {
		clearCapturedEmails()
	})

	test('signup creates personal workspace and redirects to workspace dashboard', async ({
		page,
	}) => {
		await signUp(page)
		await expect(page).toHaveURL(/\/workspaces\//)
		await expect(page.getByRole('heading', { name: 'Personal' })).toBeVisible()
	})

	test('workspace dashboard shows workspace name and description', async ({
		page,
	}) => {
		await signUp(page)
		await expect(
			page.getByText('This is your personal workspace'),
		).toBeVisible()
	})

	test('members page shows current user as owner', async ({ page }) => {
		const { email } = await signUp(page)

		// Navigate to members via the settings link
		await page.getByRole('link', { name: 'Workspace settings' }).click()

		// Personal workspaces don't show Members link in header, go directly
		// Get current URL to extract workspace ID
		const url = page.url()
		const workspaceId = url.match(/\/workspaces\/([^/]+)/)?.[1]
		await page.goto(`/workspaces/${workspaceId}/settings/members`)

		await expect(page.getByText(email)).toBeVisible()
		await expect(page.getByText('owner')).toBeVisible()
	})

	test('can create a new shared workspace', async ({ page }) => {
		await signUp(page)

		// Navigate to create workspace
		// Open workspace switcher dropdown
		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()

		await expect(page).toHaveURL('/workspaces/new')

		await page.getByLabel('Workspace name').fill('My Test Team')
		await page.getByRole('button', { name: 'Create workspace' }).click()

		await expect(page).toHaveURL(/\/workspaces\//)
		await expect(
			page.getByRole('heading', { name: 'My Test Team' }),
		).toBeVisible()
	})

	test('workspace switcher shows all workspaces', async ({ page }) => {
		await signUp(page)

		// Create a second workspace
		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Second Team')
		await page.getByRole('button', { name: 'Create workspace' }).click()
		await expect(page).toHaveURL(/\/workspaces\//)

		// Open workspace switcher — should show both workspaces
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

		// Create a shared workspace
		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Invite Test Team')
		await page.getByRole('button', { name: 'Create workspace' }).click()
		await expect(page).toHaveURL(/\/workspaces\//)

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

	test('invited user can accept invitation and access workspace', async ({
		page,
	}) => {
		// User A creates a workspace and invites User B
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Accept Test Team')
		await page.getByRole('button', { name: 'Create workspace' }).click()
		await expect(page).toHaveURL(/\/workspaces\//)

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

		// User B should be on the workspace page now
		await expect(page2).toHaveURL(/\/workspaces\//)
		await expect(
			page2.getByRole('heading', { name: 'Accept Test Team' }),
		).toBeVisible()
		await context2.close()
	})

	test('admin can revoke pending invitation', async ({ page }) => {
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Revoke Test Team')
		await page.getByRole('button', { name: 'Create workspace' }).click()

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

	test('owner can rename workspace', async ({ page }) => {
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Old Name')
		await page.getByRole('button', { name: 'Create workspace' }).click()

		await page.getByRole('link', { name: 'Settings', exact: true }).click()

		// Rename the workspace
		await page.getByRole('textbox', { name: 'Name', exact: true }).clear()
		await page
			.getByRole('textbox', { name: 'Name', exact: true })
			.fill('New Name')
		await page.getByRole('button', { name: 'Rename' }).click()

		await expect(page.getByText('Workspace renamed')).toBeVisible()
	})

	test('owner can delete non-personal workspace', async ({ page }) => {
		await signUp(page)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Delete Me')
		await page.getByRole('button', { name: 'Create workspace' }).click()

		await page.getByRole('link', { name: 'Settings', exact: true }).click()

		// Type confirmation name
		await page.getByPlaceholder('Delete Me').fill('Delete Me')
		await page
			.getByRole('button', { name: 'Delete workspace permanently' })
			.click()

		// Should redirect to personal workspace
		await expect(page.getByText('Workspace deleted')).toBeVisible()
		await expect(page).toHaveURL(/\/workspaces\//)
	})

	test('non-member gets 403', async ({ page }) => {
		// User A creates a workspace
		await signUp(page)
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.match(/\/workspaces\/([^/]+)/)?.[1]

		// User B signs up in a new page with isolated context
		const context2 = await page.context().browser()!.newContext()
		const page2 = await context2.newPage()
		await signUp(page2)

		// User B tries to access User A's workspace
		const response = await page2.goto(`/workspaces/${workspaceId}`)
		expect(response?.status()).toBe(403)
		await context2.close()
	})
})
