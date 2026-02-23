import { test, expect } from '@playwright/test'
import { signUp } from './auth-helpers'

test.describe('Auth guards', () => {
	test('unauthenticated user visiting protected route redirects to login with redirectTo', async ({
		page,
	}) => {
		await page.goto('/settings/change-password')
		await expect(page).toHaveURL(
			'/login?redirectTo=%2Fsettings%2Fchange-password',
		)
	})

	test('authenticated user visiting /login redirects to /', async ({
		page,
	}) => {
		await signUp(page)
		await page.goto('/login')
		await expect(page).toHaveURL('/')
	})

	test('authenticated user visiting /signup redirects to /', async ({
		page,
	}) => {
		await signUp(page)
		await page.goto('/signup')
		await expect(page).toHaveURL('/')
	})
})
