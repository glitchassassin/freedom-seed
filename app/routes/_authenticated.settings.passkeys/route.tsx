import { parseWithZod } from '@conform-to/zod/v4'
import { useState } from 'react'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { Badge } from '~/components/ui/badge'
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
import { countUserAuthMethods } from '~/utils/auth-methods.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	deletePasskey,
	getUserPasskeys,
	renamePasskey,
} from '~/utils/passkeys.server'
import { requireUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'

// ── Schemas ───────────────────────────────────────────────────────────────────

const deleteSchema = z.object({
	intent: z.literal('delete'),
	passkeyId: z.string().min(1),
})

const renameSchema = z.object({
	intent: z.literal('rename'),
	passkeyId: z.string().min(1),
	name: z.string().min(1, 'Name is required').max(100),
})

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const user = requireUser(context)
	const passkeys = await getUserPasskeys(env, user.id)
	const authMethods = await countUserAuthMethods(env, user.id)
	const canDelete = authMethods.total > 1
	return { passkeys, canDelete }
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const user = requireUser(context)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = parseWithZod(formData, { schema: deleteSchema })
		if (submission.status !== 'success') return submission.reply()

		const authMethods = await countUserAuthMethods(env, user.id)
		if (authMethods.total <= 1) {
			return redirect('/settings/passkeys', {
				headers: {
					'set-cookie': setToast(
						{
							type: 'error',
							title: 'Cannot remove',
							description: 'You must keep at least one sign-in method.',
						},
						isSecure,
					),
				},
			})
		}

		await deletePasskey(env, user.id, submission.value.passkeyId)

		return redirect('/settings/passkeys', {
			headers: {
				'set-cookie': setToast(
					{ type: 'success', title: 'Passkey removed' },
					isSecure,
				),
			},
		})
	}

	if (intent === 'rename') {
		const submission = parseWithZod(formData, { schema: renameSchema })
		if (submission.status !== 'success') return submission.reply()

		await renamePasskey(
			env,
			user.id,
			submission.value.passkeyId,
			submission.value.name,
		)

		return redirect('/settings/passkeys', {
			headers: {
				'set-cookie': setToast(
					{ type: 'success', title: 'Passkey renamed' },
					isSecure,
				),
			},
		})
	}

	return { error: 'Unknown intent' }
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export function meta() {
	return [{ title: 'Passkeys - Seed Vault' }]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date | null): string {
	if (!date) return 'Never'
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(date)
}

// ── Component ─────────────────────────────────────────────────────────────────

type Passkey = Awaited<ReturnType<typeof getUserPasskeys>>[number]

