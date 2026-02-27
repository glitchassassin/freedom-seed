import type { Route } from './+types/sitemap[.]xml'

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin

	const staticPages = ['/', '/login', '/signup', '/privacy', '/terms']

	const urls = staticPages
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
