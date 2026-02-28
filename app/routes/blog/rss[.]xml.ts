import type { Route } from './+types/rss[.]xml'
import { allPosts } from '~/utils/blog.server'

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin

	const items = allPosts
		.map(
			(post) => `    <item>
      <title><![CDATA[${post.frontmatter.title}]]></title>
      <description><![CDATA[${post.frontmatter.excerpt}]]></description>
      <link>${origin}/blog/${post.slug}</link>
      <guid isPermaLink="true">${origin}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.frontmatter.date).toUTCString()}</pubDate>
    </item>`,
		)
		.join('\n')

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Seed Vault Blog</title>
    <description>Updates, tips, and stories from the Seed Vault team.</description>
    <link>${origin}/blog</link>
    <atom:link href="${origin}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
${items}
  </channel>
</rss>`

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300, s-maxage=3600',
		},
	})
}
