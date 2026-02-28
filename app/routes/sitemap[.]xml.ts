import type { Route } from './+types/sitemap[.]xml'
import { allPosts } from '~/utils/blog.server'

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin

	const staticPages = ['/', '/login', '/signup', '/privacy', '/terms', '/blog']
	const blogPages = allPosts.map((post) => `/blog/${post.slug}`)

	const urls = [...staticPages, ...blogPages]
		.map(
			(loc) => `  <url>
    <loc>${origin}${loc}</loc>
  </url>`,
		)
		.join('\n')

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600',
		},
	})
}
