export type PostFrontmatter = {
	title: string
	date: string
	author: string
	excerpt: string
}

export type Post = {
	slug: string
	frontmatter: PostFrontmatter
}
