import { Button, Heading, Text } from '@react-email/components'
import { ctaButton, EmailLayout, mutedText } from './components'

export interface TeamInvitationEmailProps {
	teamName: string
	inviterName: string
	acceptUrl: string
}

export function TeamInvitationEmail({
	teamName,
	inviterName,
	acceptUrl,
}: TeamInvitationEmailProps) {
	return (
		<EmailLayout preview={`${inviterName} invited you to ${teamName}`}>
			<Heading as="h1">You&apos;re invited!</Heading>
			<Text>
				{inviterName} has invited you to join <strong>{teamName}</strong> on
				Seed Vault.
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
