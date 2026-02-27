import type { MetaDescriptor } from 'react-router'

type SeoConfig = {
	title: string
	description: string
	url?: string
	image?: string
	type?: 'website' | 'article'
}

export function seoMeta(config: SeoConfig): MetaDescriptor[] {
	const { title, description, url, image, type = 'website' } = config

	const meta: MetaDescriptor[] = [
		{ title },
		{ name: 'description', content: description },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:type', content: type },
	]

	if (url) {
		meta.push({ property: 'og:url', content: url })
	}

	if (image) {
		meta.push({ property: 'og:image', content: image })
		meta.push({ name: 'twitter:card', content: 'summary_large_image' })
		meta.push({ name: 'twitter:image', content: image })
	} else {
		meta.push({ name: 'twitter:card', content: 'summary' })
	}

	meta.push({ name: 'twitter:title', content: title })
	meta.push({ name: 'twitter:description', content: description })

	if (url) {
		meta.push({ tagName: 'link', rel: 'canonical', href: url })
	}

	return meta
}
