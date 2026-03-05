import { Heading, Link, Text } from '@react-email/components'
import { ctaButton, EmailLayout } from './components'

export interface PaymentFailedEmailProps {
	workspaceName: string
	billingUrl: string
}

export function PaymentFailedEmail({
	workspaceName,
	billingUrl,
}: PaymentFailedEmailProps) {
	return (
		<EmailLayout preview={`Payment failed for ${workspaceName}`}>
			<Heading as="h1">Payment failed</Heading>
			<Text>
				We were unable to process the latest payment for your workspace{' '}
				<strong>{workspaceName}</strong>. Please update your payment method to
				avoid any interruption in service.
			</Text>
			<Link href={billingUrl} style={ctaButton}>
				Update payment method
			</Link>
		</EmailLayout>
	)
}
