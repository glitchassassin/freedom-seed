import { Form, Link, redirect } from 'react-router'
import type { Route } from './+types/route'
import { Button } from '~/components/ui/button'
import { logAuditEvent } from '~/db/audit-log.server'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import {
	acceptInvitation,
	findValidInvitation,
} from '~/utils/invitations.server'
import { getOptionalUser } from '~/utils/session-context'
import { setToast } from '~/utils/toast.server'
import { getWorkspaceById } from '~/utils/workspaces.server'

export async function loader({ params, context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	const db = getDb(env)
	const rawToken = params.token!
	const invitation = await findValidInvitation(db, rawToken)

	if (!invitation) {
		return {
			valid: false as const,
			workspaceName: null,
			email: null,
			role: null,
			state: 'invalid' as const,
			currentPath: null,
		}
	}

	const workspace = await getWorkspaceById(db, invitation.workspaceId)
	const user = getOptionalUser(context)

	let state: 'accept' | 'wrong-email' | 'unauthenticated'
	if (!user) {
		state = 'unauthenticated'
	} else if (user.email.toLowerCase() === invitation.email.toLowerCase()) {
		state = 'accept'
	} else {
		state = 'wrong-email'
	}

	return {
		valid: true as const,
		workspaceName: workspace?.name ?? 'Unknown Workspace',
		email: invitation.email,
		role: invitation.role,
		state,
		currentPath: `/invitations/${rawToken}`,
	}
}

export async function action({ params, context }: Route.ActionArgs) {
	const user = getOptionalUser(context)
	if (!user) throw redirect('/login')

	const { env } = getCloudflare(context)
	const isSecure = env.ENVIRONMENT === 'production'
	const db = getDb(env)
	const rawToken = params.token!
	const invitation = await findValidInvitation(db, rawToken)

	if (!invitation) {
		throw new Response('Invitation is invalid or expired', { status: 400 })
	}

	if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		throw new Response('Email mismatch', { status: 403 })
	}

	await acceptInvitation(db, {
		invitationId: invitation.id,
		userId: user.id,
		workspaceId: invitation.workspaceId,
		role: invitation.role,
	})

	await logAuditEvent({
		db,
		workspaceId: invitation.workspaceId,
		actorId: user.id,
		actorEmail: user.email,
		action: 'member.invitation_accepted',
		targetType: 'workspace',
		targetId: invitation.workspaceId,
	})

	return redirect(`/workspaces/${invitation.workspaceId}`, {
		headers: {
			'set-cookie': setToast(
				{ type: 'success', title: 'Welcome to the workspace!' },
				isSecure,
			),
		},
	})
}

export function meta({ data }: Route.MetaArgs) {
	return [
		{
			title: data?.workspaceName
				? `Join ${data.workspaceName}`
				: 'Workspace Invitation',
		},
	]
}

export default function InvitationPage({ loaderData }: Route.ComponentProps) {
	const { valid, workspaceName, email, role, state } = loaderData

	if (!valid) {
		return (
			<main className="mx-auto max-w-md p-6 text-center">
				<h1 className="text-2xl font-semibold">Invalid Invitation</h1>
				<p className="text-muted-foreground mt-2">
					This invitation link is invalid, expired, or has already been used.
				</p>
				<Button asChild className="mt-6">
					<Link to="/">Go home</Link>
				</Button>
			</main>
		)
	}

	if (state === 'unauthenticated') {
		const { currentPath } = loaderData
		return (
			<main className="mx-auto max-w-md p-6 text-center">
				<h1 className="text-2xl font-semibold">You&apos;re invited!</h1>
				<p className="text-muted-foreground mt-2">
					You&apos;ve been invited to join <strong>{workspaceName}</strong> as a{' '}
					{role}.
				</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Please sign in or create an account with <strong>{email}</strong> to
					accept.
				</p>
				<div className="mt-6 flex flex-col gap-3">
					<Button asChild>
						<Link to={`/login?redirectTo=${encodeURIComponent(currentPath!)}`}>
							Sign in
						</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link to={`/signup?redirectTo=${encodeURIComponent(currentPath!)}`}>
							Create account
						</Link>
					</Button>
				</div>
			</main>
		)
	}

	if (state === 'wrong-email') {
		return (
			<main className="mx-auto max-w-md p-6 text-center">
				<h1 className="text-2xl font-semibold">Email Mismatch</h1>
				<p className="text-muted-foreground mt-2">
					This invitation was sent to <strong>{email}</strong>. Please sign in
					with that email address to accept.
				</p>
				<Button asChild className="mt-6">
					<Link to="/login">Sign in with a different account</Link>
				</Button>
			</main>
		)
	}

	return (
		<main className="mx-auto max-w-md p-6 text-center">
			<h1 className="text-2xl font-semibold">Join {workspaceName}</h1>
			<p className="text-muted-foreground mt-2">
				You&apos;ve been invited to join as a {role}.
			</p>
			<Form method="POST" className="mt-6">
				<Button type="submit" className="w-full">
					Accept invitation
				</Button>
			</Form>
		</main>
	)
}
