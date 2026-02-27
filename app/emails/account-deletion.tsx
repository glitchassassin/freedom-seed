import { Heading, Text } from '@react-email/components'
import { EmailLayout } from './components'

export interface AccountDeletionEmailProps {
	displayName: string
	scheduledForDeletionAt: Date
}

export function AccountDeletionEmail({
	displayName,
	scheduledForDeletionAt,
}: AccountDeletionEmailProps) {
	const deletionDate = scheduledForDeletionAt.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	return (
		<EmailLayout preview="Your account deletion request has been received">
			<Heading as="h1">Account deletion confirmed</Heading>
			<Text>Hi {displayName},</Text>
			<Text>
				We&apos;ve received your request to delete your account. Your personal
				information has been removed from our systems. Any remaining data will
				be permanently deleted on <strong>{deletionDate}</strong>.
			</Text>
			<Text>
				If you did not request this, please contact our support team
				immediately.
			</Text>
		</EmailLayout>
	)
}
