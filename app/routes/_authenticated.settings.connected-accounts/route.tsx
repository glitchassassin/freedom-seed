import { parseWithZod } from '@conform-to/zod/v4'
import { useState } from 'react'
import { Form, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
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
import { ProviderIcon } from '~/components/ui/provider-icon'
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
								<ProviderIcon provider="google" size={18} />
								Connect with Google
							</a>
						)}
						{!connectedProviders.has('github') && (
							<a
								href="/social/github?redirectTo=/settings/connected-accounts"
								className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
							>
								<ProviderIcon provider="github" size={18} />
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
