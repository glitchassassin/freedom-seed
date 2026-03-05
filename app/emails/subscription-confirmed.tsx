import { Heading, Text } from '@react-email/components'
import { EmailLayout } from './components'

export interface SubscriptionConfirmedEmailProps {
	workspaceName: string
	planName: string
}

export function SubscriptionConfirmedEmail({
	workspaceName,
	planName,
}: SubscriptionConfirmedEmailProps) {
	return (
		<EmailLayout preview={`${workspaceName} is now on the ${planName} plan`}>
			<Heading as="h1">Subscription confirmed</Heading>
			<Text>
				Your workspace <strong>{workspaceName}</strong> has been upgraded to the{' '}
				<strong>{planName}</strong> plan. You now have access to all the
				features included in your plan.
			</Text>
			<Text>
				You can manage your subscription at any time from your workspace billing
				settings.
			</Text>
		</EmailLayout>
	)
}
