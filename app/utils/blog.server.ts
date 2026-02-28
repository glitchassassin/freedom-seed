import type { Post, PostFrontmatter } from '~/types/blog'

const modules = import.meta.glob<PostFrontmatter>('/content/blog/*.mdx', {
	eager: true,
	import: 'frontmatter',
})

export const allPosts: Post[] = Object.entries(modules)
	.map(([path, frontmatter]) => {
		const slug = path.replace(/^\/content\/blog\//, '').replace(/\.mdx$/, '')
		return { slug, frontmatter }
	})
	.sort(
		(a, b) =>
			new Date(b.frontmatter.date).getTime() -
			new Date(a.frontmatter.date).getTime(),
	)

export function getPost(slug: string): { post: Post } | null {
	const entry = Object.entries(modules).find(([path]) =>
		path.endsWith(`/${slug}.mdx`),
	)
	if (!entry) return null
	const [, frontmatter] = entry
	return { post: { slug, frontmatter } }
}
