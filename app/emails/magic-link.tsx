import { Button, Heading, Text } from '@react-email/components'
import { ctaButton, EmailLayout, mutedText } from './components'

export interface MagicLinkEmailProps {
	loginUrl: string
}

export function MagicLinkEmail({ loginUrl }: MagicLinkEmailProps) {
	return (
		<EmailLayout preview="Your sign-in link for Seed Vault">
			<Heading as="h1">Sign in to Seed Vault</Heading>
			<Text>
				Click the button below to sign in. This link will expire in 15 minutes.
			</Text>
			<Button href={loginUrl} style={ctaButton}>
				Sign In
			</Button>
			<Text style={mutedText}>
				Or copy and paste this URL into your browser: {loginUrl}
			</Text>
			<Text style={mutedText}>
				If you didn&apos;t request this link, you can safely ignore this email.
			</Text>
		</EmailLayout>
	)
}
