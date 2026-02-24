import { Button, Heading, Text } from '@react-email/components'
import { ctaButton, EmailLayout, mutedText } from './components'

export interface VerifyEmailProps {
	verifyUrl: string
}

export function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
	return (
		<EmailLayout preview="Verify your email address">
			<Heading as="h1">Verify your email</Heading>
			<Text>
				Click the button below to verify your email address. This link will
				expire in 24 hours.
			</Text>
			<Button href={verifyUrl} style={ctaButton}>
				Verify Email
			</Button>
			<Text style={mutedText}>
				Or copy and paste this URL into your browser: {verifyUrl}
			</Text>
		</EmailLayout>
	)
}
