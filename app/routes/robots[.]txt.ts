import type { Route } from './+types/robots[.]txt'

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin

	const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml`

	return new Response(robotsTxt, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'public, max-age=3600',
		},
	})
}
