import { Google, GitHub } from 'arctic'
import { and, eq } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import {
	users,
	socialIdentities,
	workspaces,
	workspaceMembers
	
} from '~/db/schema'
import type {SocialProvider} from '~/db/schema';
import { secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'
import { signToken, verifySignedToken } from '~/utils/crypto.server'
import { generateSlug } from '~/utils/workspaces.server'

// ── Provider initialization ──────────────────────────────────────────────────

export function getGoogleProvider(env: ValidatedEnv, origin: string) {
	return new Google(
		env.GOOGLE_CLIENT_ID,
		env.GOOGLE_CLIENT_SECRET,
		`${origin}/social/google/callback`,
	)
}

export function getGitHubProvider(env: ValidatedEnv) {
	return new GitHub(
		env.GITHUB_CLIENT_ID,
		env.GITHUB_CLIENT_SECRET,
		null, // GitHub doesn't require redirect URI in constructor for arctic
	)
}

// ── State cookie ─────────────────────────────────────────────────────────────

const OAUTH_STATE_COOKIE = 'en_oauth_state'
const OAUTH_STATE_TTL_SECONDS = 600 // 10 minutes

export type OAuthStatePayload = {
	state: string
	codeVerifier?: string // for PKCE (Google)
	provider: SocialProvider
	mode: 'login' | 'link' // 'login' for auth, 'link' for account linking
	redirectTo?: string
}

export async function createOAuthStateCookie(
	env: ValidatedEnv,
	payload: OAuthStatePayload,
): Promise<string> {
	const data = JSON.stringify(payload)
	const signed = await signToken(data, env.SESSION_SECRET)
	const isSecure = env.ENVIRONMENT === 'production'
	return `${OAUTH_STATE_COOKIE}=${signed}; Path=/; Max-Age=${OAUTH_STATE_TTL_SECONDS}; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}

export async function readOAuthStateCookie(
	request: Request,
	env: ValidatedEnv,
): Promise<OAuthStatePayload | null> {
	const signed = readCookie(request, OAUTH_STATE_COOKIE)
	if (!signed) return null

	const data = await verifySignedToken(signed, env.SESSION_SECRET)
	if (!data) return null

	try {
		return JSON.parse(data) as OAuthStatePayload
	} catch {
		return null
	}
}

export function clearOAuthStateCookie(isSecure: boolean): string {
	return `${OAUTH_STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}

// ── User profile types ───────────────────────────────────────────────────────

export type OAuthProfile = {
	provider: SocialProvider
	providerUserId: string
	email: string
	displayName: string | null
	avatarUrl: string | null
	emailVerified: boolean
}

// ── Google profile fetch ─────────────────────────────────────────────────────

export async function getGoogleProfile(
	accessToken: string,
): Promise<OAuthProfile> {
	const response = await fetch(
		'https://www.googleapis.com/oauth2/v2/userinfo',
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	)
	if (!response.ok) throw new Error('Failed to fetch Google profile')
	const data = (await response.json()) as {
		id: string
		email: string
		name?: string
		picture?: string
		verified_email?: boolean
	}
	return {
		provider: 'google',
		providerUserId: data.id,
		email: data.email,
		displayName: data.name ?? null,
		avatarUrl: data.picture ?? null,
		emailVerified: data.verified_email ?? false,
	}
}

// ── GitHub profile fetch ─────────────────────────────────────────────────────

export async function getGitHubProfile(
	accessToken: string,
): Promise<OAuthProfile> {
	const [userResponse, emailsResponse] = await Promise.all([
		fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'User-Agent': 'Seed-Vault',
				Accept: 'application/vnd.github+json',
			},
		}),
		fetch('https://api.github.com/user/emails', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'User-Agent': 'Seed-Vault',
				Accept: 'application/vnd.github+json',
			},
		}),
	])

	if (!userResponse.ok) throw new Error('Failed to fetch GitHub profile')

	const userData = (await userResponse.json()) as {
		id: number
		login: string
		name?: string
		avatar_url?: string
		email?: string
	}

	// Get the primary verified email
	let email = userData.email ?? ''
	let emailVerified = false

	if (emailsResponse.ok) {
		const emails = (await emailsResponse.json()) as Array<{
			email: string
			primary: boolean
			verified: boolean
		}>
		const primary = emails.find((e) => e.primary && e.verified)
		if (primary) {
			email = primary.email
			emailVerified = true
		}
	}

	if (!email) throw new Error('No email available from GitHub')

	return {
		provider: 'github',
		providerUserId: String(userData.id),
		email,
		displayName: userData.name ?? userData.login,
		avatarUrl: userData.avatar_url ?? null,
		emailVerified,
	}
}

