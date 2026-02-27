import { Form, redirect } from 'react-router'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { logAuditEvent } from '~/db/audit-log.server'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { FLAG_REGISTRY, featureFlagKeys } from '~/utils/feature-flags'
import type { FeatureFlagKey } from '~/utils/feature-flags'
import {
	getAllFlags,
	getFlagOverrides,
	removeFlagOverride,
	setFlagOverride,
} from '~/utils/feature-flags.server'
import { requireRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'
import { requireWorkspaceMember } from '~/utils/workspace-context'

export async function loader({ context }: Route.LoaderArgs) {
	requireRole(context, 'admin')
	const member = requireWorkspaceMember(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)

	const [flags, overrides] = await Promise.all([
		getAllFlags(db, member.workspaceId),
		getFlagOverrides(db, member.workspaceId),
	])

	return { flags, overrides, workspaceId: member.workspaceId }
}

export async function action({ request, context }: Route.ActionArgs) {
	requireRole(context, 'admin')
	const user = requireUser(context)
	const member = requireWorkspaceMember(context)
	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const db = getDb(env)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'toggle') {
		const key = formData.get('key') as string
		const enabled = formData.get('enabled') as string

		if (!featureFlagKeys.includes(key as FeatureFlagKey)) {
			throw new Response('Invalid feature flag key', { status: 400 })
		}

		await setFlagOverride(db, {
			key: key as FeatureFlagKey,
			workspaceId: member.workspaceId,
			enabled: enabled === 'true',
		})

		await logAuditEvent({
			db,
			workspaceId: member.workspaceId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'feature_flag.updated',
			targetType: 'feature_flag',
			targetLabel: key,
			metadata: { enabled: enabled === 'true', scope: 'workspace' },
		})

		return redirect(
			`/workspaces/${member.workspaceId}/settings/feature-flags`,
			{
				headers: {
					'set-cookie': setToast(
						{ type: 'success', title: 'Flag updated' },
						isSecure,
					),
				},
			},
		)
	}

	if (intent === 'reset') {
		const key = formData.get('key') as string

		if (!featureFlagKeys.includes(key as FeatureFlagKey)) {
			throw new Response('Invalid feature flag key', { status: 400 })
		}

		await removeFlagOverride(db, {
			key: key as FeatureFlagKey,
			workspaceId: member.workspaceId,
		})

		await logAuditEvent({
			db,
			workspaceId: member.workspaceId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'feature_flag.deleted',
			targetType: 'feature_flag',
			targetLabel: key,
		})

		return redirect(
			`/workspaces/${member.workspaceId}/settings/feature-flags`,
			{
				headers: {
					'set-cookie': setToast(
						{ type: 'success', title: 'Flag reset to default' },
						isSecure,
					),
				},
			},
		)
	}

	throw new Response('Unknown intent', { status: 400 })
}

export function meta() {
	return [{ title: 'Feature Flags' }]
}

export default function FeatureFlagsPage({ loaderData }: Route.ComponentProps) {
	const { flags, overrides, workspaceId } = loaderData

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">Feature Flags</h1>
			<p className="text-muted-foreground mt-1">
				Manage feature flags for this workspace.
			</p>

			<div className="mt-8">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Flag</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Override</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{featureFlagKeys.map((key) => {
							const entry = FLAG_REGISTRY[key]
							const isEnabled = flags[key]
							const wsOverride = overrides.find(
								(o) => o.key === key && o.workspaceId === workspaceId,
							)
							const globalOverride = overrides.find(
								(o) => o.key === key && o.workspaceId === null,
							)

							let overrideLabel: string
							if (wsOverride) {
								overrideLabel = 'Workspace override'
							} else if (globalOverride) {
								overrideLabel = 'Global override'
							} else {
								overrideLabel = 'Default'
							}

							return (
								<TableRow key={key}>
									<TableCell className="font-medium">{entry.label}</TableCell>
									<TableCell className="text-muted-foreground">
										{entry.description}
									</TableCell>
									<TableCell>
										{isEnabled ? (
											<Badge variant="default">Enabled</Badge>
										) : (
											<Badge variant="secondary">Disabled</Badge>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{overrideLabel}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Form method="POST">
												<CsrfInput />
												<input type="hidden" name="intent" value="toggle" />
												<input type="hidden" name="key" value={key} />
												<input
													type="hidden"
													name="enabled"
													value={isEnabled ? 'false' : 'true'}
												/>
												<Button type="submit" variant="outline" size="sm">
													{isEnabled ? 'Disable' : 'Enable'}
												</Button>
											</Form>
											{wsOverride && (
												<Form method="POST">
													<CsrfInput />
													<input type="hidden" name="intent" value="reset" />
													<input type="hidden" name="key" value={key} />
													<Button type="submit" variant="ghost" size="sm">
														Reset
													</Button>
												</Form>
											)}
										</div>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>
		</main>
	)
}
