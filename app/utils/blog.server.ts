import type { MDXComponents } from 'mdx/types'
import type { ReactElement } from 'react'
import type { Post, PostFrontmatter } from '~/types/blog'

export type MDXContentComponent = (props: {
	components?: MDXComponents
}) => ReactElement | null

type BlogModule = {
	default: MDXContentComponent
	frontmatter: PostFrontmatter
}

const modules = import.meta.glob<BlogModule>('/content/blog/*.mdx', {
	eager: true,
})

export const allPosts: Post[] = Object.entries(modules)
	.map(([path, mod]) => {
		const slug = path.replace(/^\/content\/blog\//, '').replace(/\.mdx$/, '')
		return {
			slug,
			frontmatter: mod.frontmatter,
		}
	})
	.sort(
		(a, b) =>
			new Date(b.frontmatter.date).getTime() -
			new Date(a.frontmatter.date).getTime(),
	)

export function getPost(
	slug: string,
): { post: Post; Component: MDXContentComponent } | null {
	const entry = Object.entries(modules).find(([path]) =>
		path.endsWith(`/${slug}.mdx`),
	)
	if (!entry) return null
	const [, mod] = entry
	return {
		post: {
			slug,
			frontmatter: mod.frontmatter,
		},
		Component: mod.default,
	}
}