// ── User lookup/creation ─────────────────────────────────────────────────────

export async function findOrCreateUserFromOAuth(
	env: ValidatedEnv,
	profile: OAuthProfile,
): Promise<{ userId: string; isNewUser: boolean }> {
	const db = getDb(env)

	// Check if social identity already exists
	const existingIdentity = await db
		.select()
		.from(socialIdentities)
		.where(
			and(
				eq(socialIdentities.provider, profile.provider),
				eq(socialIdentities.providerUserId, profile.providerUserId),
			),
		)
		.limit(1)
		.then((r) => r[0])

	if (existingIdentity) {
		return { userId: existingIdentity.userId, isNewUser: false }
	}

	// Check if a user with this email exists (auto-link if email is verified by provider)
	if (profile.email && profile.emailVerified) {
		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.email, profile.email.toLowerCase()))
			.limit(1)
			.then((r) => r[0])

		if (existingUser) {
			// Link this social identity to the existing user
			await db.insert(socialIdentities).values({
				userId: existingUser.id,
				provider: profile.provider,
				providerUserId: profile.providerUserId,
				email: profile.email.toLowerCase(),
				displayName: profile.displayName,
				avatarUrl: profile.avatarUrl,
			})
			return { userId: existingUser.id, isNewUser: false }
		}
	}

	// Create new user + personal workspace + social identity atomically
	const userId = crypto.randomUUID()
	const workspaceId = crypto.randomUUID()
	const workspaceSlug = generateSlug('personal')

	await db.batch([
		db.insert(users).values({
			id: userId,
			email: profile.email.toLowerCase(),
			displayName: profile.displayName,
			emailVerifiedAt: profile.emailVerified ? new Date() : null,
		}),
		db.insert(workspaces).values({
			id: workspaceId,
			name: 'Personal',
			slug: workspaceSlug,
			isPersonal: true,
		}),
		db.insert(workspaceMembers).values({
			id: crypto.randomUUID(),
			workspaceId,
			userId,
			role: 'owner',
		}),
		db.insert(socialIdentities).values({
			userId,
			provider: profile.provider,
			providerUserId: profile.providerUserId,
			email: profile.email.toLowerCase(),
			displayName: profile.displayName,
			avatarUrl: profile.avatarUrl,
		}),
	])

	return { userId, isNewUser: true }
}

// ── Account linking ──────────────────────────────────────────────────────────

export async function linkSocialIdentity(
	env: ValidatedEnv,
	userId: string,
	profile: OAuthProfile,
): Promise<void> {
	const db = getDb(env)

	// Check if identity is already linked to another user
	const existing = await db
		.select()
		.from(socialIdentities)
		.where(
			and(
				eq(socialIdentities.provider, profile.provider),
				eq(socialIdentities.providerUserId, profile.providerUserId),
			),
		)
		.limit(1)
		.then((r) => r[0])

	if (existing) {
		if (existing.userId === userId) return // already linked to this user
		throw new Error('This account is already linked to a different user')
	}

	await db.insert(socialIdentities).values({
		userId,
		provider: profile.provider,
		providerUserId: profile.providerUserId,
		email: profile.email?.toLowerCase(),
		displayName: profile.displayName,
		avatarUrl: profile.avatarUrl,
	})
}

export async function unlinkSocialIdentity(
	env: ValidatedEnv,
	userId: string,
	identityId: string,
): Promise<void> {
	const db = getDb(env)
	await db
		.delete(socialIdentities)
		.where(
			and(
				eq(socialIdentities.id, identityId),
				eq(socialIdentities.userId, userId),
			),
		)
}

export async function getUserSocialIdentities(
	env: ValidatedEnv,
	userId: string,
) {
	const db = getDb(env)
	return db
		.select({
			id: socialIdentities.id,
			provider: socialIdentities.provider,
			email: socialIdentities.email,
			displayName: socialIdentities.displayName,
			createdAt: socialIdentities.createdAt,
		})
		.from(socialIdentities)
		.where(eq(socialIdentities.userId, userId))
}
