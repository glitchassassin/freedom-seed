import type { Route } from './+types/sitemap[.]xml'

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin

	const staticPages = [
		{ loc: '/', priority: '1.0', changefreq: 'weekly' },
		{ loc: '/login', priority: '0.3', changefreq: 'monthly' },
		{ loc: '/signup', priority: '0.5', changefreq: 'monthly' },
		{ loc: '/privacy', priority: '0.2', changefreq: 'yearly' },
		{ loc: '/terms', priority: '0.2', changefreq: 'yearly' },
	]

	const urls = staticPages
		.map(
			(page) => `  <url>
    <loc>${origin}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
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
