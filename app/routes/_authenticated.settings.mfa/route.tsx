import type { SubmissionResult } from '@conform-to/dom'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Form, redirect, useActionData } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getDb } from '~/db/client.server'
import {
	mfaBackupCodes,
	mfaCredentials,
	passwordCredentials,
} from '~/db/schema'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	generateBackupCodes,
	generateMfaSecret,
	verifyTotpCode,
} from '~/utils/mfa.server'
import { verifyPassword } from '~/utils/password.server'
import { requireUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'

const setupSchema = z.object({
	intent: z.literal('setup'),
})

const verifySchema = z.object({
	intent: z.literal('verify'),
	code: z
		.string()
		.length(6, 'Code must be 6 digits')
		.regex(/^\d{6}$/, 'Code must be 6 digits'),
})

const disableSchema = z.object({
	intent: z.literal('disable'),
	password: z.string().min(1, 'Password is required'),
})

type LoaderData = {
	status: 'active' | 'inactive'
}

export async function loader({ context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const user = requireUser(context)
	const db = getDb(env)

	const cred = await db
		.select()
		.from(mfaCredentials)
		.where(eq(mfaCredentials.userId, user.id))
		.limit(1)
		.then((r) => r[0])

	const status = cred?.verifiedAt ? 'active' : 'inactive'
	return { status } satisfies LoaderData
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const user = requireUser(context)
	const db = getDb(env)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'setup') {
		const submission = parseWithZod(formData, { schema: setupSchema })
		if (submission.status !== 'success') return submission.reply()

		const { secret, otpauthUri } = generateMfaSecret(user.email)
		const qrDataUrl = await QRCode.toDataURL(otpauthUri)

		// Upsert: replace any abandoned setup
		await db
			.insert(mfaCredentials)
			.values({ userId: user.id, secret, verifiedAt: null })
			.onConflictDoUpdate({
				target: mfaCredentials.userId,
				set: { secret, verifiedAt: null, createdAt: new Date() },
			})

		return { intent: 'setup' as const, qrDataUrl, secret }
	}

	if (intent === 'verify') {
		const submission = parseWithZod(formData, { schema: verifySchema })
		if (submission.status !== 'success') return submission.reply()

		const cred = await db
			.select()
			.from(mfaCredentials)
			.where(eq(mfaCredentials.userId, user.id))
			.limit(1)
			.then((r) => r[0])

		if (!cred || cred.verifiedAt) {
			return { error: 'No pending MFA setup found' }
		}

		const valid = verifyTotpCode(cred.secret, submission.value.code)
		if (!valid) {
			return submission.reply({
				fieldErrors: { code: ['Invalid code. Please try again.'] },
			})
		}

		// Generate backup codes
		const { codes, hashes } = await generateBackupCodes()

		// Mark as verified, delete old backup codes, insert new ones — atomically
		await db.batch([
			db
				.update(mfaCredentials)
				.set({ verifiedAt: new Date() })
				.where(eq(mfaCredentials.userId, user.id)),
			db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, user.id)),
			db.insert(mfaBackupCodes).values(
				hashes.map((codeHash) => ({
					userId: user.id,
					codeHash,
				})),
			),
		])

		return { intent: 'verify' as const, backupCodes: codes }
	}

	if (intent === 'disable') {
		const submission = parseWithZod(formData, { schema: disableSchema })
		if (submission.status !== 'success') return submission.reply()

		// Verify password
		const cred = await db
			.select()
			.from(passwordCredentials)
			.where(eq(passwordCredentials.userId, user.id))
			.limit(1)
			.then((r) => r[0])

		const valid = cred
			? await verifyPassword(submission.value.password, cred.hash)
			: false

		if (!valid) {
			return submission.reply({
				fieldErrors: { password: ['Incorrect password'] },
			})
		}

		// Delete MFA credentials and backup codes — atomically
		await db.batch([
			db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, user.id)),
			db.delete(mfaCredentials).where(eq(mfaCredentials.userId, user.id)),
		])

		return redirect('/settings/mfa', {
			headers: {
				'set-cookie': setToast({
					type: 'success',
					title: 'Two-factor authentication disabled',
				}),
			},
		})
	}

	return { error: 'Unknown intent' }
}

export function meta() {
	return [{ title: 'Two-factor authentication - Seed Vault' }]
}

export default function MfaSettingsPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	// Determine current view based on loader and action data
	const { status } = loaderData

	// Persist setup data (qrDataUrl/secret) across form resubmissions so that
	// a failed verify attempt doesn't lose the setup view.
	const [setupData, setSetupData] = useState<{
		qrDataUrl: string
		secret: string
	} | null>(null)

	useEffect(() => {
		if (
			actionData &&
			'intent' in actionData &&
			actionData.intent === 'setup' &&
			'qrDataUrl' in actionData
		) {
			setSetupData({
				qrDataUrl: actionData.qrDataUrl,
				secret: actionData.secret,
			})
		}
	}, [actionData])

	// Show backup codes after successful verification
	if (
		actionData &&
		'intent' in actionData &&
		actionData.intent === 'verify' &&
		'backupCodes' in actionData
	) {
		return <BackupCodesView codes={actionData.backupCodes} />
	}

	// Show QR code setup (either from fresh action or persisted state)
	if (setupData) {
		return (
			<SetupView qrDataUrl={setupData.qrDataUrl} secret={setupData.secret} />
		)
	}

	// Active MFA — show status and disable option
	if (status === 'active') {
		return <ActiveView actionData={actionData} />
	}

	// Inactive — show enable button
	return <InactiveView />
}

