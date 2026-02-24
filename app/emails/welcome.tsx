import { Heading, Text } from '@react-email/components'
import { EmailLayout } from './components'

export interface WelcomeEmailProps {
	displayName: string
}

export function WelcomeEmail({ displayName }: WelcomeEmailProps) {
	return (
		<EmailLayout preview={`Welcome to Seed Vault, ${displayName}!`}>
			<Heading as="h1">Welcome, {displayName}!</Heading>
			<Text>
				Thanks for signing up. Your Seed Vault is ready — start cataloging your
				seeds and growing info right away.
			</Text>
			<Text>
				If you have any questions, just reply to this email — we&apos;re happy
				to help.
			</Text>
		</EmailLayout>
	)
}
