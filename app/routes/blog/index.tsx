import { Link } from 'react-router'
import type { Route } from './+types/index'
import { allPosts } from '~/utils/blog'
import { seoMeta } from '~/utils/seo'

export const links: Route.LinksFunction = () => [
	{
		rel: 'alternate',
		type: 'application/rss+xml',
		title: 'Seed Vault Blog',
		href: '/blog/rss.xml',
	},
]

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin
	return {
		posts: allPosts.map((post) => ({
			...post,
			formattedDate: new Date(
				post.frontmatter.date + 'T00:00:00Z',
			).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'UTC',
			}),
		})),
		origin,
	}
}

export function meta({ data }: Route.MetaArgs) {
	const origin = data?.origin ?? ''
	return seoMeta({
		title: 'Blog — Seed Vault',
		description: 'Updates, tips, and stories from the Seed Vault team.',
		url: `${origin}/blog`,
	})
}

export function headers() {
	return {
		'Cache-Control': 'public, max-age=300, s-maxage=3600',
	}
}

export default function BlogIndex({ loaderData }: Route.ComponentProps) {
	const { posts } = loaderData
	return (
		<main className="container mx-auto max-w-4xl px-4 py-16">
			<h1 className="text-h1 mb-2">Blog</h1>
			<p className="text-muted-foreground mb-12">
				Updates, tips, and stories from the Seed Vault team.
			</p>
			{posts.length === 0 ? (
				<p className="text-muted-foreground">No posts yet. Check back soon!</p>
			) : (
				<ul className="space-y-10">
					{posts.map((post) => (
						<li key={post.slug}>
							<article>
								<time
									dateTime={post.frontmatter.date}
									className="text-muted-foreground text-sm"
								>
									{post.formattedDate}
								</time>
								<h2 className="text-h3 mt-1 mb-2">
									<Link to={`/blog/${post.slug}`} className="hover:underline">
										{post.frontmatter.title}
									</Link>
								</h2>
								<p className="text-muted-foreground mb-3">
									{post.frontmatter.excerpt}
								</p>
								<Link
									to={`/blog/${post.slug}`}
									className="text-primary text-sm underline hover:no-underline"
								>
									Read more →
								</Link>
							</article>
						</li>
					))}
				</ul>
			)}
		</main>
	)
}
