import { Button, Heading, Text } from '@react-email/components'
import { ctaButton, EmailLayout, mutedText } from './components'

export interface ResetPasswordEmailProps {
	resetUrl: string
}

export function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
	return (
		<EmailLayout preview="Reset your password">
			<Heading as="h1">Reset your password</Heading>
			<Text>
				Someone requested a password reset for your account. If this was you,
				click the button below. This link will expire in 1 hour.
			</Text>
			<Button href={resetUrl} style={ctaButton}>
				Reset Password
			</Button>
			<Text style={mutedText}>
				Or copy and paste this URL into your browser: {resetUrl}
			</Text>
			<Text>
				If you didn&apos;t request this, you can safely ignore this email.
			</Text>
		</EmailLayout>
	)
}
