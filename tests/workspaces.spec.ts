import { signUp, uniqueEmail } from './auth-helpers'
import { clearCapturedEmails, waitForEmail } from './email-helpers'
import { createUser, createWorkspace } from './factories'
import { authenticatedContext, test, expect } from './playwright-utils'

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
		login,
	}) => {
		const { personalWorkspace } = await login()
		await page.goto(`/workspaces/${personalWorkspace.id}`)
		await expect(
			page.getByText('This is your personal workspace'),
		).toBeVisible()
	})

	test('members page shows current user as owner', async ({ page, login }) => {
		const { user, personalWorkspace } = await login()

		await page.goto(`/workspaces/${personalWorkspace.id}/settings/members`)

		await expect(page.getByText(user.email)).toBeVisible()
		await expect(page.getByText('owner')).toBeVisible()
	})

	test('can create a new shared workspace', async ({ page, login }) => {
		const { personalWorkspace } = await login()
		await page.goto(`/workspaces/${personalWorkspace.id}`)

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

	test('workspace switcher shows all workspaces', async ({ page, login }) => {
		const { personalWorkspace } = await login()
		await page.goto(`/workspaces/${personalWorkspace.id}`)

		await page.getByRole('button', { name: /Personal/ }).click()
		await page.getByRole('menuitem', { name: 'Create workspace' }).click()
		await page.getByLabel('Workspace name').fill('Second Team')
		await page.getByRole('button', { name: 'Create workspace' }).click()
		await expect(page).toHaveURL(/\/workspaces\//)

		await page.getByRole('button', { name: /Second Team/ }).click()
		await expect(page.getByRole('menuitem', { name: /Personal/ })).toBeVisible()
		await expect(
			page.getByRole('menuitem', { name: 'Second Team' }),
		).toBeVisible()
	})

	test('admin can invite a member and invitation email is sent', async ({
		page,
		login,
	}) => {
		const { user } = await login()
		const ws = createWorkspace({ ownerId: user.id, name: 'Invite Test Team' })

		await page.goto(`/workspaces/${ws.workspace.id}/settings/members`)

		const inviteeEmail = uniqueEmail()
		await page.getByRole('textbox', { name: 'Email' }).fill(inviteeEmail)
		await page.getByRole('button', { name: 'Send invite' }).click()

		await expect(page.getByText(inviteeEmail)).toBeVisible()

		const captured = await waitForEmail(inviteeEmail)
		expect(captured.subject).toContain('invited')
	})

	test('invited user can accept invitation and access workspace', async ({
		page: pageA,
		login,
		browser,
	}) => {
		// User A creates workspace and invites User B via UI (need the email)
		const { user: userA } = await login()
		const ws = createWorkspace({
			ownerId: userA.id,
			name: 'Accept Test Team',
		})

		await pageA.goto(`/workspaces/${ws.workspace.id}/settings/members`)

		const inviteeEmail = uniqueEmail()
		await pageA.getByRole('textbox', { name: 'Email' }).fill(inviteeEmail)
		await pageA.getByRole('button', { name: 'Send invite' }).click()

		const captured = await waitForEmail(inviteeEmail)
		const acceptUrlMatch = captured.html.match(
			/href="([^"]*\/invitations\/[^"]*)"/,
		)
		expect(acceptUrlMatch).toBeTruthy()
		const acceptUrl = acceptUrlMatch![1]

		// User B created via factory (avoids flaky webkit UI signup timeout)
		const userB = await createUser({ email: inviteeEmail })
		const { context: context2, page: page2 } = await authenticatedContext(
			browser,
			userB.user.id,
		)

		await page2.goto(acceptUrl)
		await expect(page2.getByText('Accept Test Team')).toBeVisible()
		await page2.getByRole('button', { name: 'Accept invitation' }).click()

		await expect(page2).toHaveURL(/\/workspaces\//)
		await expect(
			page2.getByRole('heading', { name: 'Accept Test Team' }),
		).toBeVisible()
		await context2.close()
	})

	test('admin can revoke pending invitation', async ({ page, login }) => {
		const { user } = await login()
		const ws = createWorkspace({ ownerId: user.id, name: 'Revoke Test Team' })

		await page.goto(`/workspaces/${ws.workspace.id}/settings/members`)

		const inviteeEmail = uniqueEmail()
		await page.getByRole('textbox', { name: 'Email' }).fill(inviteeEmail)
		await page.getByRole('button', { name: 'Send invite' }).click()
		await expect(page.getByText(inviteeEmail)).toBeVisible()

		await page.getByRole('button', { name: 'Revoke', exact: true }).click()
		await expect(page.getByText(inviteeEmail)).not.toBeVisible()
	})

	test('owner can rename workspace', async ({ page, login }) => {
		const { user } = await login()
		const ws = createWorkspace({ ownerId: user.id, name: 'Old Name' })

		await page.goto(`/workspaces/${ws.workspace.id}/settings/general`)

		await page.getByRole('textbox', { name: 'Name', exact: true }).clear()
		await page
			.getByRole('textbox', { name: 'Name', exact: true })
			.fill('New Name')
		await page.getByRole('button', { name: 'Rename' }).click()

		await expect(page.getByText('Workspace renamed')).toBeVisible()
	})

	test('owner can delete non-personal workspace', async ({ page, login }) => {
		const { user } = await login()
		const ws = createWorkspace({ ownerId: user.id, name: 'Delete Me' })

		await page.goto(`/workspaces/${ws.workspace.id}/settings/general`)

		await page.getByPlaceholder('Delete Me').fill('Delete Me')
		await page
			.getByRole('button', { name: 'Delete workspace permanently' })
			.click()

		await expect(page.getByText('Workspace deleted')).toBeVisible()
		await expect(page).toHaveURL(/\/workspaces\//)
	})

	test('non-member gets 403', async ({ browser }) => {
		// User A creates a workspace via factory
		const userA = await createUser()
		const ws = createWorkspace({ ownerId: userA.user.id })

		// User B gets authenticated via factory
		const userB = await createUser()
		const { context, page } = await authenticatedContext(browser, userB.user.id)

		const response = await page.goto(`/workspaces/${ws.workspace.id}`)
		expect(response?.status()).toBe(403)
		await context.close()
	})
})
