/* eslint-disable react-hooks/rules-of-hooks -- Playwright's `use` is not React's `use` hook */
import { test as base, expect } from '@playwright/test'
import type { Browser } from '@playwright/test'
import type { CreateUserOptions, CreateUserResult } from './factories'
import { createUser, createSession } from './factories'

export const test = base.extend<{
	login: (options?: CreateUserOptions) => Promise<CreateUserResult>
	insertNewUser: (options?: CreateUserOptions) => Promise<CreateUserResult>
}>({
	login: async ({ page }, use) => {
		await use(async (options?: CreateUserOptions) => {
			const result = await createUser(options)
			const { signedToken } = createSession({ userId: result.user.id })
			await page.context().addCookies([
				{
					name: 'en_session',
					value: signedToken,
					domain: 'localhost',
					path: '/',
				},
			])
			return result
		})
	},

	insertNewUser: async ({}, use) => {
		await use(async (options?: CreateUserOptions) => {
			return createUser(options)
		})
	},
})

/** Injects a factory-created session into a new browser context. */
export async function authenticatedContext(browser: Browser, userId: string) {
	const { signedToken } = createSession({ userId })
	const context = await browser.newContext()
	await context.addCookies([
		{
			name: 'en_session',
			value: signedToken,
			domain: 'localhost',
			path: '/',
		},
	])
	const page = await context.newPage()
	return { context, page }
}

export { expect }
