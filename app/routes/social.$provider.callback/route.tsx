import { redirect } from 'react-router'
import type { Route } from './+types/route'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { getOptionalUser } from '~/utils/session-context'
import { createSession } from '~/utils/session.server'
import {
	clearOAuthStateCookie,
	findOrCreateUserFromOAuth,
	getGitHubProfile,
	getGitHubProvider,
	getGoogleProfile,
	getGoogleProvider,
	linkSocialIdentity,
	readOAuthStateCookie,
} from '~/utils/social-auth.server'
import { setToast } from '~/utils/toast.server'
import { getUserWorkspaces } from '~/utils/workspaces.server'

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const stateParam = url.searchParams.get('state')

	if (!code || !stateParam) {
		return redirect('/login', {
			headers: {
				'set-cookie': setToast(
					{
						type: 'error',
						title: 'OAuth error',
						description: 'Missing authorization code',
					},
					isSecure,
				),
			},
		})
	}

	// Verify state
	const stateData = await readOAuthStateCookie(request, env)
	if (!stateData || stateData.state !== stateParam) {
		return redirect('/login', {
			headers: [
				['set-cookie', clearOAuthStateCookie(isSecure)],
				[
					'set-cookie',
					setToast(
						{
							type: 'error',
							title: 'OAuth error',
							description: 'Invalid state parameter',
						},
						isSecure,
					),
				],
			],
		})
	}

	const provider = params.provider
	const origin = url.origin

	try {
		// Exchange code for tokens
		let accessToken: string

		if (provider === 'google') {
			const google = getGoogleProvider(env, origin)
			const tokens = await google.validateAuthorizationCode(
				code,
				stateData.codeVerifier!,
			)
			accessToken = tokens.accessToken()
		} else if (provider === 'github') {
			const github = getGitHubProvider(env)
			const tokens = await github.validateAuthorizationCode(code)
			accessToken = tokens.accessToken()
		} else {
			throw new Error('Invalid provider')
		}

		// Fetch user profile
		const profile =
			provider === 'google'
				? await getGoogleProfile(accessToken)
				: await getGitHubProfile(accessToken)

		// Handle linking mode (user is already authenticated)
		const currentUser = getOptionalUser(context)
		if (stateData.mode === 'link' && currentUser) {
			await linkSocialIdentity(env, currentUser.id, profile)
			const redirectTo = stateData.redirectTo ?? '/settings/connected-accounts'
			return redirect(redirectTo, {
				headers: [
					['set-cookie', clearOAuthStateCookie(isSecure)],
					[
						'set-cookie',
						setToast(
							{
								type: 'success',
								title: `${provider === 'google' ? 'Google' : 'GitHub'} account connected`,
							},
							isSecure,
						),
					],
				],
			})
		}

		// Handle login/signup mode
		// NOTE: Social login bypasses MFA. The social provider has already verified
		// the user's identity, which serves as a second factor. Most SaaS apps use
		// this pattern. If stricter MFA enforcement is needed, implement MFA challenge
		// for social logins in the future.
		const { userId, isNewUser } = await findOrCreateUserFromOAuth(env, profile)
		const { cookie } = await createSession(env, userId, request)

		// Determine redirect destination
		let destination = '/'
		if (
			stateData.redirectTo &&
			stateData.redirectTo.startsWith('/') &&
			!stateData.redirectTo.startsWith('//')
		) {
			destination = stateData.redirectTo
		} else {
			const db = getDb(env)
			const userWorkspaces = await getUserWorkspaces(db, userId)
			if (userWorkspaces.length > 0) {
				destination = `/workspaces/${userWorkspaces[0].id}`
			}
		}

		const toastTitle = isNewUser ? 'Account created' : 'Welcome back'

		return redirect(destination, {
			headers: [
				['set-cookie', clearOAuthStateCookie(isSecure)],
				['set-cookie', cookie],
				[
					'set-cookie',
					setToast({ type: 'success', title: toastTitle }, isSecure),
				],
			],
		})
	} catch (error) {
		console.error('[oauth callback] Error:', error)
		const errorMessage =
			error instanceof Error ? error.message : 'Authentication failed'
		return redirect('/login', {
			headers: [
				['set-cookie', clearOAuthStateCookie(isSecure)],
				[
					'set-cookie',
					setToast(
						{
							type: 'error',
							title: 'Authentication failed',
							description: errorMessage,
						},
						isSecure,
					),
				],
			],
		})
	}
}
