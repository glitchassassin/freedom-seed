import { Link, redirect } from 'react-router'

import type { Route } from './+types/index'
import { Button } from '~/components/ui/button'
import { Icon } from '~/components/ui/icon'
import type { IconName } from '~/components/ui/icon'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { getLastTeamId } from '~/utils/last-team-cookie.server'
import { getOptionalUser } from '~/utils/session-context'
import { getUserTeams } from '~/utils/teams.server'

export function meta() {
	return [
		{ title: 'Seed Vault — Catalog and Share Your Seeds' },
		{
			name: 'description',
			content:
				'Seed Vault helps you catalog your seed collection, track growing information, upload photos, and collaborate with your gardening team.',
		},
	]
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const user = getOptionalUser(context)
	if (user) {
		const { env } = getCloudflare(context)
		const db = getDb(env)
		const userTeams = await getUserTeams(db, user.id)
		if (userTeams.length > 0) {
			const lastTeamId = getLastTeamId(request)
			const targetTeam =
				userTeams.find((t) => t.id === lastTeamId) ?? userTeams[0]
			throw redirect(`/teams/${targetTeam.id}`)
		}
	}
	return { user: null }
}

const features: { icon: IconName; title: string; description: string }[] = [
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
		title: 'Team Collaboration',
		description:
			'Create teams and share vaults with fellow gardeners to build a collection together.',
	},
	{
		icon: 'lucide--shield-check',
		title: 'Role-Based Access',
		description:
			'Assign viewer, editor, or owner roles to team members for fine-grained permissions.',
	},
]

export default function Home({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData

	return (
		<main className="bg-background text-foreground min-h-screen">
			{/* Hero */}
			<section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 pt-24 pb-16 text-center sm:pt-32 sm:pb-20">
				<h1 className="text-h2 sm:text-h1 text-foreground tracking-tight">
					Seed Vault
				</h1>
				<p className="text-muted-foreground text-body-md sm:text-body-lg max-w-2xl">
					Catalog your seed collection, track growing information, upload
					photos, and collaborate with your gardening team — all in one place.
				</p>

				<div className="flex flex-col gap-4 sm:flex-row">
					{user ? (
						<Button asChild size="lg">
							<Link to="/vaults">Go to your vaults</Link>
						</Button>
					) : (
						<>
							<Button asChild size="lg">
								<Link to="/signup">Get started</Link>
							</Button>
							<Button asChild variant="outline" size="lg">
								<Link to="/login">Sign in</Link>
							</Button>
						</>
					)}
				</div>
			</section>

			{/* Features */}
			<section className="border-border border-t py-16 sm:py-24">
				<div className="mx-auto max-w-6xl px-6">
					<h2 className="text-h3 sm:text-h2 mb-12 text-center">
						Everything you need to manage your seeds
					</h2>

					<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<article
								key={feature.title}
								className="bg-card border-border flex flex-col gap-4 rounded-lg border p-6"
							>
								<Icon name={feature.icon} size="xl" className="text-primary" />
								<h3 className="text-h5">{feature.title}</h3>
								<p className="text-muted-foreground text-body-sm">
									{feature.description}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="border-border border-t py-16 sm:py-24">
				<div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center">
					<h2 className="text-h3 sm:text-h2">Start building your vault</h2>
					<p className="text-muted-foreground text-body-md">
						Sign up for free and begin cataloging your seed collection today.
					</p>

					{user ? (
						<Button asChild size="lg">
							<Link to="/vaults">Go to your vaults</Link>
						</Button>
					) : (
						<Button asChild size="lg">
							<Link to="/signup">Create your account</Link>
						</Button>
					)}
				</div>
			</section>

			{/* Footer */}
			<footer className="border-border border-t py-8">
				<p className="text-muted-foreground text-body-xs text-center">
					Built with Freedom Seed
				</p>
			</footer>
		</main>
	)
}
