import { Link, redirect } from 'react-router'

import type { Route } from './+types/route'
import { cta, faq, features, footer, hero, siteConfig } from './content'
import { Button } from '~/components/ui/button'
import { Icon } from '~/components/ui/icon'
import { getDb } from '~/db/client.server'
import { getCloudflare } from '~/utils/cloudflare-context'
import { getLastWorkspaceId } from '~/utils/last-workspace-cookie.server'
import { seoMeta } from '~/utils/seo'
import { getOptionalUser } from '~/utils/session-context'
import { websiteJsonLd } from '~/utils/structured-data'
import { getUserWorkspaces } from '~/utils/workspaces.server'

export function meta({ data }: Route.MetaArgs) {
	const origin = data?.origin ?? ''
	return [
		...seoMeta({
			title: `${siteConfig.name} — ${siteConfig.tagline}`,
			description: siteConfig.description,
			url: `${origin}/`,
		}),
		websiteJsonLd(siteConfig.name, `${origin}/`),
	]
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin
	const user = getOptionalUser(context)
	if (user) {
		const { env } = getCloudflare(context)
		const db = getDb(env)
		const userWorkspaces = await getUserWorkspaces(db, user.id)
		if (userWorkspaces.length > 0) {
			const lastWorkspaceId = getLastWorkspaceId(request)
			const targetWorkspace =
				userWorkspaces.find((t) => t.id === lastWorkspaceId) ??
				userWorkspaces[0]
			throw redirect(`/workspaces/${targetWorkspace.id}`)
		}
	}
	return { user: !!user, origin }
}

function HeroSection({ user }: { user: boolean }) {
	return (
		<section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 pt-24 pb-16 text-center sm:pt-32 sm:pb-20">
			<h1 className="text-h2 sm:text-h1 text-foreground tracking-tight">
				{hero.title}
			</h1>
			<p className="text-muted-foreground text-body-md sm:text-body-lg max-w-2xl">
				{hero.subtitle}
			</p>

			<div className="flex flex-col gap-4 sm:flex-row">
				{user ? (
					<Button asChild size="lg">
						<Link to={hero.authedCta.href}>{hero.authedCta.label}</Link>
					</Button>
				) : (
					<>
						<Button asChild size="lg">
							<Link to={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link to={hero.secondaryCta.href}>{hero.secondaryCta.label}</Link>
						</Button>
					</>
				)}
			</div>
		</section>
	)
}

function FeaturesSection() {
	return (
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
	)
}

function FaqSection() {
	return (
		<section className="border-border border-t py-16 sm:py-24">
			<div className="mx-auto max-w-3xl px-6">
				<h2 className="text-h3 sm:text-h2 mb-12 text-center">
					Frequently asked questions
				</h2>
				<div className="divide-border divide-y">
					{faq.map((item) => (
						<details key={item.question} className="group py-4">
							<summary className="text-body-sm flex cursor-pointer list-none items-center justify-between font-medium">
								{item.question}
								<span className="text-muted-foreground ml-4 shrink-0 transition-transform group-open:rotate-45">
									+
								</span>
							</summary>
							<p className="text-muted-foreground text-body-sm mt-3 leading-relaxed">
								{item.answer}
							</p>
						</details>
					))}
				</div>
			</div>
		</section>
	)
}

function CtaSection({ user }: { user: boolean }) {
	return (
		<section className="border-border border-t py-16 sm:py-24">
			<div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center">
				<h2 className="text-h3 sm:text-h2">{cta.title}</h2>
				<p className="text-muted-foreground text-body-md">{cta.subtitle}</p>

				{user ? (
					<Button asChild size="lg">
						<Link to={cta.authedCta.href}>{cta.authedCta.label}</Link>
					</Button>
				) : (
					<Button asChild size="lg">
						<Link to={cta.primaryCta.href}>{cta.primaryCta.label}</Link>
					</Button>
				)}
			</div>
		</section>
	)
}

function Footer() {
	return (
		<footer className="border-border border-t py-8">
			<div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
				<p className="text-muted-foreground text-body-xs">
					{footer.copyright} &middot; {footer.builtWith}
				</p>
				<nav aria-label="Footer" className="flex gap-4">
					{footer.links.map((link) => (
						<Link
							key={link.href}
							to={link.href}
							className="text-muted-foreground hover:text-foreground text-body-xs transition-colors"
						>
							{link.label}
						</Link>
					))}
				</nav>
			</div>
		</footer>
	)
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData

	return (
		<main className="bg-background text-foreground min-h-screen">
			<HeroSection user={!!user} />
			<FeaturesSection />
			<FaqSection />
			<CtaSection user={!!user} />
			<Footer />
		</main>
	)
}
