import { parseWithZod } from '@conform-to/zod/v4'
import { Form, useLoaderData } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/route'
import { CsrfInput } from '~/components/csrf-input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
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
import { teamMemberRoleEnum } from '~/db/schema'
import { TeamInvitationEmail } from '~/emails/team-invitation'
import { getCloudflare } from '~/utils/cloudflare-context'
import { sendEmail } from '~/utils/email.server'
import {
	createTeamInvitation,
	getPendingInvitations,
	revokeInvitation,
} from '~/utils/invitations.server'
import { hasRole, requireRole } from '~/utils/rbac.server'
import { requireUser } from '~/utils/session-context'
import { requireTeamMember } from '~/utils/team-context'
import {
	changeTeamMemberRole,
	getTeamMembers,
	removeTeamMember,
} from '~/utils/teams.server'

export async function loader({ params, context }: Route.LoaderArgs) {
	requireRole(context, 'member')
	const member = requireTeamMember(context)
	const user = requireUser(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const teamId = params.teamId!

	const members = await getTeamMembers(db, teamId)

	// Only admin+ can see pending invitations
	const isAdmin = hasRole(member.role, 'admin')
	const invitations = isAdmin ? await getPendingInvitations(db, teamId) : []

	return {
		members,
		invitations,
		currentUserId: user.id,
		currentRole: member.role,
		isAdmin,
		teamId,
		teamName: member.teamName,
	}
}

const inviteSchema = z.object({
	email: z.string().email('Please enter a valid email'),
	role: z.enum(['admin', 'member']),
})

export async function action({ request, params, context }: Route.ActionArgs) {
	const user = requireUser(context)
	const member = requireTeamMember(context)
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const teamId = params.teamId!
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'invite') {
		requireRole(context, 'admin')
		const submission = parseWithZod(formData, { schema: inviteSchema })
		if (submission.status !== 'success') return submission.reply()

		const { email, role } = submission.value

		// Check if already a member
		const members = await getTeamMembers(db, teamId)
		if (members.some((m) => m.email === email.toLowerCase())) {
			return submission.reply({
				fieldErrors: { email: ['This user is already a team member'] },
			})
		}

		const { rawToken } = await createTeamInvitation(db, {
			teamId,
			invitedByUserId: user.id,
			email,
			role,
		})

		const acceptUrl = `${new URL(request.url).origin}/invitations/${rawToken}`
		try {
			await sendEmail(env, {
				to: email.toLowerCase(),
				subject: `You're invited to ${member.teamName}`,
				react: TeamInvitationEmail({
					teamName: member.teamName,
					inviterName: user.displayName || user.email,
					acceptUrl,
				}),
			})
		} catch (err) {
			console.error('[invite] Failed to send invitation email:', err)
		}

		await logAuditEvent({
			db,
			teamId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'member.invited',
			targetType: 'member',
			targetLabel: email.toLowerCase(),
			metadata: { role },
		})

		return submission.reply({ resetForm: true })
	}

	if (intent === 'revoke') {
		requireRole(context, 'admin')
		const invitationId = formData.get('invitationId') as string
		await revokeInvitation(db, invitationId)
		await logAuditEvent({
			db,
			teamId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'member.invitation_revoked',
			targetType: 'invitation',
			targetId: invitationId,
		})
		return { ok: true }
	}

	if (intent === 'remove') {
		requireRole(context, 'admin')
		const targetUserId = formData.get('userId') as string

		// Guard: cannot remove the last owner
		const members = await getTeamMembers(db, teamId)
		const target = members.find((m) => m.userId === targetUserId)
		if (target?.role === 'owner') {
			const ownerCount = members.filter((m) => m.role === 'owner').length
			if (ownerCount <= 1) {
				throw new Response('Cannot remove the last owner', { status: 400 })
			}
		}

		await removeTeamMember(db, teamId, targetUserId)
		await logAuditEvent({
			db,
			teamId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'member.removed',
			targetType: 'member',
			targetId: targetUserId,
			targetLabel: target?.email,
		})
		return { ok: true }
	}

	if (intent === 'change-role') {
		requireRole(context, 'admin')
		const targetUserId = formData.get('userId') as string
		const newRole = formData.get('role') as string

		if (!teamMemberRoleEnum.includes(newRole as any)) {
			throw new Response('Invalid role', { status: 400 })
		}

		// Guard: cannot demote the last owner
		const members = await getTeamMembers(db, teamId)
		const target = members.find((m) => m.userId === targetUserId)
		if (target?.role === 'owner' && newRole !== 'owner') {
			const ownerCount = members.filter((m) => m.role === 'owner').length
			if (ownerCount <= 1) {
				throw new Response('Cannot demote the last owner', { status: 400 })
			}
		}

		await changeTeamMemberRole(db, teamId, targetUserId, newRole as any)
		await logAuditEvent({
			db,
			teamId,
			actorId: user.id,
			actorEmail: user.email,
			action: 'member.role_changed',
			targetType: 'member',
			targetId: targetUserId,
			targetLabel: target?.email,
			metadata: { from: target?.role, to: newRole },
		})
		return { ok: true }
	}

	throw new Response('Unknown intent', { status: 400 })
}

