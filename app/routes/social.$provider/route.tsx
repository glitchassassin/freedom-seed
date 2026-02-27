import { generateCodeVerifier, generateState } from 'arctic'
import { redirect } from 'react-router'
import type { Route } from './+types/route'
import type { SocialProvider } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import { getOptionalUser } from '~/utils/session-context'
import {
	createOAuthStateCookie,
	getGitHubProvider,
	getGoogleProvider
	
} from '~/utils/social-auth.server'
import type {OAuthStatePayload} from '~/utils/social-auth.server';

const VALID_PROVIDERS: SocialProvider[] = ['google', 'github']

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const provider = params.provider as string

	if (!VALID_PROVIDERS.includes(provider as SocialProvider)) {
		throw new Response('Invalid provider', { status: 404 })
	}

	const user = getOptionalUser(context)
	const mode: OAuthStatePayload['mode'] = user ? 'link' : 'login'
	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirectTo') ?? undefined
	const origin = url.origin
	const state = generateState()

	let authUrl: URL
	let codeVerifier: string | undefined

	if (provider === 'google') {
		if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
			throw new Response('Google OAuth not configured', { status: 503 })
		}
		codeVerifier = generateCodeVerifier()
		const google = getGoogleProvider(env, origin)
		authUrl = google.createAuthorizationURL(state, codeVerifier, [
			'openid',
			'email',
			'profile',
		])
	} else {
		// github
		if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
			throw new Response('GitHub OAuth not configured', { status: 503 })
		}
		const github = getGitHubProvider(env)
		authUrl = github.createAuthorizationURL(state, ['user:email'])
	}

	const stateCookie = await createOAuthStateCookie(env, {
		state,
		codeVerifier,
		provider: provider as SocialProvider,
		mode,
		redirectTo,
	})

	return redirect(authUrl.toString(), {
		headers: { 'set-cookie': stateCookie },
	})
}
