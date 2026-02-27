import { parseWithZod } from '@conform-to/zod/v4'
import { useState } from 'react'
import { Form, redirect } from 'react-router'
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
import type { SocialProvider } from '~/db/schema'
import { countUserAuthMethods } from '~/utils/auth-methods.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { requireUser } from '~/utils/session-context'
import {
	getUserSocialIdentities,
	unlinkSocialIdentity,
} from '~/utils/social-auth.server'
import { setToast } from '~/utils/toast.server'

const unlinkSchema = z.object({
	intent: z.literal('unlink'),
	identityId: z.string().min(1, 'Identity ID is required'),
})

export async function loader({ context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const user = requireUser(context)
	const identities = await getUserSocialIdentities(env, user.id)
	const authMethods = await countUserAuthMethods(env, user.id)
	const canUnlink = authMethods.total > 1
	return { identities, canUnlink }
}

export async function action({ request, context }: Route.ActionArgs) {
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const user = requireUser(context)

	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: unlinkSchema })
	if (submission.status !== 'success') return submission.reply()

	const { identityId } = submission.value

	const authMethods = await countUserAuthMethods(env, user.id)
	if (authMethods.total <= 1) {
		return redirect('/settings/connected-accounts', {
			headers: {
				'set-cookie': setToast(
					{
						type: 'error',
						title: 'Cannot disconnect',
						description: 'You must keep at least one sign-in method.',
					},
					isSecure,
				),
			},
		})
	}

	await unlinkSocialIdentity(env, user.id, identityId)

	return redirect('/settings/connected-accounts', {
		headers: {
			'set-cookie': setToast(
				{ type: 'success', title: 'Account disconnected' },
				isSecure,
			),
		},
	})
}

export function meta() {
	return [{ title: 'Connected accounts - Seed Vault' }]
}

type Identity = {
	id: string
	provider: SocialProvider
	email: string | null
	displayName: string | null
	createdAt: Date
}

function ProviderIcon({ provider }: { provider: SocialProvider }) {
	if (provider === 'google') {
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				aria-hidden="true"
			>
				<path
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					fill="#4285F4"
				/>
				<path
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					fill="#34A853"
				/>
				<path
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					fill="#FBBC05"
				/>
				<path
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					fill="#EA4335"
				/>
			</svg>
		)
	}
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
		</svg>
	)
}

function providerLabel(provider: SocialProvider): string {
	return provider === 'google' ? 'Google' : 'GitHub'
}

function ConnectedAccountRow({
	identity,
	canUnlink,
}: {
	identity: Identity
	canUnlink: boolean
}) {
	const [dialogOpen, setDialogOpen] = useState(false)

	return (
		<div className="flex items-center justify-between rounded-lg border p-4">
			<div className="flex items-center gap-3">
				<ProviderIcon provider={identity.provider} />
				<div>
					<p className="text-sm font-medium">
						{providerLabel(identity.provider)}
					</p>
					{identity.email && (
						<p className="text-muted-foreground text-sm">{identity.email}</p>
					)}
					<p className="text-muted-foreground text-xs">
						Connected{' '}
						{identity.createdAt.toLocaleDateString(undefined, {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}
					</p>
				</div>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="text-destructive"
						disabled={!canUnlink}
						title={
							canUnlink
								? undefined
								: 'You must keep at least one sign-in method'
						}
					>
						Disconnect
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Disconnect {providerLabel(identity.provider)}
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to disconnect your{' '}
							{providerLabel(identity.provider)} account? You won&apos;t be able
							to sign in with it anymore.
						</DialogDescription>
					</DialogHeader>
					<Form method="POST">
						<CsrfInput />
						<input type="hidden" name="intent" value="unlink" />
						<input type="hidden" name="identityId" value={identity.id} />
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" variant="destructive">
								Disconnect
							</Button>
						</DialogFooter>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default function ConnectedAccountsPage({
	loaderData,
}: Route.ComponentProps) {
	const { identities, canUnlink } = loaderData

	const connectedProviders = new Set(identities.map((i) => i.provider))

	return (
		<main className="mx-auto max-w-md px-4 py-12">
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Connected accounts
					</h1>
					<p className="text-muted-foreground text-sm">
						Connect your social accounts to sign in faster.
					</p>
				</div>

				{identities.length > 0 && (
					<div className="space-y-3">
						<h2 className="text-sm font-medium">Connected</h2>
						{identities.map((identity) => (
							<ConnectedAccountRow
								key={identity.id}
								identity={identity}
								canUnlink={canUnlink}
							/>
						))}
					</div>
				)}

				<div className="space-y-3">
					<h2 className="text-sm font-medium">Available connections</h2>
					<div className="flex flex-col gap-2">
						{!connectedProviders.has('google') && (
							<a
								href="/social/google?redirectTo=/settings/connected-accounts"
								className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									aria-hidden="true"
								>
									<path
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										fill="#4285F4"
									/>
									<path
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										fill="#34A853"
									/>
									<path
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										fill="#FBBC05"
									/>
									<path
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										fill="#EA4335"
									/>
								</svg>
								Connect with Google
							</a>
						)}
						{!connectedProviders.has('github') && (
							<a
								href="/social/github?redirectTo=/settings/connected-accounts"
								className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									fill="currentColor"
									aria-hidden="true"
								>
									<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
								</svg>
								Connect with GitHub
							</a>
						)}
						{connectedProviders.has('google') &&
							connectedProviders.has('github') && (
								<p className="text-muted-foreground text-sm">
									All available accounts are connected.
								</p>
							)}
					</div>
				</div>
			</div>
		</main>
	)
}