function InactiveView() {
	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Two-factor authentication
					</h1>
					<p className="text-muted-foreground text-sm">
						Add an extra layer of security to your account using an
						authenticator app.
					</p>
				</div>

				<Form method="POST">
					<CsrfInput />
					<input type="hidden" name="intent" value="setup" />
					<Button type="submit" className="w-full">
						Enable two-factor authentication
					</Button>
				</Form>
			</div>
		</main>
	)
}

function SetupView({
	qrDataUrl,
	secret,
}: {
	qrDataUrl: string
	secret: string
}) {
	const actionData = useActionData<typeof action>()

	// Cast actionData for Conform's useForm — action returns SubmissionResult on validation errors
	const lastResult =
		actionData && typeof actionData === 'object' && 'status' in actionData
			? (actionData as SubmissionResult<string[]>)
			: undefined

	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: verifySchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Set up two-factor authentication
					</h1>
					<p className="text-muted-foreground text-sm">
						Scan the QR code below with your authenticator app (Google
						Authenticator, Authy, 1Password, etc.), then enter the 6-digit code
						to confirm.
					</p>
				</div>

				<div className="flex justify-center">
					<img
						src={qrDataUrl}
						alt="Scan this QR code with your authenticator app"
						width={200}
						height={200}
						className="rounded-lg border"
					/>
				</div>

				<div className="space-y-2">
					<Label>Manual entry key</Label>
					<div className="bg-muted rounded-md p-3">
						<code className="text-sm break-all select-all">{secret}</code>
					</div>
				</div>

				<Form method="POST" {...getFormProps(form)} className="space-y-4">
					<CsrfInput />
					<input type="hidden" name="intent" value="verify" />

					{form.errors && (
						<p className="text-destructive text-sm">{form.errors[0]}</p>
					)}

					<div className="space-y-2">
						<Label htmlFor={fields.code.id}>Verification code</Label>
						<Input
							{...getInputProps(fields.code, { type: 'text' })}
							autoComplete="one-time-code"
							inputMode="numeric"
							maxLength={6}
							placeholder="000000"
							aria-invalid={!!fields.code.errors}
						/>
						{fields.code.errors && (
							<p className="text-destructive text-sm">
								{fields.code.errors[0]}
							</p>
						)}
					</div>

					<Button type="submit" className="w-full">
						Verify and enable
					</Button>
				</Form>
			</div>
		</main>
	)
}

function BackupCodesView({ codes }: { codes: string[] }) {
	const [copied, setCopied] = useState(false)

	function handleCopy() {
		void navigator.clipboard.writeText(codes.join('\n')).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		})
	}

	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Two-factor authentication enabled
					</h1>
					<p className="text-muted-foreground text-sm">
						Your account is now protected with two-factor authentication.
					</p>
				</div>

				<div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/30">
					<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
						Save these backup codes — they won&apos;t be shown again
					</p>
					<p className="text-muted-foreground mt-1 text-sm">
						Each code can only be used once. Store them somewhere safe.
					</p>
				</div>

				<div className="bg-muted rounded-lg p-4">
					<div className="grid grid-cols-2 gap-2">
						{codes.map((code) => (
							<code key={code} className="text-center font-mono text-sm">
								{code}
							</code>
						))}
					</div>
				</div>

				<div className="flex gap-3">
					<Button variant="outline" className="flex-1" onClick={handleCopy}>
						{copied ? 'Copied!' : 'Copy codes'}
					</Button>
					<Button asChild className="flex-1">
						<a href="/settings/mfa">Done</a>
					</Button>
				</div>
			</div>
		</main>
	)
}

function ActiveView({ actionData }: { actionData: unknown }) {
	const [dialogOpen, setDialogOpen] = useState(false)

	// Cast actionData for Conform's useForm — action returns SubmissionResult on validation errors
	const lastResult =
		actionData && typeof actionData === 'object' && 'status' in actionData
			? (actionData as SubmissionResult<string[]>)
			: undefined

	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: disableSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Two-factor authentication
					</h1>
					<p className="text-muted-foreground text-sm">
						Manage your two-factor authentication settings.
					</p>
				</div>

				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="flex items-center gap-3">
						<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
							Enabled
						</span>
						<span className="text-sm">Authenticator app</span>
					</div>
				</div>

				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" className="w-full text-red-600">
							Disable two-factor authentication
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Disable two-factor authentication</DialogTitle>
							<DialogDescription>
								This will remove the extra security layer from your account.
								Enter your password to confirm.
							</DialogDescription>
						</DialogHeader>

						<Form method="POST" {...getFormProps(form)} className="space-y-4">
							<CsrfInput />
							<input type="hidden" name="intent" value="disable" />

							{form.errors && (
								<p className="text-destructive text-sm">{form.errors[0]}</p>
							)}

							<div className="space-y-2">
								<Label htmlFor={fields.password.id}>Password</Label>
								<Input
									{...getInputProps(fields.password, { type: 'password' })}
									autoComplete="current-password"
									aria-invalid={!!fields.password.errors}
								/>
								{fields.password.errors && (
									<p className="text-destructive text-sm">
										{fields.password.errors[0]}
									</p>
								)}
							</div>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" variant="destructive">
									Disable
								</Button>
							</DialogFooter>
						</Form>
					</DialogContent>
				</Dialog>
			</div>
		</main>
	)
}
