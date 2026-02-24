import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Text,
} from '@react-email/components'
import type { BodyProps } from '@react-email/components'
import type { ReactNode } from 'react'

const main: BodyProps['style'] = {
	backgroundColor: '#f6f9fc',
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
	backgroundColor: '#ffffff',
	border: '1px solid #f0f0f0',
	borderRadius: '5px',
	margin: '0 auto',
	padding: '45px',
	maxWidth: '600px',
}

const footer = {
	color: '#8898aa',
	fontSize: '12px',
	lineHeight: '16px',
	marginTop: '32px',
}

export const ctaButton = {
	backgroundColor: '#18181b',
	borderRadius: '5px',
	color: '#fff',
	display: 'inline-block' as const,
	fontSize: '14px',
	fontWeight: 600,
	lineHeight: '50px',
	textAlign: 'center' as const,
	textDecoration: 'none',
	width: '200px',
}

export const mutedText = {
	color: '#8898aa',
	fontSize: '14px',
	marginTop: '24px',
}

export function EmailLayout({
	preview,
	children,
}: {
	preview: string
	children: ReactNode
}) {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Body style={main}>
				<Container style={container}>
					{children}
					<Text style={footer}>
						You received this email because you have a Seed Vault account. If
						you didn&apos;t expect this, you can safely ignore it.
					</Text>
				</Container>
			</Body>
		</Html>
	)
}