export function meta() {
	return [{ title: 'Team Members' }]
}

export default function TeamMembersPage({ loaderData }: Route.ComponentProps) {
	const {
		members,
		invitations,
		currentUserId,
		currentRole,
		isAdmin,
		teamId,
		teamName,
	} = loaderData

	return (
		<main className="mx-auto max-w-4xl p-6">
			<h1 className="text-2xl font-semibold">Members</h1>
			<p className="text-muted-foreground mt-1">
				Manage who has access to {teamName}.
			</p>

			<div className="mt-6">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Member</TableHead>
							<TableHead>Role</TableHead>
							{isAdmin && <TableHead className="text-right">Actions</TableHead>}
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((m) => (
							<TableRow key={m.id}>
								<TableCell>
									<div>
										<p className="font-medium">
											{m.displayName || m.email}
											{m.userId === currentUserId && (
												<span className="text-muted-foreground ml-2 text-xs">
													(you)
												</span>
											)}
										</p>
										{m.displayName && (
											<p className="text-muted-foreground text-sm">{m.email}</p>
										)}
									</div>
								</TableCell>
								<TableCell>
									<Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>
										{m.role}
									</Badge>
								</TableCell>
								{isAdmin && (
									<TableCell className="text-right">
										{m.userId !== currentUserId && (
											<div className="flex justify-end gap-2">
												{m.role !== 'owner' && (
													<Form method="POST">
														<CsrfInput />
														<input
															type="hidden"
															name="intent"
															value="change-role"
														/>
														<input
															type="hidden"
															name="userId"
															value={m.userId}
														/>
														<input
															type="hidden"
															name="role"
															value={m.role === 'admin' ? 'member' : 'admin'}
														/>
														<Button variant="ghost" size="sm">
															{m.role === 'admin'
																? 'Demote to member'
																: 'Promote to admin'}
														</Button>
													</Form>
												)}
												<Form method="POST">
													<CsrfInput />
													<input type="hidden" name="intent" value="remove" />
													<input type="hidden" name="userId" value={m.userId} />
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive"
													>
														Remove
													</Button>
												</Form>
											</div>
										)}
									</TableCell>
								)}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{isAdmin && (
				<>
					{invitations.length > 0 && (
						<div className="mt-8">
							<h2 className="text-lg font-semibold">Pending Invitations</h2>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invitations.map((inv) => (
										<TableRow key={inv.id}>
											<TableCell>{inv.email}</TableCell>
											<TableCell>
												<Badge variant="outline">{inv.role}</Badge>
											</TableCell>
											<TableCell className="text-right">
												<Form method="POST">
													<CsrfInput />
													<input type="hidden" name="intent" value="revoke" />
													<input
														type="hidden"
														name="invitationId"
														value={inv.id}
													/>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive"
													>
														Revoke
													</Button>
												</Form>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					<div className="mt-8">
						<h2 className="text-lg font-semibold">Invite a member</h2>
						<Form method="POST" className="mt-4 flex items-end gap-4">
							<CsrfInput />
							<input type="hidden" name="intent" value="invite" />
							<div className="flex-1 space-y-2">
								<Label htmlFor="invite-email">Email</Label>
								<Input
									id="invite-email"
									name="email"
									type="email"
									placeholder="colleague@example.com"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="invite-role">Role</Label>
								<select
									id="invite-role"
									name="role"
									defaultValue="member"
									className="border-input bg-background flex h-10 rounded-md border px-3 py-2 text-sm"
								>
									<option value="member">Member</option>
									<option value="admin">Admin</option>
								</select>
							</div>
							<Button type="submit">Send invite</Button>
						</Form>
					</div>
				</>
			)}
		</main>
	)
}