export default function PasskeysSettingsPage({
	loaderData,
}: Route.ComponentProps) {
	const { passkeys, canDelete } = loaderData

	const [registerOpen, setRegisterOpen] = useState(false)
	const [registerName, setRegisterName] = useState('')
	const [registerStatus, setRegisterStatus] = useState<
		'idle' | 'loading' | 'error'
	>('idle')
	const [registerError, setRegisterError] = useState<string | null>(null)

	async function handleRegister() {
		setRegisterStatus('loading')
		setRegisterError(null)

		try {
			// 1. Fetch registration options
			const optionsFormData = new FormData()
			const optionsRes = await fetch(
				'/resources/passkeys/registration-options',
				{
					method: 'POST',
					body: optionsFormData,
				},
			)

			if (!optionsRes.ok) {
				throw new Error('Failed to get registration options')
			}

			const options = await optionsRes.json()

			// 2. Start browser registration via @simplewebauthn/browser
			const { startRegistration } = await import('@simplewebauthn/browser')
			const registration = await startRegistration({
				optionsJSON: options as unknown as Parameters<
					typeof startRegistration
				>[0]['optionsJSON'],
			})

			// 3. Submit verification
			const verifyFormData = new FormData()
			verifyFormData.set('response', JSON.stringify(registration))
			verifyFormData.set('name', registerName || 'Passkey')

			const verifyRes = await fetch('/resources/passkeys/registration-verify', {
				method: 'POST',
				body: verifyFormData,
			})

			if (!verifyRes.ok) {
				const body = (await verifyRes.json()) as { error?: string }
				throw new Error(body.error ?? 'Verification failed')
			}

			// 4. Reload to show the new passkey
			setRegisterOpen(false)
			setRegisterName('')
			window.location.reload()
		} catch (err) {
			setRegisterError(
				err instanceof Error ? err.message : 'Registration failed',
			)
			setRegisterStatus('idle')
		}
	}

	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Passkeys</h1>
					<p className="text-muted-foreground text-sm">
						Passkeys let you sign in without a password using your device&apos;s
						built-in authenticator (Face ID, Touch ID, Windows Hello, etc.).
					</p>
				</div>

				{/* Register new passkey */}
				<Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
					<DialogTrigger asChild>
						<Button className="w-full">Add a passkey</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add a passkey</DialogTitle>
							<DialogDescription>
								Give your passkey a name so you can identify it later (e.g.
								&quot;MacBook Pro&quot; or &quot;iPhone&quot;).
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							{registerError && (
								<p className="text-destructive text-sm">{registerError}</p>
							)}

							<div className="space-y-2">
								<Label htmlFor="passkey-name">Passkey name</Label>
								<Input
									id="passkey-name"
									value={registerName}
									onChange={(e) => setRegisterName(e.target.value)}
									placeholder="My MacBook"
									autoComplete="off"
								/>
							</div>
						</div>

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setRegisterOpen(false)
									setRegisterName('')
									setRegisterError(null)
									setRegisterStatus('idle')
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={() => void handleRegister()}
								disabled={registerStatus === 'loading'}
							>
								{registerStatus === 'loading' ? 'Registering…' : 'Register'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Passkey list */}
				{passkeys.length === 0 ? (
					<div className="rounded-lg border border-dashed p-6 text-center">
						<p className="text-muted-foreground text-sm">
							No passkeys registered yet.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{passkeys.map((passkey) => (
							<PasskeyRow
								key={passkey.id}
								passkey={passkey}
								canDelete={canDelete}
							/>
						))}
					</div>
				)}
			</div>
		</main>
	)
}

// ── PasskeyRow ────────────────────────────────────────────────────────────────

function PasskeyRow({
	passkey,
	canDelete,
}: {
	passkey: Passkey
	canDelete: boolean
}) {
	const [renameOpen, setRenameOpen] = useState(false)

	return (
		<div className="flex items-start justify-between rounded-lg border p-4">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{passkey.name}</span>
					{passkey.backedUp && (
						<Badge variant="secondary" className="text-xs">
							Synced
						</Badge>
					)}
					{passkey.deviceType === 'multiDevice' && !passkey.backedUp && (
						<Badge variant="outline" className="text-xs">
							Multi-device
						</Badge>
					)}
				</div>
				<p className="text-muted-foreground text-xs">
					Added {formatDate(passkey.createdAt)}
					{passkey.lastUsedAt
						? ` · Last used ${formatDate(passkey.lastUsedAt)}`
						: ''}
				</p>
			</div>

			<div className="flex gap-2">
				{/* Rename dialog */}
				<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
					<DialogTrigger asChild>
						<Button variant="ghost" size="sm">
							Rename
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Rename passkey</DialogTitle>
							<DialogDescription>
								Update the display name for this passkey.
							</DialogDescription>
						</DialogHeader>

						<Form
							method="POST"
							className="space-y-4"
							onSubmit={() => setRenameOpen(false)}
						>
							<input type="hidden" name="intent" value="rename" />
							<input type="hidden" name="passkeyId" value={passkey.id} />

							<div className="space-y-2">
								<Label htmlFor={`rename-${passkey.id}`}>New name</Label>
								<Input
									id={`rename-${passkey.id}`}
									name="name"
									defaultValue={passkey.name}
									autoComplete="off"
								/>
							</div>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setRenameOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit">Save</Button>
							</DialogFooter>
						</Form>
					</DialogContent>
				</Dialog>

				{/* Delete */}
				<Form method="POST">
					<input type="hidden" name="intent" value="delete" />
					<input type="hidden" name="passkeyId" value={passkey.id} />
					<Button
						type="submit"
						variant="ghost"
						size="sm"
						className="text-destructive hover:text-destructive"
						disabled={!canDelete}
						title={
							canDelete
								? undefined
								: 'You must keep at least one sign-in method'
						}
						onClick={(e) => {
							if (
								!window.confirm(
									`Remove the passkey "${passkey.name}"? You will no longer be able to use it to sign in.`,
								)
							) {
								e.preventDefault()
							}
						}}
					>
						Remove
					</Button>
				</Form>
			</div>
		</div>
	)
}
