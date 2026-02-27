export function jsonLd(data: Record<string, unknown>): {
	'script:ld+json': Record<string, unknown>
} {
	return { 'script:ld+json': data }
}

export function websiteJsonLd(name: string, url: string) {
	return jsonLd({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name,
		url,
	})
}

export function webPageJsonLd(
	name: string,
	description: string,
	url: string,
) {
	return jsonLd({
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name,
		description,
		url,
	})
}
