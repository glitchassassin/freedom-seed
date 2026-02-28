import { data, Link } from 'react-router'
import type { Route } from './+types/index'
import { BlogProse, blogComponents } from '~/components/blog-prose'
import { getPost } from '~/utils/blog'
import { seoMeta } from '~/utils/seo'

export function loader({ params, request }: Route.LoaderArgs) {
	const { slug } = params
	const result = getPost(slug!)
	if (!result) throw data(null, { status: 404 })
	const origin = new URL(request.url).origin
	return {
		post: result.post,
		formattedDate: new Date(
			result.post.frontmatter.date + 'T00:00:00Z',
		).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC',
		}),
		origin,
	}
}

export function meta({ data: loaderData }: Route.MetaArgs) {
	if (!loaderData) return []
	const { post, origin } = loaderData
	return seoMeta({
		title: `${post.frontmatter.title} — Seed Vault Blog`,
		description: post.frontmatter.excerpt,
		url: `${origin}/blog/${post.slug}`,
		type: 'article',
	})
}

export function headers() {
	return {
		'Cache-Control': 'public, max-age=300, s-maxage=3600',
	}
}

export default function BlogPost({ loaderData }: Route.ComponentProps) {
	const { post, formattedDate } = loaderData
	const result = getPost(post.slug)
	if (!result) return null
	const { Component } = result
	return (
		<main className="container mx-auto px-4 py-16">
			<div className="mx-auto mb-8 max-w-prose">
				<Link
					to="/blog"
					className="text-muted-foreground text-sm hover:underline"
				>
					← Back to blog
				</Link>
				<div className="mt-4">
					<time
						dateTime={post.frontmatter.date}
						className="text-muted-foreground text-sm"
					>
						{formattedDate}
					</time>
					<p className="text-muted-foreground text-sm">
						By {post.frontmatter.author}
					</p>
				</div>
			</div>
			<BlogProse>
				<Component components={blogComponents} />
			</BlogProse>
		</main>
	)
}
