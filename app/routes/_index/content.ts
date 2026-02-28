import type { IconName } from '~/components/ui/icon'

export const siteConfig = {
	name: 'Seed Vault',
	tagline: 'Catalog and Share Your Seeds',
	description:
		'Catalog your seed collection, track growing information, upload photos, and collaborate with your gardening community — all in one place.',
}

export const hero = {
	title: 'Seed Vault',
	subtitle: siteConfig.description,
	primaryCta: { label: 'Get started', href: '/signup' },
	secondaryCta: { label: 'Sign in', href: '/login' },
	authedCta: { label: 'Go to your vaults', href: '/vaults' },
}

export const features: {
	icon: IconName
	title: string
	description: string
}[] = [
	{
		icon: 'lucide--lock-keyhole',
		title: 'Personal Vaults',
		description:
			'Keep your seed collection organized in personal vaults with full control over your data.',
	},
	{
		icon: 'lucide--sprout',
		title: 'Seed Cataloging',
		description:
			'Record plant names, varieties, planting seasons, germination times, sun, and water needs.',
	},
	{
		icon: 'lucide--camera',
		title: 'Photo Uploads',
		description:
			'Attach photos to every seed entry so you can visually track your collection over time.',
	},
	{
		icon: 'lucide--users',
		title: 'Workspace Collaboration',
		description:
			'Create workspaces and share vaults with fellow gardeners to build a collection together.',
	},
	{
		icon: 'lucide--shield-check',
		title: 'Role-Based Access',
		description:
			'Assign viewer, editor, or owner roles to workspace members for fine-grained permissions.',
	},
]

export const faq: { question: string; answer: string }[] = [
	{
		question: 'Is Seed Vault free to use?',
		answer:
			'Yes! Seed Vault is free for personal use with unlimited seeds in your personal vault. Workspace collaboration features are available on paid plans.',
	},
	{
		question: 'Can I share my seed collection with others?',
		answer:
			'Absolutely. Create a workspace and invite fellow gardeners by email. You can assign viewer, editor, or owner roles to control who can add or modify seeds.',
	},
	{
		question: 'What information can I track for each seed?',
		answer:
			'Each seed entry holds the plant name, variety, planting season, days to germination, sun and water requirements, notes, and one or more photos.',
	},
	{
		question: 'Is my data secure?',
		answer:
			"Your data is stored securely on Cloudflare's global network with encrypted connections. We never sell or share your personal information.",
	},
	{
		question: 'Can I export my seed collection?',
		answer:
			'Data export is on our roadmap. We believe your data belongs to you and are committed to providing full export capabilities.',
	},
]

export const cta = {
	title: 'Start building your vault',
	subtitle: 'Sign up for free and begin cataloging your seed collection today.',
	primaryCta: { label: 'Create your account', href: '/signup' },
	authedCta: { label: 'Go to your vaults', href: '/vaults' },
}

export const footer = {
	copyright: `© ${new Date().getFullYear()} Seed Vault`,
	builtWith: 'Built with Freedom Seed',
	links: [
		{ label: 'Blog', href: '/blog' },
		{ label: 'Privacy', href: '/privacy' },
		{ label: 'Terms', href: '/terms' },
	],
}
