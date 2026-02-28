# blog

## Description

MDX-based blog for marketing content and changelog posts. Posts live in
`content/blog/` as `.mdx` files with frontmatter (title, date, author, excerpt).
The blog index and post detail pages are server-rendered and cached by
Cloudflare's CDN. A RSS feed is generated at `/blog/rss.xml`.

## Related Files

### Content

- `content/blog/*.mdx` — Blog post MDX files with YAML frontmatter

### Types

- `app/types/blog.ts` — `PostFrontmatter` and `Post` types

### Utilities

- `app/utils/blog.server.ts` — `allPosts` (eagerly loaded, sorted by date) and
  `getPost(slug)` using `import.meta.glob`

### Components

- `app/components/blog-prose.tsx` — `BlogProse` wrapper and `blogComponents` MDX
  component map for prose styling

### Routes

- `app/routes/blog/index.tsx` — Blog listing at `/blog`
- `app/routes/blog/$slug/index.tsx` — Individual post at `/blog/:slug`
- `app/routes/blog/rss[.]xml.ts` — RSS feed at `/blog/rss.xml`

### Configuration

- `vite.config.ts` — MDX plugin uses `remark-frontmatter` and
  `remark-mdx-frontmatter` to expose frontmatter as named exports
- `app/types/mdx.d.ts` — TypeScript declarations for `*.md` and `*.mdx` modules

## Post Frontmatter Schema

```yaml
---
title: Post Title
date: YYYY-MM-DD
author: Author Name
excerpt: Short description shown in the blog listing.
---
```

## Adding a New Post

1. Create `content/blog/your-slug.mdx` with the required frontmatter fields.
2. The post is automatically discovered via `import.meta.glob` and will appear
   in the blog listing, sitemap, and RSS feed without any other changes.

## Removal

To remove the blog feature:

1. Delete `content/blog/`
2. Delete `app/types/blog.ts`
3. Delete `app/utils/blog.server.ts`
4. Delete `app/components/blog-prose.tsx`
5. Delete `app/routes/blog/`
6. Remove `import { allPosts } from '~/utils/blog.server'` and the blog entries
   from `app/routes/sitemap[.]xml.ts`
7. Remove the Blog link from `app/routes/_index/content.ts` footer links
8. Remove `remark-frontmatter` and `remark-mdx-frontmatter` from
   `vite.config.ts` and the `remarkPlugins` option from the MDX plugin (if no
   other MDX content needs frontmatter)
