import { Button, Heading, Text } from '@react-email/components'
import { ctaButton, EmailLayout, mutedText } from './components'

export interface WorkspaceInvitationEmailProps {
	workspaceName: string
	inviterName: string
	acceptUrl: string
}

export function WorkspaceInvitationEmail({
	workspaceName,
	inviterName,
	acceptUrl,
}: WorkspaceInvitationEmailProps) {
	return (
		<EmailLayout preview={`${inviterName} invited you to ${workspaceName}`}>
			<Heading as="h1">You&apos;re invited!</Heading>
			<Text>
				{inviterName} has invited you to join <strong>{workspaceName}</strong>{' '}
				on Seed Vault.
			</Text>
			<Button href={acceptUrl} style={ctaButton}>
				Accept Invitation
			</Button>
			<Text style={mutedText}>
				Or copy and paste this URL into your browser: {acceptUrl}
			</Text>
		</EmailLayout>
	)
}
