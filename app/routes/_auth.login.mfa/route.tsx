import type { SubmissionResult } from '@conform-to/dom'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import { useState } from 'react'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import { mfaCredentials } from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	clearMfaPendingCookie,
	verifyBackupCode,
	verifyMfaPendingCookie,
	verifyTotpCode,
} from '~/utils/mfa.server'
import { requireRateLimit } from '~/utils/require-rate-limit.server'
import { createSession } from '~/utils/session.server'
import { setToast } from '~/utils/toast.server'

const totpSchema = z.object({
	mode: z.literal('totp'),
	code: z
		.string()
		.length(6, 'Code must be 6 digits')
		.regex(/^\d{6}$/, 'Code must be 6 digits'),
})

const backupSchema = z.object({
	mode: z.literal('backup'),
	code: z.string().min(1, 'Backup code is required'),
})

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const userId = await verifyMfaPendingCookie(request, env)
	if (!userId) throw redirect('/login')
	return null
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	await requireRateLimit(env, request, {
		prefix: 'mfa-challenge',
		limit: 5,
		windowSeconds: 300,
	})

	const userId = await verifyMfaPendingCookie(request, env)
	if (!userId) throw redirect('/login')

	const formData = await request.formData()
	const mode = formData.get('mode') ?? 'totp'

	if (mode === 'totp') {
		const submission = parseWithZod(formData, { schema: totpSchema })
		if (submission.status !== 'success') return submission.reply()

		const db = getDb(env)
		const cred = await db
			.select()
			.from(mfaCredentials)
			.where(eq(mfaCredentials.userId, userId))
			.limit(1)
			.then((r) => r[0])

		if (!cred) throw redirect('/login')

		const valid = verifyTotpCode(cred.secret, submission.value.code)
		if (!valid) {
			return submission.reply({
				fieldErrors: { code: ['Invalid code. Please try again.'] },
			})
		}
	} else if (mode === 'backup') {
		const submission = parseWithZod(formData, { schema: backupSchema })
		if (submission.status !== 'success') return submission.reply()

		const valid = await verifyBackupCode(env, userId, submission.value.code)
		if (!valid) {
			return submission.reply({
				fieldErrors: { code: ['Invalid backup code.'] },
			})
		}
	} else {
		throw redirect('/login')
	}

	// MFA verified — create a real session
	const { cookie: sessionCookie } = await createSession(env, userId, request)

	// Honor redirectTo if it's a safe relative path
	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirectTo') ?? '/'
	const safeRedirect =
		redirectTo.startsWith('/') && !redirectTo.startsWith('//')
			? redirectTo
			: '/'

	return redirect(safeRedirect, {
		headers: [
			['set-cookie', setToast({ type: 'success', title: 'Welcome back' }, isSecure)],
			['set-cookie', sessionCookie],
			['set-cookie', clearMfaPendingCookie(isSecure)],
		],
	})
}

export function meta() {
	return [{ title: 'Two-factor authentication - Seed Vault' }]
}

export default function MfaChallengePage({ actionData }: Route.ComponentProps) {
	const [mode, setMode] = useState<'totp' | 'backup'>('totp')

	// Cast actionData for Conform's useForm — action returns SubmissionResult on validation errors
	const lastResult = actionData as SubmissionResult<string[]> | undefined

	return (
		<div className="space-y-6">
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Two-factor authentication
				</h1>
				<p className="text-muted-foreground text-sm">
					{mode === 'totp'
						? 'Enter the 6-digit code from your authenticator app.'
						: 'Enter one of your backup codes.'}
				</p>
			</div>

			{mode === 'totp' ? (
				<TotpForm lastResult={lastResult} />
			) : (
				<BackupForm lastResult={lastResult} />
			)}

			<div className="text-center">
				{mode === 'totp' ? (
					<button
						type="button"
						onClick={() => setMode('backup')}
						className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
					>
						Use a backup code instead
					</button>
				) : (
					<button
						type="button"
						onClick={() => setMode('totp')}
						className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
					>
						Use authenticator app
					</button>
				)}
			</div>
		</div>
	)
}

function TotpForm({
	lastResult,
}: {
	lastResult: SubmissionResult<string[]> | undefined
}) {
	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: totpSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<Form method="POST" {...getFormProps(form)} className="space-y-4">
			<CsrfInput />
			<input type="hidden" name="mode" value="totp" />

			{form.errors && (
				<p className="text-destructive text-sm">{form.errors[0]}</p>
			)}

			<div className="space-y-2">
				<Label htmlFor={fields.code.id}>Authentication code</Label>
				<Input
					{...getInputProps(fields.code, { type: 'text' })}
					autoComplete="one-time-code"
					inputMode="numeric"
					maxLength={6}
					placeholder="000000"
					autoFocus
					aria-invalid={!!fields.code.errors}
				/>
				{fields.code.errors && (
					<p className="text-destructive text-sm">{fields.code.errors[0]}</p>
				)}
			</div>

			<Button type="submit" className="w-full">
				Verify
			</Button>
		</Form>
	)
}

function BackupForm({
	lastResult,
}: {
	lastResult: SubmissionResult<string[]> | undefined
}) {
	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: backupSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<Form method="POST" {...getFormProps(form)} className="space-y-4">
			<CsrfInput />
			<input type="hidden" name="mode" value="backup" />

			{form.errors && (
				<p className="text-destructive text-sm">{form.errors[0]}</p>
			)}

			<div className="space-y-2">
				<Label htmlFor={fields.code.id}>Backup code</Label>
				<Input
					{...getInputProps(fields.code, { type: 'text' })}
					autoComplete="off"
					placeholder="Enter backup code"
					autoFocus
					aria-invalid={!!fields.code.errors}
				/>
				{fields.code.errors && (
					<p className="text-destructive text-sm">{fields.code.errors[0]}</p>
				)}
			</div>

			<Button type="submit" className="w-full">
				Verify
			</Button>
		</Form>
	)
}
