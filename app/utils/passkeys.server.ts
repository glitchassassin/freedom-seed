import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
	AuthenticatorTransportFuture,
	RegistrationResponseJSON,
	AuthenticationResponseJSON,
} from '@simplewebauthn/server'
import { and, eq } from 'drizzle-orm'
import type { ValidatedEnv } from '../../workers/env'
import { getDb } from '~/db/client.server'
import { passkeyCredentials, users } from '~/db/schema'
import { secureSuffix } from '~/utils/cookie-flags.server'
import { readCookie } from '~/utils/cookie.server'
import {
	toBase64url,
	signToken,
	verifySignedToken,
} from '~/utils/crypto.server'

// ── Base64url helpers (no Buffer — Cloudflare Workers) ────────────────────────

function fromBase64url(b64url: string): Uint8Array<ArrayBuffer> {
	const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
	const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
	const binary = atob(b64 + pad)
	const buffer = new ArrayBuffer(binary.length)
	const bytes = new Uint8Array(buffer)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

// ── Challenge cookie ──────────────────────────────────────────────────────────

const CHALLENGE_COOKIE = 'en_webauthn_challenge'
const CHALLENGE_TTL_SECONDS = 300 // 5 minutes

export async function createChallengeCookie(
	env: ValidatedEnv,
	challenge: string,
	context?: string, // optional extra data like userId
): Promise<string> {
	const payload = context ? `${challenge}:${context}` : challenge
	const signed = await signToken(payload, env.SESSION_SECRET)
	const isSecure = env.ENVIRONMENT === 'production'
	return `${CHALLENGE_COOKIE}=${signed}; Path=/; Max-Age=${CHALLENGE_TTL_SECONDS}; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}

export async function readChallengeCookie(
	request: Request,
	env: ValidatedEnv,
): Promise<{ challenge: string; context?: string } | null> {
	const signed = readCookie(request, CHALLENGE_COOKIE)
	if (!signed) return null

	const payload = await verifySignedToken(signed, env.SESSION_SECRET)
	if (!payload) return null

	const colonIdx = payload.indexOf(':')
	if (colonIdx === -1) return { challenge: payload }
	return {
		challenge: payload.slice(0, colonIdx),
		context: payload.slice(colonIdx + 1),
	}
}

export function clearChallengeCookie(isSecure: boolean): string {
	return `${CHALLENGE_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secureSuffix(isSecure)}; SameSite=Lax`
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function getRegistrationOptions(
	env: ValidatedEnv,
	userId: string,
	userEmail: string,
) {
	const db = getDb(env)

	// Get existing passkeys to exclude during registration
	const existingCredentials = await db
		.select({
			credentialId: passkeyCredentials.credentialId,
			transports: passkeyCredentials.transports,
		})
		.from(passkeyCredentials)
		.where(eq(passkeyCredentials.userId, userId))

	const options = await generateRegistrationOptions({
		rpName: env.RP_NAME,
		rpID: env.RP_ID,
		userName: userEmail,
		userDisplayName: userEmail,
		attestationType: 'none',
		excludeCredentials: existingCredentials.map((cred) => ({
			id: cred.credentialId,
			transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
		})),
		authenticatorSelection: {
			residentKey: 'preferred',
			userVerification: 'preferred',
		},
	})

	return options
}

export async function verifyAndSaveRegistration(
	env: ValidatedEnv,
	userId: string,
	response: RegistrationResponseJSON,
	expectedChallenge: string,
	name: string,
) {
	const verification = await verifyRegistrationResponse({
		response,
		expectedChallenge,
		expectedOrigin: env.RP_ORIGIN,
		expectedRPID: env.RP_ID,
	})

	if (!verification.verified || !verification.registrationInfo) {
		throw new Error('Registration verification failed')
	}

	const { credential, credentialDeviceType, credentialBackedUp } =
		verification.registrationInfo

	const db = getDb(env)
	await db.insert(passkeyCredentials).values({
		userId,
		credentialId: credential.id,
		publicKey: toBase64url(credential.publicKey),
		counter: credential.counter,
		deviceType: credentialDeviceType,
		backedUp: credentialBackedUp,
		transports: credential.transports as string[] | undefined,
		name: name || 'Passkey',
	})

	return verification
}

// ── Authentication ────────────────────────────────────────────────────────────

export async function getAuthenticationOptions(env: ValidatedEnv) {
	const options = await generateAuthenticationOptions({
		rpID: env.RP_ID,
		userVerification: 'preferred',
		// Don't pass allowCredentials - let the authenticator show all available passkeys
	})

	return options
}

export async function verifyAndAuthenticate(
	env: ValidatedEnv,
	response: AuthenticationResponseJSON,
	expectedChallenge: string,
) {
	const db = getDb(env)

	// Look up the credential
	const credential = await db
		.select()
		.from(passkeyCredentials)
		.where(eq(passkeyCredentials.credentialId, response.id))
		.limit(1)
		.then((r) => r[0])

	if (!credential) {
		throw new Error('Credential not found')
	}

	const verification = await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin: env.RP_ORIGIN,
		expectedRPID: env.RP_ID,
		credential: {
			id: credential.credentialId,
			publicKey: fromBase64url(credential.publicKey),
			counter: credential.counter,
			transports: (credential.transports ??
				[]) as AuthenticatorTransportFuture[],
		},
	})

	if (!verification.verified) {
		throw new Error('Authentication verification failed')
	}

	// Update counter and lastUsedAt
	await db
		.update(passkeyCredentials)
		.set({
			counter: verification.authenticationInfo.newCounter,
			lastUsedAt: new Date(),
		})
		.where(eq(passkeyCredentials.id, credential.id))

	// Look up the user
	const user = await db
		.select()
		.from(users)
		.where(eq(users.id, credential.userId))
		.limit(1)
		.then((r) => r[0])

	if (!user) {
		throw new Error('User not found')
	}

	return { user, credential }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getUserPasskeys(env: ValidatedEnv, userId: string) {
	const db = getDb(env)
	return db
		.select({
			id: passkeyCredentials.id,
			name: passkeyCredentials.name,
			createdAt: passkeyCredentials.createdAt,
			lastUsedAt: passkeyCredentials.lastUsedAt,
			deviceType: passkeyCredentials.deviceType,
			backedUp: passkeyCredentials.backedUp,
		})
		.from(passkeyCredentials)
		.where(eq(passkeyCredentials.userId, userId))
}

export async function deletePasskey(
	env: ValidatedEnv,
	userId: string,
	passkeyId: string,
): Promise<boolean> {
	const db = getDb(env)
	const result = await db
		.delete(passkeyCredentials)
		.where(
			and(
				eq(passkeyCredentials.id, passkeyId),
				eq(passkeyCredentials.userId, userId),
			),
		)

	return result.success
}

export async function renamePasskey(
	env: ValidatedEnv,
	userId: string,
	passkeyId: string,
	name: string,
): Promise<void> {
	const db = getDb(env)
	await db
		.update(passkeyCredentials)
		.set({ name })
		.where(
			and(
				eq(passkeyCredentials.id, passkeyId),
				eq(passkeyCredentials.userId, userId),
			),
		)
}
